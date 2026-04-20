import { useState, useMemo, useEffect } from 'react';
import { Plus } from "@shopenup/icons";
import { Container, Heading, Button, Drawer, Text, Badge } from "@shopenup/ui";
import { useBlogs } from '../../hooks/useBlogs';
import { BlogTable } from '../../components/BlogTable';
import { BlogFiltersComponent } from '../../components/BlogFilters';
import { BlogForm } from '../../components/BlogForm';
import { Pagination } from '../../components/Pagination';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { BlogArticle, BlogFilters, BlogArticleFormData } from '../../types/blog';

const BlogsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<BlogFilters>({
    search: '',
    author: '',
    tags: [],
    draft: null,
    dateRange: { from: '', to: '' },
  });
  
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isViewDrawerOpen, setIsViewDrawerOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<BlogArticle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Confirmation dialog states
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    articleId: string | null;
    articleTitle: string;
  }>({
    isOpen: false,
    articleId: null,
    articleTitle: '',
  });
  const [errorDialog, setErrorDialog] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: '',
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm }));
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { 
    articles, 
    loading, 
    error, 
    count, 
    totalPages,
    currentPage,
    refetch, 
    createArticle, 
    updateArticle, 
    deleteArticle, 
    toggleDraft,
    setPage,
    allArticles
  } = useBlogs({ filters, limit: 10 });

  // Extract unique authors and tags for filters from ALL articles (not filtered)
  const authors = useMemo(() => {
    const uniqueAuthors = new Set(allArticles.map(article => article.author));
    return Array.from(uniqueAuthors).sort();
  }, [allArticles]);

  const allTags = useMemo(() => {
    const uniqueTags = new Set(allArticles.flatMap(article => article.tags || []));
    return Array.from(uniqueTags).sort();
  }, [allArticles]);

  const handleFiltersChange = (newFilters: Partial<BlogFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      search: '',
      author: '',
      tags: [],
      draft: null,
      dateRange: { from: '', to: '' },
    });
  };

  const handleCreateArticle = async (data: BlogArticleFormData) => {
    try {
      setIsSubmitting(true);
      const articleData = {
        title: data.title,
        subtitle: data.subtitle,
        author: data.author,
        author_expert_title: data.author_expert_title || 'Expert',
        // url_slug: data.url_slug,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        thumbnail_image: data.thumbnail_image,
        tags: data.tags,
        body: data.body,
        draft: data.draft,
      };
      await createArticle(articleData);
      setIsCreateDrawerOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating article:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditArticle = async (data: BlogArticleFormData) => {
    if (!selectedArticle) {
      console.error('No selected article for editing');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const articleData: BlogArticleFormData = {
        title: data.title,
        subtitle: data.subtitle,
        author: data.author,
        author_expert_title: data.author_expert_title,
        // url_slug: data.url_slug,
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        thumbnail_image: data.thumbnail_image,
        tags: data.tags,
        body: data.body,
        draft: data.draft,
      };
      
      await updateArticle(selectedArticle.id, articleData);
      
      setIsEditDrawerOpen(false);
      setSelectedArticle(null);
      refetch();
    } catch (error) {
      console.error('Error updating article:', error);
      setErrorDialog({
        isOpen: true,
        message: `Failed to update article: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteArticle = (id: string) => {
    const article = articles.find(a => a.id === id);
    setDeleteDialog({
      isOpen: true,
      articleId: id,
      articleTitle: article?.title || 'this article',
    });
  };

  const confirmDeleteArticle = async () => {
    if (!deleteDialog.articleId) return;
    
    try {
      await deleteArticle(deleteDialog.articleId);
      refetch();
      setDeleteDialog({ isOpen: false, articleId: null, articleTitle: '' });
    } catch (error) {
      console.error('Error deleting article:', error);
      setErrorDialog({
        isOpen: true,
        message: `Failed to delete article: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  };

  const handleToggleDraft = async (id: string) => {
    try {
      await toggleDraft(id);
      refetch();
    } catch (error) {
      console.error('Error toggling draft status:', error);
    }
  };

  const handleViewArticle = (article: BlogArticle) => {
    setSelectedArticle(article);
    setIsViewDrawerOpen(true);
  };

  const handleEditClick = (article: BlogArticle) => {
    setSelectedArticle(article);
    setIsEditDrawerOpen(true);
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Blog Articles</Heading>
          <Text className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your blog content and articles
          </Text>
        </div>
        <Button
          onClick={() => setIsCreateDrawerOpen(true)}
          className="flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Article</span>
        </Button>
      </div>

      <div className="px-6 py-4">
        <BlogFiltersComponent
          filters={filters}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onFiltersChange={handleFiltersChange}
          onClearFilters={handleClearFilters}
          authors={authors}
          tags={allTags}
        />
      </div>

      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <Text className="text-red-600 dark:text-red-400">
              Error: {error}
            </Text>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <Text className="text-gray-600 dark:text-gray-400">
            {loading ? 'Loading...' : `${count} article${count !== 1 ? 's' : ''} found`}
          </Text>
          {!loading && (
            <Button
              variant="transparent"
              size="small"
              onClick={refetch}
            >
              Refresh
            </Button>
          )}
        </div>

        <BlogTable
          articles={articles}
          onEdit={handleEditClick}
          onDelete={handleDeleteArticle}
          onToggleDraft={handleToggleDraft}
          onView={handleViewArticle}
          loading={loading}
        />

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={count}
            itemsPerPage={10}
          />
        )}
      </div>

      {/* Create Article Drawer */}
      <Drawer open={isCreateDrawerOpen} onOpenChange={setIsCreateDrawerOpen}>
        <Drawer.Content className="h-full flex flex-col">
          <Drawer.Header className="flex-shrink-0">
            <Drawer.Title>Create New Article</Drawer.Title>
            <Drawer.Description>
              Fill in the details to create a new blog article.
            </Drawer.Description>
          </Drawer.Header>
          <div className="flex-1 overflow-y-auto p-6">
            <BlogForm
              onSubmit={handleCreateArticle}
              isLoading={isSubmitting}
              submitLabel="Create Article"
            />
          </div>
        </Drawer.Content>
      </Drawer>

      {/* Edit Article Drawer */}
      <Drawer open={isEditDrawerOpen} onOpenChange={setIsEditDrawerOpen}>
        <Drawer.Content className="h-full flex flex-col">
          <Drawer.Header className="flex-shrink-0">
            <Drawer.Title>Edit Article</Drawer.Title>
            <Drawer.Description>
              Update the article details.
            </Drawer.Description>
          </Drawer.Header>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedArticle && (
              <BlogForm
                initialData={{
                  title: selectedArticle.title,
                  subtitle: selectedArticle.subtitle,
                  author: selectedArticle.author,
                  author_expert_title: selectedArticle.author_expert_title,
                  // url_slug: selectedArticle.url_slug,
                  seo_title: selectedArticle.seo_title,
                  seo_description: selectedArticle.seo_description,
                  thumbnail_image: selectedArticle.thumbnail_image,
                  tags: selectedArticle.tags,
                  body: selectedArticle.body,
                  draft: selectedArticle.draft,
                }}
                onSubmit={handleEditArticle}
                isLoading={isSubmitting}
                submitLabel="Update Article"
              />
            )}
          </div>
        </Drawer.Content>
      </Drawer>

      {/* View Article Drawer */}
      <Drawer open={isViewDrawerOpen} onOpenChange={setIsViewDrawerOpen}>
        <Drawer.Content className="h-full flex flex-col">
          <Drawer.Header className="flex-shrink-0">
            <Drawer.Title>{selectedArticle?.title}</Drawer.Title>
            <Drawer.Description>
              Article details and preview
            </Drawer.Description>
          </Drawer.Header>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {selectedArticle && (
              <>
                <div className="flex items-center space-x-4">
                  <Badge className={selectedArticle.draft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}>
                    {selectedArticle.draft ? 'Draft' : 'Published'}
                  </Badge>
                  <Text className="text-gray-600 dark:text-gray-400">
                    By {selectedArticle.author}
                    {selectedArticle.author_expert_title && ` • ${selectedArticle.author_expert_title}`}
                    {' • '}{new Date(selectedArticle.created_at).toLocaleDateString()}
                  </Text>
                </div>

                {selectedArticle.subtitle && (
                  <div>
                    <Text className="text-lg text-gray-700 dark:text-gray-300">
                      {selectedArticle.subtitle}
                    </Text>
                  </div>
                )}

                {selectedArticle.thumbnail_image && (
                  <div>
                    <img
                      src={selectedArticle.thumbnail_image}
                      alt={selectedArticle.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                  <div>
                    <Text className="font-medium mb-2">Tags:</Text>
                    <div className="flex flex-wrap gap-2">
                      {selectedArticle.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
      </div>
                )}

                <div>
                  <Text className="font-medium mb-2">Content:</Text>
                  <div className="prose dark:prose-invert max-w-none">
                    {typeof selectedArticle.body === 'string' ? (
                      <Text className="whitespace-pre-wrap">
                        {selectedArticle.body}
                      </Text>
                    ) : (
                      <div>
                        {selectedArticle.body?.content?.map((item, index) => {
                          if (item.type === 'paragraph') {
                            return (
                              <p key={index} className="mb-4">
                                {item.content?.[0]?.text || ''}
                              </p>
                            );
                          } else if (item.type === 'heading') {
                            const HeadingTag = `h${item.attrs?.level || 2}` as keyof JSX.IntrinsicElements;
                            return (
                              <HeadingTag key={index} className="font-bold text-lg mb-3 mt-6">
                                {item.content?.[0]?.text || ''}
                              </HeadingTag>
                            );
                          } else if (item.type === 'bullet_list') {
                            return (
                              <ul key={index} className="list-disc list-inside mb-4 space-y-1">
                                {(item.content as any)?.map((listItem: any, listIndex: number) => (
                                  <li key={listIndex}>
                                    {listItem.content?.[0]?.content?.[0]?.text || ''}
                                  </li>
                                ))}
                              </ul>
                            );
                          } else if (item.type === 'blockquote') {
                            return (
                              <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic my-4">
                                {(item.content?.[0] as any)?.content?.[0]?.text || ''}
                              </blockquote>
                            );
                          }
                          return null;
                        }) || 'No content available'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* <div>
                    <Text className="font-medium mb-1">URL Slug:</Text>
                    <Text className="text-gray-600 dark:text-gray-400">
                      {selectedArticle.url_slug}
                    </Text>
                  </div> */}
                  <div>
                    <Text className="font-medium mb-1">SEO Title:</Text>
                    <Text className="text-gray-600 dark:text-gray-400">
                      {selectedArticle.seo_title || 'Not set'}
                    </Text>
                  </div>
                </div>

                {selectedArticle.seo_description && (
                  <div>
                    <Text className="font-medium mb-1">SEO Description:</Text>
                    <Text className="text-gray-600 dark:text-gray-400">
                      {selectedArticle.seo_description}
                    </Text>
                  </div>
                )}
              </>
            )}
      </div>
        </Drawer.Content>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, articleId: null, articleTitle: '' })}
        onConfirm={confirmDeleteArticle}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleteDialog.articleTitle}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Error Dialog */}
      <ConfirmationDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ isOpen: false, message: '' })}
        onConfirm={() => setErrorDialog({ isOpen: false, message: '' })}
        title="Error"
        message={errorDialog.message}
        confirmText="OK"
        cancelText=""
        variant="danger"
      />
    </Container>
  );
};

export default BlogsPage;