import { 
  Heading,
  Button,
  Badge,
  Text,
  Skeleton
} from "@shopenup/ui";
import { Star, CheckCircle, XCircle, User, ShoppingCart, Calendar } from "@shopenup/icons";
import { Link } from "react-router-dom";
import { Review } from '../../../hooks/api/use-review';
import { Pagination } from '../../../components/common/pagination';

interface ReviewsTableProps {
  reviews: Review[];
  isLoading: boolean;
  onStatusChange: (reviewId: string, status: 'approved' | 'rejected') => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const ReviewsTable = ({ 
  reviews, 
  isLoading, 
  onStatusChange,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}: ReviewsTableProps) => {

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-800 px-2.5 py-1 rounded-full text-xs font-medium">
            Unknown
          </Badge>
        );
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300 dark:text-gray-600'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-ui-bg-base border border-ui-border-base rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Skeleton className="h-5 w-1/3 mb-3" />
                <Skeleton className="h-4 w-1/4 mb-2" />
              </div>
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-ui-bg-base border border-ui-border-base rounded-xl p-12 text-center shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-ui-bg-subtle rounded-full">
            <Star className="h-10 w-10 text-ui-fg-muted" />
          </div>
          <div>
            <Heading level="h3" className="mb-2 text-ui-fg-base">No Reviews Found</Heading>
            <Text className="text-ui-fg-muted text-sm">
              There are no reviews to display at the moment.
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div 
          key={review.id} 
          className="bg-ui-bg-base border border-ui-border-base rounded-xl p-6"
        >
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Main Content */}
            <div className="flex-1 space-y-4">
              {/* Header Section */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Text className="font-semibold text-lg text-ui-fg-base">
                      {review.title || 'No Title'}
                    </Text>
                    {getStatusBadge(review.status)}
                  </div>
                  
                  {/* Rating Display */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {renderStars(review.rating)}
                    </div>
                    <Text className="text-sm font-medium text-ui-fg-base">
                      {review.rating}/5
                    </Text>
                    {review.is_verified_purchase && (
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded text-xs">
                        Verified Purchase
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {review.status === 'approved' && (
                    <Button 
                      variant="secondary"
                      size="small"
                      onClick={() => onStatusChange(review.id, 'rejected')}
                      className="bg-red-50 hover:bg-red-100 active:bg-red-200 text-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/30 dark:active:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                  )}
                  {review.status === 'rejected' && (
                    <Button 
                      variant="secondary"
                      size="small"
                      onClick={() => onStatusChange(review.id, 'approved')}
                      className="bg-green-50 hover:bg-green-100 active:bg-green-200 text-green-700 dark:bg-green-900/20 dark:hover:bg-green-900/30 dark:active:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800 font-medium px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Approve
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Review Content */}
              <div className="space-y-3">
                <Text className="text-ui-fg-base leading-relaxed text-sm">
                  {review.content}
                </Text>
                
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t border-ui-border-base">
                  <div className="flex items-center gap-2 text-xs text-ui-fg-muted">
                    <User className="h-4.5 w-3.5" />
                    <Text className="font-medium text-ui-fg-subtle">
                      {review.customer 
                        ? `${review.customer.first_name} ${review.customer.last_name}` 
                        : `Customer ID: ${review.customer_id}`}
                    </Text>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ui-fg-muted">
                    <ShoppingCart className="h-4.5 w-3.5" />
                    {review.product?.id || review.product_id ? (
                      <Link 
                        to={`/products/${review.product?.id || review.product_id}`}
                        className="text-ui-fg-subtle hover:text-ui-fg-base hover:underline transition-colors font-medium"
                      >
                        {review.product?.title || 'N/A'}
                      </Link>
                    ) : (
                      <Text className="text-ui-fg-subtle">
                        N/A
                      </Text>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-ui-fg-muted">
                    <Calendar className="h-4.5 w-3.5" />
                    <Text className="text-ui-fg-subtle ml-0">
                      {new Date(review.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
      
      {!isLoading && reviews.length > 0 && (
        <div className="mt-6 pt-6 border-t border-ui-border-base">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};
