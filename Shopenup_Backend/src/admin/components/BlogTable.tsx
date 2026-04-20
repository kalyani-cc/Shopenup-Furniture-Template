import React from 'react';
import { Button, Text, Badge } from '@shopenup/ui';
import { 
  PencilSquare, 
  Trash, 
  Eye, 
  EyeSlash,
  Calendar,
  User,
  Tag
} from '@shopenup/icons';
import { BlogArticle } from '../types/blog';

interface BlogTableProps {
  articles: BlogArticle[];
  onEdit: (article: BlogArticle) => void;
  onDelete: (id: string) => void;
  onToggleDraft: (id: string) => void;
  onView: (article: BlogArticle) => void;
  loading?: boolean;
}

export const BlogTable: React.FC<BlogTableProps> = ({
  articles,
  onEdit,
  onDelete,
  onToggleDraft,
  onView,
  loading = false,
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-ui-bg-component rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="text-center py-12">
        <Text className="text-gray-500 dark:text-gray-400">
          No articles found. Create your first article to get started.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <div
          key={article.id}
          className="bg-white dark:bg-ui-bg-component rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {article.title}
                </h3>
                <Badge
                  className={article.draft ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}
                >
                  {article.draft ? 'Draft' : 'Published'}
                </Badge>
              </div>
              
              {article.subtitle && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  {truncateText(article.subtitle, 150)}
                </p>
              )}

              <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <div className="flex items-center space-x-1">
                  <User className="w-4 h-4" />
                  <span>{article.author}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(article.created_at)}</span>
                </div>
                {/* <div className="flex items-center space-x-1">
                  <span>Slug: {article.url_slug}</span>
                </div> */}
              </div>

              {article.tags && article.tags.length > 0 && (
                <div className="flex items-center space-x-2 mb-3">
                  <Tag className="w-4 h-4 text-gray-400" />
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{article.tags.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {article.thumbnail_image && (
                <div className="mt-3">
                  <img
                    src={article.thumbnail_image}
                    alt={article.title}
                    className="w-24 h-24 object-contain rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <Button
                variant="transparent"
                size="small"
                onClick={() => onView(article)}
                className="text-blue-600 hover:text-blue-700"
              >
                <Eye className="w-4 h-4" />
              </Button>
              <Button
                variant="transparent"
                size="small"
                onClick={() => onEdit(article)}
                className="text-gray-600 hover:text-gray-700"
              >
                <PencilSquare className="w-4 h-4" />
              </Button>
              <Button
                variant="transparent"
                size="small"
                onClick={() => onToggleDraft(article.id)}
                className={article.draft ? "text-green-600 hover:text-green-700" : "text-yellow-600 hover:text-yellow-700"}
              >
                {article.draft ? <Eye className="w-4 h-4" /> : <EyeSlash className="w-4 h-4" />}
              </Button>
              <Button
                variant="transparent"
                size="small"
                onClick={() => onDelete(article.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
