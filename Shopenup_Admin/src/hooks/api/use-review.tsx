import { useState, useEffect, useCallback, useMemo } from 'react';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  title: string | null;
  content: string;
  rating: number; 
  status: 'approved' | 'rejected';
  is_verified_purchase?: boolean;
  is_featured?: boolean;
  helpful_count?: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    handle: string;
    subtitle: string | null;
    description: string | null;
    is_giftcard: boolean;
    status: string;
    thumbnail: string | null;
    weight: number | null;
    length: number | null;
    height: number | null;
    width: number | null;
    origin_country: string | null;
    hs_code: string | null;
    mid_code: string | null;
    material: string | null;
    discountable: boolean;
    external_id: string | null;
    metadata: any;
    type_id: string | null;
    type: any;
    collection_id: string | null;
    collection: any;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  };
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface ReviewResponse {
  reviews: Review[];
  count: number;
  limit: number;
  offset: number;
  average_rating?: number;
}

export interface ReviewFilters {
  search?: string;
  status?: 'all' | 'approved' | 'rejected';
  rating?: 'all' | '1' | '2' | '3' | '4' | '5';
  product_id?: string;
  is_featured?: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface UseReviewsOptions {
  limit?: number;
  offset?: number;
  page?: number;
  filters?: Partial<ReviewFilters>;
}

interface UseReviewsReturn {
  reviews: Review[];
  allReviews: Review[];
  loading: boolean;
  error: string | null;
  count: number;
  averageRating: number;
  totalPages: number;
  currentPage: number;
  refetch: () => void;
  createReview: (data: Partial<Review>) => Promise<Review>;
  updateReview: (id: string, data: Partial<Review>) => Promise<Review>;
  deleteReview: (id: string) => Promise<void>;
  updateStatus: (id: string, status: Review['status']) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  setPage: (page: number) => void;
}

export const useReviews = (options: UseReviewsOptions = {}): UseReviewsReturn => {
  const { limit = 10, page = 1, filters = {} } = options;
  
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<Review[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if we have client-side filters that require fetching all data
      // Calculate this inside the callback to avoid unnecessary recreations
      const hasClientSideFilters = 
        (filters.status && filters.status !== 'all') ||
        (filters.rating && filters.rating !== 'all') ||
        (filters.dateRange?.from || filters.dateRange?.to) ||
        (filters.search && filters.search.trim());
      
      let allFetchedReviews: Review[] = [];
      let apiTotalCount = 0;

      if (hasClientSideFilters) {
        // When client-side filters are active, fetch all data (or a large batch) to properly filter and paginate
        // Fetch in batches to avoid overwhelming the API
        const batchSize = 10;
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const params = new URLSearchParams();
          params.append('limit', String(batchSize));
          params.append('offset', String(offset));
             
          if (filters.product_id) {
            params.append('product_id', filters.product_id);
          }
          
          if (filters.is_featured !== undefined) {
            params.append('is_featured', String(filters.is_featured));
          }

          const queryString = params.toString();
          const url = `${API_BASE_URL}/admin/reviews${queryString ? `?${queryString}` : ''}`;

          const response = await fetch(url, {
            credentials: 'include',
          });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Failed to fetch reviews: ${response.statusText}`;
            try {
              const errorData = JSON.parse(errorText);
              if (errorData.message) {
                errorMessage = errorData.message;
              }
            } catch {
              if (errorText) {
                errorMessage = errorText;
              }
            }
            throw new Error(errorMessage);
          }

          const data: ReviewResponse = await response.json();
          const batchReviews = data && Array.isArray(data.reviews) ? data.reviews : [];
          
          if (offset === 0) {
            apiTotalCount = data.count || 0;
          }
          
          allFetchedReviews = [...allFetchedReviews, ...batchReviews];
          
          // Stop if we got fewer items than requested (last page) or if we have enough data
          if (batchReviews.length < batchSize || allFetchedReviews.length >= apiTotalCount) {
            hasMore = false;
          } else {
            offset += batchSize;
            // Safety limit: don't fetch more than 1000 items
            if (allFetchedReviews.length >= 1000) {
              hasMore = false;
            }
          }
        }
      } else {
        // No client-side filters, use normal pagination
        const params = new URLSearchParams();
        params.append('limit', String(limit));
        params.append('offset', String((currentPage - 1) * limit));
        
        
        if (filters.product_id) {
          params.append('product_id', filters.product_id);
        }
        
        if (filters.is_featured !== undefined) {
          params.append('is_featured', String(filters.is_featured));
        }

        const queryString = params.toString();
        const url = `${API_BASE_URL}/admin/reviews${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
          credentials: 'include',
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Failed to fetch reviews: ${response.statusText}`;
          try {
            const errorData = JSON.parse(errorText);
            if (errorData.message) {
              errorMessage = errorData.message;
            }
          } catch {
            if (errorText) {
              errorMessage = errorText;
            }
          }
          throw new Error(errorMessage);
        }

        const data: ReviewResponse = await response.json();
        allFetchedReviews = data && Array.isArray(data.reviews) ? data.reviews : [];
        apiTotalCount = data.count || 0;
      }
      
      // Apply client-side filters
      let filtered = [...allFetchedReviews];
      
      // Apply client-side status filter if needed (API doesn't support status as query param)
      if (filters.status && filters.status !== 'all') {
        filtered = filtered.filter(review => review.status === filters.status);
      }
      
      // Apply client-side rating filter if needed (API doesn't support rating as query param)
      // Rating filter works as "X+ stars" (e.g., "4" means 4+ stars, so rating >= 4)
      if (filters.rating && filters.rating !== 'all') {
        const minRating = parseInt(filters.rating, 10);
        filtered = filtered.filter(review => review.rating >= minRating);
      }
      
      // Apply client-side date range filter if needed (fallback if API doesn't support it)
      if (filters.dateRange?.from || filters.dateRange?.to) {
        filtered = filtered.filter(review => {
          const reviewDate = new Date(review.created_at);
          if (filters.dateRange?.from) {
            const fromDate = new Date(filters.dateRange.from);
            if (reviewDate < fromDate) return false;
          }
          if (filters.dateRange?.to) {
            const toDate = new Date(filters.dateRange.to);
            // Set to end of day for "to" date
            toDate.setHours(23, 59, 59, 999);
            if (reviewDate > toDate) return false;
          }
          return true;
        });
      }
      
      if (filters.search && filters.search.trim()) {
        const searchLower = filters.search.trim().toLowerCase();
        filtered = filtered.filter(review => {
          const titleMatch = review.title?.toLowerCase().includes(searchLower) || false;
          const contentMatch = review.content?.toLowerCase().includes(searchLower) || false;
          const productMatch = review.product?.title?.toLowerCase().includes(searchLower) || false;
          return titleMatch || contentMatch || productMatch;
        });
      }
      
      // Store all reviews and filtered reviews
      setAllReviews(allFetchedReviews);
      setFilteredReviews(filtered);
      
      // Use filtered count for pagination when client-side filters are active
      // Otherwise use API count
      if (hasClientSideFilters) {
        setTotalCount(filtered.length);
      } else {
        setTotalCount(apiTotalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
      console.error('Error fetching reviews:', err);
      setAllReviews([]); // Set empty array on error
      setFilteredReviews([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, limit, currentPage]);

  const createReview = useCallback(async (data: Partial<Review>): Promise<Review> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create review: ${response.statusText}`);
      }

      const newReview = await response.json();
      setAllReviews(prev => [newReview, ...prev]);
      return newReview;
    } catch (err) {
      console.error('Error creating review:', err);
      throw err;
    }
  }, []);

  const updateReview = useCallback(async (id: string, data: Partial<Review>): Promise<Review> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to update review: ${response.status} ${response.statusText}`);
      }

      const updatedReview = await response.json();
      
      setAllReviews(prev => prev.map(review => 
        review.id === id ? updatedReview : review
      ));
      // Also update filtered reviews if they exist
      setFilteredReviews(prev => prev.map(review => 
        review.id === id ? updatedReview : review
      ));
      return updatedReview;
    } catch (err) {
      console.error('Error updating review:', err);
      throw err;
    }
  }, []);

  const deleteReview = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reviews/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(`Failed to delete review: ${response.status} ${response.statusText}`);
      }

      setAllReviews(prev => prev.filter(review => review.id !== id));
      // Also update filtered reviews if they exist
      setFilteredReviews(prev => prev.filter(review => review.id !== id));
    } catch (err) {
      console.error('Error deleting review:', err);
      throw err;
    }
  }, []);

  const updateStatus = useCallback(async (id: string, status: Review['status']): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/reviews/status`, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          ids: [id],
          status 
        }),
      });
  
      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.statusText}`);
      }
  
      // Consume the response to ensure it's valid JSON
      await response.json();
      
      // Update the local state with the new status
      setAllReviews(prev => prev.map(review => 
        review.id === id ? { ...review, status } : review
      ));
      // Also update filtered reviews if they exist
      setFilteredReviews(prev => prev.map(review => 
        review.id === id ? { ...review, status } : review
      ));
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  }, []);

  const toggleFeatured = useCallback(async (id: string): Promise<void> => {
    try {
      const review = allReviews.find(r => r.id === id);
      if (!review) return;

      await updateReview(id, {
        is_featured: !review.is_featured,
      });
    } catch (err) {
      console.error('Error toggling featured status:', err);
      throw err;
    }
  }, [allReviews, updateReview]);

  // Calculate total pages from filtered count
  const totalPages = Math.ceil(totalCount / limit);

  // Check if we have client-side filters (memoized for use in other hooks)
  const hasClientSideFilters = useMemo(() => 
    (filters.status && filters.status !== 'all') ||
    (filters.rating && filters.rating !== 'all') ||
    (filters.dateRange?.from || filters.dateRange?.to) ||
    (filters.search && filters.search.trim()),
    [filters.status, filters.rating, filters.dateRange, filters.search]
  );

  // Get paginated reviews - use filtered reviews with client-side pagination when filters are active
  const paginatedReviews = useMemo(() => {
    if (hasClientSideFilters) {
      // Client-side pagination on filtered results
      const startIndex = (currentPage - 1) * limit;
      const endIndex = startIndex + limit;
      return filteredReviews.slice(startIndex, endIndex);
    } else {
      // Server-side pagination - return allReviews as-is
      return allReviews;
    }
  }, [hasClientSideFilters, filteredReviews, allReviews, currentPage, limit]);

  const averageRating = useMemo(() => {
    const reviewsToUse = hasClientSideFilters ? filteredReviews : allReviews;
    if (reviewsToUse.length === 0) return 0;
    const totalRating = reviewsToUse.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviewsToUse.length;
  }, [allReviews, filteredReviews, hasClientSideFilters]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    reviews: paginatedReviews,
    allReviews: hasClientSideFilters ? filteredReviews : allReviews,
    loading,
    error,
    count: totalCount,
    averageRating,
    totalPages,
    currentPage,
    refetch: fetchReviews,
    createReview,
    updateReview,
    deleteReview,
    updateStatus,
    toggleFeatured,
    setPage,
  };
};

// Hook to get product-specific reviews
export const useProductReviews = (productId: string, limit: number = 10, page: number = 1) => {
  return useReviews({ 
    limit, 
    page,
    filters: { product_id: productId }
  });
};

// Hook to get featured testimonials
export const useFeaturedTestimonials = (limit: number = 3) => {
  return useReviews({ 
    limit, 
    page: 1,
    filters: { is_featured: true, status: 'approved' } 
  });
};

// Hook to get average rating for a product
export const useProductRating = (productId: string) => {
  const { allReviews, loading, error } = useReviews({ 
    filters: { product_id: productId }
  });
  
  // Calculate average rating for this product
  const productReviews = allReviews.filter(review => review.product_id === productId);
  const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = productReviews.length > 0 ? totalRating / productReviews.length : 0;
  
  return {
    averageRating,
    reviewCount: productReviews.length,
    loading,
    error,
  };
};