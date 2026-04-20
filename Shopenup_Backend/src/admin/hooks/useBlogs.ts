import { useState, useEffect, useCallback, useMemo } from 'react';
import { BlogArticle, BlogArticleFormData, BlogFilters } from '../types/blog';

interface UseBlogsOptions {
  limit?: number;
  offset?: number;
  page?: number;
  filters?: Partial<BlogFilters>;
}

interface UseBlogsReturn {
  articles: BlogArticle[];
  allArticles: BlogArticle[];
  loading: boolean;
  error: string | null;
  count: number;
  totalPages: number;
  currentPage: number;
  refetch: () => void;
  createArticle: (data: any) => Promise<BlogArticle>;
  updateArticle: (id: string, data: any) => Promise<BlogArticle>;
  deleteArticle: (id: string) => Promise<void>;
  toggleDraft: (id: string) => Promise<void>;
  setPage: (page: number) => void;
}

export const useBlogs = (options: UseBlogsOptions = {}): UseBlogsReturn => {
  const { limit = 10, page = 1, filters = {} } = options;
  
  const [allArticles, setAllArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/admin/blog/articles`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch articles: ${response.statusText}`);
      }

      const data: BlogArticle[] = await response.json();
      setAllArticles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch articles');
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createArticle = useCallback(async (data: BlogArticleFormData): Promise<BlogArticle> => {
    try {
      // Ensure author_expert_title is always present
      const requestData: BlogArticleFormData = {
        ...data,
        author_expert_title: data.author_expert_title || 'Expert'
      };
      
      const response = await fetch(`/admin/blog/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create article: ${response.statusText}`);
      }

      const newArticle = await response.json();
      setAllArticles(prev => [newArticle, ...prev]);
      return newArticle;
    } catch (err) {
      console.error('Error creating article:', err);
      throw err;
    }
  }, []);

  const updateArticle = useCallback(async (id: string, data: BlogArticleFormData): Promise<BlogArticle> => {
    try {
      const response = await fetch(`/admin/blog/articles`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ...data, id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to update article: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const updatedArticle = await response.json();
      
      setAllArticles(prev => prev.map(article => 
        article.id === id ? updatedArticle : article
      ));
      return updatedArticle;
    } catch (err) {
      console.error('Error updating article:', err);
      throw err;
    }
  }, []);

  const deleteArticle = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/admin/blog/articles`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(`Failed to delete article: ${response.status} ${response.statusText} - ${errorText}`);
      }

      setAllArticles(prev => prev.filter(article => article.id !== id));
    } catch (err) {
      console.error('Error deleting article:', err);
      throw err;
    }
  }, []);

  const toggleDraft = useCallback(async (id: string): Promise<void> => {
    try {
      const article = allArticles.find(a => a.id === id);
      if (!article) return;

      await updateArticle(id, {
        title: article.title,
        subtitle: article.subtitle || '',
        author: article.author,
        author_expert_title: article.author_expert_title || 'Expert',
        // url_slug: article.url_slug,
        seo_title: article.seo_title || '',
        seo_description: article.seo_description || '',
        thumbnail_image: article.thumbnail_image || '',
        tags: article.tags,
        body: article.body,
        draft: !article.draft,
      });
      // The updateArticle function already updates allArticles
    } catch (err) {
      console.error('Error toggling draft status:', err);
      throw err;
    }
  }, [allArticles, updateArticle]);

  // Client-side filtering and pagination
  const filteredArticles = useMemo(() => {
    let filtered = [...allArticles];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchTerm) ||
        article.subtitle?.toLowerCase().includes(searchTerm) ||
        article.author.toLowerCase().includes(searchTerm)
        // article.url_slug.toLowerCase().includes(searchTerm)
      );
    }

    // Author filter
    if (filters.author) {
      filtered = filtered.filter(article => article.author === filters.author);
    }

    // Draft filter
    if (filters.draft !== null && filters.draft !== undefined) {
      filtered = filtered.filter(article => article.draft === filters.draft);
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      filtered = filtered.filter(article => 
        article.tags && article.tags.some(tag => filters.tags!.includes(tag))
      );
    }

    // Date range filter
    if (filters.dateRange?.from) {
      const fromDate = new Date(filters.dateRange.from);
      filtered = filtered.filter(article => 
        new Date(article.created_at) >= fromDate
      );
    }

    if (filters.dateRange?.to) {
      const toDate = new Date(filters.dateRange.to);
      filtered = filtered.filter(article => 
        new Date(article.created_at) <= toDate
      );
    }

    return filtered;
  }, [allArticles, filters]);

  // Pagination
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredArticles.slice(startIndex, endIndex);
  }, [filteredArticles, currentPage, limit]);

  const totalFilteredCount = filteredArticles.length;
  const totalFilteredPages = Math.ceil(totalFilteredCount / limit);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    articles: paginatedArticles,
    allArticles,
    loading,
    error,
    count: totalFilteredCount,
    totalPages: totalFilteredPages,
    currentPage,
    refetch: fetchArticles,
    createArticle,
    updateArticle,
    deleteArticle,
    toggleDraft,
    setPage,
  };
};
