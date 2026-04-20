import { useState, useEffect } from 'react';
import { Container, Heading, Text, toast } from "@shopenup/ui";
import { ReviewsTable } from './components/reviews-table';
import { ReviewsFilters } from './components/reviews-filters';
import { useReviews, ReviewFilters } from '../../hooks/api/use-review';

export const Reviews = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Partial<ReviewFilters>>({
    search: undefined,
    status: 'all',
    rating: 'all',
    dateRange: undefined
  });

  const {
    reviews,
    loading: isLoading,
    error,
    count,
    totalPages,
    setPage,
    updateStatus,
  } = useReviews({ 
    limit: 10, 
    page: currentPage,
    filters 
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setPage(1);
  }, [filters.search, filters.status, filters.rating, filters.dateRange, setPage]);

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    setFilters(prev => ({ ...prev, search }));
  };

  const handleFiltersChange = (newFilters: Partial<ReviewFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setPage(page);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({
      search: undefined,
      status: 'all',
      rating: 'all',
      dateRange: { from: undefined, to: undefined }
    });
  };


  const handleStatusChange = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      await updateStatus(reviewId, status);
      toast.success('Success', {
        description: `Review ${status} successfully`,
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to update review status',
      });
    }
  };

  return (
    <Container>
      <div className="flex flex-col gap-y-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-2">
            <Heading level="h1">Reviews</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Manage customer reviews and ratings
            </Text>
          </div>
         
        </div>

        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
          <ReviewsFilters
            filters={filters}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </div>

        <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <Text className="text-red-800 dark:text-red-400">
                Error loading reviews: {error}
              </Text>
            </div>
          )}
          {/* {!error && !isLoading && reviews.length === 0 && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Text className="text-blue-800 dark:text-blue-400">
                ℹ️ API returned successfully but found 0 reviews. Total count: {count}
              </Text>
            </div>
          )} */}
          <ReviewsTable
            reviews={reviews}
            isLoading={isLoading}
            onStatusChange={handleStatusChange}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={count}
            itemsPerPage={10}
            onPageChange={handlePageChange}
          />
        </div>
      </div>
    </Container>
  );
};
