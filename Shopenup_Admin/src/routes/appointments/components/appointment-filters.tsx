import { useState, useEffect } from 'react';
import { 
  Input, 
  Button,
  Badge,
  Label
} from "@shopenup/ui";
import { MagnifyingGlass, X, XMarkMini } from "@shopenup/icons";

interface AppointmentFiltersProps {
  filters: {
    dateRange?: { from?: string; to?: string };
    search?: string;
  };
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onFiltersChange: (filters: Partial<AppointmentFiltersProps['filters']>) => void;
  onClearFilters: () => void;
}

export const AppointmentFilters = ({
  filters,
  searchTerm,
  onSearchChange,
  onFiltersChange,
  onClearFilters
}: AppointmentFiltersProps) => {
  const [dateRange, setDateRange] = useState({
    from: filters.dateRange?.from || '',
    to: filters.dateRange?.to || ''
  });

  // Sync dateRange state when filters change from parent (e.g., on clear)
  useEffect(() => {
    if (!filters.dateRange) {
      setDateRange({ from: '', to: '' });
    } else {
      setDateRange({
        from: filters.dateRange.from || '',
        to: filters.dateRange.to || ''
      });
    }
  }, [filters.dateRange]);

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    const newDateRange = { ...dateRange, [field]: value };
    setDateRange(newDateRange);
    onFiltersChange({ dateRange: newDateRange });
  };

  const hasActiveFilters = filters.search || filters.dateRange?.from || filters.dateRange?.to;

  return (
    <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4 space-y-4">
      {/* Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Search */}
        <div className="relative w-full">
          <Label htmlFor="search" className="text-sm font-medium mb-1 block">
            Search (Patient Name or Mobile)
          </Label>
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ui-fg-muted" />
            <Input
              id="search"
              placeholder="Search by patient name or mobile number"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 w-full h-10"
            />
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="w-full lg:col-span-2">
          <style dangerouslySetInnerHTML={{__html: `
            input[type="date"]::-webkit-datetime-edit-text,
            input[type="date"]::-webkit-datetime-edit-month-field,
            input[type="date"]::-webkit-datetime-edit-day-field,
            input[type="date"]::-webkit-datetime-edit-year-field {
              opacity: 0 !important;
              color: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-text,
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-month-field,
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-day-field,
            input[type="date"][value]:not([value=""])::-webkit-datetime-edit-year-field {
              opacity: 1 !important;
              color: inherit !important;
            }
          `}} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="date-from" className="text-sm font-medium mb-1 block">From</Label>
              <div className="relative">
                <Input
                  id="date-from"
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => handleDateRangeChange('from', e.target.value)}
                  className={`w-full h-10 ${!dateRange.from ? 'text-transparent' : ''}`}
                />
                {!dateRange.from && (
                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none text-ui-fg-subtle text-sm">
                    Select start date
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="date-to" className="text-sm font-medium mb-1 block">To</Label>
              <div className="relative">
                <Input
                  id="date-to"
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => handleDateRangeChange('to', e.target.value)}
                  className={`w-full h-10 ${!dateRange.to ? 'text-transparent' : ''}`}
                />
                {!dateRange.to && (
                  <div className="absolute inset-0 flex items-center px-3 pointer-events-none text-ui-fg-subtle text-sm">
                    Select end date
                  </div>
                )}
              </div>
            </div>
          </div>
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
                  onClick={() => onFiltersChange({ search: undefined })}
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
                    onFiltersChange({ dateRange: undefined });
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

