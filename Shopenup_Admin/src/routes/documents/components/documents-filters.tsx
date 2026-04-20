import { Input, Select, Button } from "@shopenup/ui";
import { MagnifyingGlass, XMarkMini } from "@shopenup/icons";
import { DocumentFilters } from '../../../hooks/api/use-document';

interface DocumentsFiltersProps {
  filters: Partial<DocumentFilters>;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onFiltersChange: (filters: Partial<DocumentFilters>) => void;
  onClearFilters: () => void;
}

export const DocumentsFilters = ({
  filters,
  searchTerm,
  onSearchChange,
  onFiltersChange,
  onClearFilters,
}: DocumentsFiltersProps) => {
  const hasActiveFilters = 
    searchTerm || 
    (filters.category && filters.category !== 'all') ||
    (filters.file_type && filters.file_type !== 'all') ||
    filters.is_public !== undefined ||
    filters.dateRange?.from || 
    filters.dateRange?.to;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1 relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ui-fg-muted" />
          <Input
            type="search"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2 items-center flex-wrap md:flex-nowrap">
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ category: value === 'all' ? undefined : value })
            }
          >
            <Select.Trigger className="w-[180px]">
              Category
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Categories</Select.Item>
              <Select.Item value="contracts">Contracts</Select.Item>
              <Select.Item value="invoices">Invoices</Select.Item>
              <Select.Item value="reports">Reports</Select.Item>
              <Select.Item value="policies">Policies</Select.Item>
              <Select.Item value="manuals">Manuals</Select.Item>
              <Select.Item value="other">Other</Select.Item>
            </Select.Content>
          </Select>

          <Select
            value={filters.file_type || 'all'}
            onValueChange={(value) => 
              onFiltersChange({ file_type: value === 'all' ? undefined : value })
            }
          >
            <Select.Trigger className="w-[180px]">
              File Type
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All Types</Select.Item>
              <Select.Item value="application/pdf">PDF</Select.Item>
              <Select.Item value="image">Images</Select.Item>
              <Select.Item value="application/msword">Word</Select.Item>
              <Select.Item value="application/vnd.ms-excel">Excel</Select.Item>
              <Select.Item value="text/plain">Text</Select.Item>
            </Select.Content>
          </Select>

          <Select
            value={filters.is_public === undefined ? 'all' : filters.is_public ? 'public' : 'private'}
            onValueChange={(value) => {
              if (value === 'all') {
                onFiltersChange({ is_public: undefined });
              } else {
                onFiltersChange({ is_public: value === 'public' });
              }
            }}
          >
            <Select.Trigger className="w-[150px]">
              Visibility
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All</Select.Item>
              <Select.Item value="public">Public</Select.Item>
              <Select.Item value="private">Private</Select.Item>
            </Select.Content>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="secondary"
              size="small"
              onClick={onClearFilters}
            >
              <XMarkMini className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm text-ui-fg-muted mb-1 block">From Date</label>
          <Input
            type="date"
            value={filters.dateRange?.from || ''}
            onChange={(e) => 
              onFiltersChange({ 
                dateRange: { 
                  ...filters.dateRange, 
                  from: e.target.value 
                } 
              })
            }
          />
        </div>
        <div className="flex-1">
          <label className="text-sm text-ui-fg-muted mb-1 block">To Date</label>
          <Input
            type="date"
            value={filters.dateRange?.to || ''}
            onChange={(e) => 
              onFiltersChange({ 
                dateRange: { 
                  ...filters.dateRange, 
                  to: e.target.value 
                } 
              })
            }
          />
        </div>
      </div>
    </div>
  );
};

