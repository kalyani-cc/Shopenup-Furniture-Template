export interface BlogArticle {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  author_expert_title: string;
  // url_slug: string;
  seo_title: string;
  seo_description: string;
  thumbnail_image: string;
  tags: string[];
  body: {
    type: string;
    content: Array<{
      type: string;
      attrs?: {
        level?: number;
      };
      content?: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
  draft: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BlogArticleFormData {
  title: string;
  subtitle: string;
  author: string;
  author_expert_title: string;
  // url_slug: string;
  seo_title: string;
  seo_description: string;
  thumbnail_image: string;
  tags: string[];
  body: {
    type: string;
    content: Array<{
      type: string;
      attrs?: {
        level?: number;
      };
      content?: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
  draft: boolean;
}

export interface BlogFilters {
  search: string;
  author: string;
  tags: string[];
  draft: boolean | null;
  dateRange: {
    from: string;
    to: string;
  };
}

export interface BlogListResponse {
  articles: BlogArticle[];
  count: number;
  offset: number;
  limit: number;
}
