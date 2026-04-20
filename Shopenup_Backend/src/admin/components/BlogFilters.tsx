import React from 'react';
import { Input, Button } from '@shopenup/ui';
import { MagnifyingGlass, Funnel, X } from '@shopenup/icons';
import { BlogFilters } from '../types/blog';

interface BlogFiltersProps {
  filters: BlogFilters;
  searchTerm: string;
  onSearchChange: (search: string) => void;
  onFiltersChange: (filters: Partial<BlogFilters>) => void;
  onClearFilters: () => void;
  authors: string[];
  tags: string[];
}

export const BlogFiltersComponent: React.FC<BlogFiltersProps> = ({
  filters,
  searchTerm,
  onSearchChange,
  onFiltersChange,
  onClearFilters,
  authors,
  tags,
}) => {
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleAuthorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFiltersChange({ author: e.target.value || '' });
  };

  const handleDraftChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFiltersChange({ 
      draft: value === '' ? null : value === 'true' 
    });
  };

  const handleDateRangeChange = (field: 'from' | 'to', value: string) => {
    onFiltersChange({
      dateRange: {
        ...filters.dateRange,
        [field]: value,
      },
    });
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    onFiltersChange({ tags: newTags });
  };

  const hasActiveFilters = 
    searchTerm ||
    filters.author ||
    filters.draft !== null ||
    filters.tags?.length ||
    filters.dateRange?.from ||
    filters.dateRange?.to;

  return (
    <div className="space-y-4 p-4 bg-gray-50 dark:bg-ui-bg-component rounded-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Filters</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="transparent"
            size="small"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Funnel className="w-4 h-4 mr-2" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </Button>
          {hasActiveFilters && (
            <Button
              variant="transparent"
              size="small"
              onClick={onClearFilters}
            >
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search articles..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        <select
          value={filters.author || ''}
          onChange={handleAuthorChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-ui-bg-component text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Authors</option>
          {authors.map(author => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>

        <select
          value={filters.draft === null ? '' : filters.draft.toString()}
          onChange={handleDraftChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-ui-bg-component text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Status</option>
          <option value="false">Published</option>
          <option value="true">Draft</option>
        </select>
      </div>

      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created From
              </label>
              <Input
                type="date"
                value={filters.dateRange?.from || ''}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Created To
              </label>
              <Input
                type="date"
                value={filters.dateRange?.to || ''}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
              />
            </div>
          </div>

          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filters.tags?.includes(tag)
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
