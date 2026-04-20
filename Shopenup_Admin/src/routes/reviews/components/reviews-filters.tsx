import { useState, useEffect } from 'react';
import { 
  Input, 
  Button,
  Badge,
  Label,
  Text,
  toast
} from "@shopenup/ui";
import { MagnifyingGlass, X, XMarkMini } from "@shopenup/icons";
import { ReviewFilters } from '../../../hooks/api/use-review';

interface ReviewsFiltersProps {
  filters: ReviewFilters;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onFiltersChange: (filters: Partial<ReviewFilters>) => void;
  onClearFilters: () => void;
}

export const ReviewsFilters = ({
  filters,
  searchTerm,
  onSearchChange,
  onFiltersChange,
  onClearFilters
}: ReviewsFiltersProps) => {
  const [dateRange, setDateRange] = useState({
    from: filters.dateRange?.from || '',
    to: filters.dateRange?.to || ''
  });
  const [dateError, setDateError] = useState<string>('');

  // Sync dateRange state when filters change (e.g., when clearing filters)
  useEffect(() => {
    if (!filters.dateRange?.from && !filters.dateRange?.to) {
      setDateRange({ from: '', to: '' });
      setDateError('');
    } else {
      setDateRange({
        from: filters.dateRange?.from || '',
        to: filters.dateRange?.to || ''
      });
    }
  }, [filters.dateRange]);

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    const newDateRange = { ...dateRange, [field]: value };
    
    // Validate date range
    if (newDateRange.from && newDateRange.to) {
      const fromDate = new Date(newDateRange.from);
      const toDate = new Date(newDateRange.to);
      
      if (fromDate > toDate) {
        setDateError('From date must be earlier than To date');
        toast.error('Invalid Date Range', {
          description: 'From date must be earlier than To date',
        });
        return;
      } else {
        setDateError('');
      }
    } else {
      setDateError('');
    }
    
    setDateRange(newDateRange);
    onFiltersChange({ dateRange: newDateRange });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.rating !== 'all' || filters.dateRange?.from || filters.dateRange?.to;

  return (
    <div className="space-y-4">
      

      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="relative w-full">
          <Label htmlFor="search" className="text-sm font-medium mb-1 block">Search</Label>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ui-fg-muted" />
            <Input
              id="search"
              placeholder="Search reviews..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-3 w-full h-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full">
          <Label htmlFor="status-filter" className="text-sm font-medium mb-1 block">Status</Label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => onFiltersChange({ status: e.target.value as any })}
            className="w-full h-10 px-3 border border-ui-border-base rounded-md bg-ui-bg-base text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Rating Filter */}
        <div className="w-full">
          <Label htmlFor="rating-filter" className="text-sm font-medium mb-1 block">Rating</Label>
          <select
            id="rating-filter"
            value={filters.rating}
            onChange={(e) => onFiltersChange({ rating: e.target.value as any })}
            className="w-full h-10 px-3 border border-ui-border-base rounded-md bg-ui-bg-base text-ui-fg-base focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
          >
            <option value="all">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4+ Stars</option>
            <option value="3">3+ Stars</option>
            <option value="2">2+ Stars</option>
            <option value="1">1+ Stars</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="w-full lg:col-span-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="date-from" className="text-sm font-medium mb-1 block">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateRange.from}
                max={dateRange.to || undefined}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                className={`w-full h-10 ${dateError ? 'border-red-500' : ''}`}
              />
            </div>
            <div>
              <Label htmlFor="date-to" className="text-sm font-medium mb-1 block">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateRange.to}
                min={dateRange.from || undefined}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                className={`w-full h-10 ${dateError ? 'border-red-500' : ''}`}
              />
            </div>
          </div>
          {dateError && (
            <Text size="small" className="text-red-500 mt-1">
              {dateError}
            </Text>
          )}
        </div>
      </div>

      {/* Active Filters Display & Clear Filters */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <Badge className="flex items-center gap-1 bg-ui-bg-subtle text-ui-fg-muted">
                Search: {filters.search}
                <button
                  onClick={() => onFiltersChange({ search: '' })}
                  className="ml-1 hover:bg-ui-bg-subtle-hover rounded-full p-0.5"
                >
                  <XMarkMini className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.status !== 'all' && (
              <Badge className="flex items-center gap-1 bg-ui-bg-subtle text-ui-fg-muted">
                Status: {filters.status}
                <button
                  onClick={() => onFiltersChange({ status: 'all' })}
                  className="ml-1 hover:bg-ui-bg-subtle-hover rounded-full p-0.5"
                >
                  <XMarkMini className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {filters.rating !== 'all' && (
              <Badge className="flex items-center gap-1 bg-ui-bg-subtle text-ui-fg-muted">
                Rating: {filters.rating}+ stars
                <button
                  onClick={() => onFiltersChange({ rating: 'all' })}
                  className="ml-1 hover:bg-ui-bg-subtle-hover rounded-full p-0.5"
                >
                  <XMarkMini className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {(dateRange.from || dateRange.to) && (
              <Badge className="flex items-center gap-1 bg-ui-bg-subtle text-ui-fg-muted">
                Date: {dateRange.from || 'Start'} - {dateRange.to || 'End'}
                <button
                  onClick={() => {
                    setDateRange({ from: '', to: '' });
                    onFiltersChange({ dateRange: { from: '', to: '' } });
                  }}
                  className="ml-1 hover:bg-ui-bg-subtle-hover rounded-full p-0.5"
                >
                  <XMarkMini className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
          <Button
            variant="transparent"
            onClick={onClearFilters}
            className="text-ui-fg-muted hover:text-ui-fg-base shrink-0"
          >
            <XMarkMini className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
};