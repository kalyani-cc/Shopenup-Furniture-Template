import React from 'react';
import { z } from 'zod';
import { Form } from './Form/Form';
import { InputField } from './Form/InputField';
import { TextareaField } from './Form/TextareaField';
import { ImageField, imageFieldSchema } from './Form/ImageField';
import { CheckboxField } from './Form/CheckboxField';
import { SubmitButton } from './Form/SubmitButton';
import { TagInput, tagInputSchema } from './Form/TagInput';
import { BlogArticleFormData } from '../types/blog';

// Helper function to extract text from any nested content structure
const extractTextFromContent = (content: any): string => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (content && content.text) {
    return content.text;
  }
  
  if (content && content.content && Array.isArray(content.content)) {
    return content.content.map(extractTextFromContent).join('');
  }
  
  if (Array.isArray(content)) {
    return content.map(extractTextFromContent).join('');
  }
  
  return '';
};

const blogFormSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
  author: z.string().min(1, 'Author is required'),
  author_expert_title: z.string().transform(val => val?.trim()).pipe(z.string().min(1, 'Author expert title is required')),
  // url_slug: z.string().min(1, 'URL slug is required').regex(/^[a-z0-9-]+$/, 'URL slug must contain only lowercase letters, numbers, and hyphens'),
  seo_title: z.string().optional(),
  seo_description: z.string().optional(),
  thumbnail_image: imageFieldSchema().optional().nullable(),
  tags: tagInputSchema,
  body: z.string().min(1, 'Content is required'),
  draft: z.boolean().default(false),
});

interface BlogFormProps {
  initialData?: Partial<BlogArticleFormData>;
  onSubmit: (data: BlogArticleFormData) => void | Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
}

export const BlogForm: React.FC<BlogFormProps> = ({
  initialData,
  onSubmit,
  isLoading = false,
  submitLabel = 'Save Article',
}) => {
  const handleSubmit = (data: z.infer<typeof blogFormSchema>) => {
    // Ensure author_expert_title is always present
    // if (!data.author_expert_title || data.author_expert_title.trim() === '') {
    //   data.author_expert_title = 'Expert';
    // }
    
    // Ensure the thumbnail image URL includes /static/ path
    let thumbnailUrl = data.thumbnail_image?.url || '';
    if (thumbnailUrl && !thumbnailUrl.includes('/static/')) {
      const filename = thumbnailUrl.split('/').pop();
      if (filename) {
        thumbnailUrl = `${window.location.origin}/static/${filename}`;
      }
    }
    
    // Convert plain text body to TipTap JSON format for storage
    const lines = data.body.split('\n');
    const bodyContent: any[] = [];
    let currentList: any[] = [];
    let currentListType: 'bullet' | 'ordered' | null = null;
    let currentParagraph = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('#')) {
        // Handle headings
        if (currentParagraph.trim()) {
          bodyContent.push({
            type: 'paragraph',
            content: [{ type: 'text', text: currentParagraph.trim() }]
          });
          currentParagraph = '';
        }
        
        // End current list if any
        if (currentList.length > 0) {
          bodyContent.push({
            type: currentListType === 'ordered' ? 'ordered_list' : 'bullet_list',
            content: currentList
          });
          currentList = [];
          currentListType = null;
        }
        
        const level = (trimmedLine.match(/^#+/) || [''])[0].length;
        const text = trimmedLine.replace(/^#+\s*/, '');
        bodyContent.push({
          type: 'heading',
          attrs: { level: Math.min(level, 6) },
          content: [{ type: 'text', text }]
        });
      } else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• ') || trimmedLine.startsWith('* ')) {
        // Handle bullet lists
        if (currentParagraph.trim()) {
          bodyContent.push({
            type: 'paragraph',
            content: [{ type: 'text', text: currentParagraph.trim() }]
          });
          currentParagraph = '';
        }
        
        // End current list if it's a different type
        if (currentList.length > 0 && currentListType !== 'bullet') {
          bodyContent.push({
            type: 'bullet_list',
            content: currentList
          });
          currentList = [];
        }
        
        currentListType = 'bullet';
        const bulletText = trimmedLine.replace(/^[-•*]\s*/, '');
        currentList.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: bulletText }]
          }]
        });
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        // Handle ordered lists
        if (currentParagraph.trim()) {
          bodyContent.push({
            type: 'paragraph',
            content: [{ type: 'text', text: currentParagraph.trim() }]
          });
          currentParagraph = '';
        }
        
        // End current list if it's a different type
        if (currentList.length > 0 && currentListType !== 'ordered') {
          bodyContent.push({
            type: 'bullet_list',
            content: currentList
          });
          currentList = [];
        }
        
        currentListType = 'ordered';
        currentList.push({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: trimmedLine.replace(/^\d+\.\s*/, '') }]
          }]
        });
      } else if (trimmedLine === '') {
        // Empty line - end current list or paragraph
        if (currentList.length > 0) {
          bodyContent.push({
            type: currentListType === 'ordered' ? 'ordered_list' : 'bullet_list',
            content: currentList
          });
          currentList = [];
          currentListType = null;
        } else if (currentParagraph.trim()) {
          bodyContent.push({
            type: 'paragraph',
            content: [{ type: 'text', text: currentParagraph.trim() }]
          });
          currentParagraph = '';
        }
      } else {
        // Regular text line
        if (currentList.length > 0) {
          // End current list
          bodyContent.push({
            type: currentListType === 'ordered' ? 'ordered_list' : 'bullet_list',
            content: currentList
          });
          currentList = [];
          currentListType = null;
        }
        currentParagraph += (currentParagraph ? '\n' : '') + line;
      }
    }
    
    // Handle remaining content
    if (currentList.length > 0) {
      bodyContent.push({
        type: currentListType === 'ordered' ? 'ordered_list' : 'bullet_list',
        content: currentList
      });
    } else if (currentParagraph.trim()) {
      bodyContent.push({
        type: 'paragraph',
        content: [{ type: 'text', text: currentParagraph.trim() }]
      });
    }

    const formData: BlogArticleFormData = {
      title: data.title,
      subtitle: data.subtitle || '',
      author: data.author,
      author_expert_title: data.author_expert_title?.trim() || '',
      // url_slug: data.url_slug,
      seo_title: data.seo_title || '',
      seo_description: data.seo_description || '',
      thumbnail_image: thumbnailUrl,
      tags: data.tags || [],
      body: {
        type: 'doc',
        content: bodyContent as any
      },
      draft: data.draft,
    };
    onSubmit(formData);
  };

  return (
    <Form
      schema={blogFormSchema}
      onSubmit={handleSubmit}
      defaultValues={{
        title: initialData?.title || '',
        subtitle: initialData?.subtitle || '',
        author: initialData?.author || '',
        author_expert_title: initialData?.author_expert_title || '',
        // url_slug: initialData?.url_slug || '',
        seo_title: initialData?.seo_title || '',
        seo_description: initialData?.seo_description || '',
        thumbnail_image: initialData?.thumbnail_image ? { 
          id: '', 
          url: initialData.thumbnail_image.includes('/static/') 
            ? initialData.thumbnail_image 
            : `${window.location.origin}/static/${initialData.thumbnail_image.split('/').pop()}`
        } : undefined,
        tags: initialData?.tags || [],
        body: typeof initialData?.body === 'string' 
          ? initialData.body 
          : initialData?.body?.content?.map(item => {
              if (item.type === 'paragraph') {
                return extractTextFromContent(item);
              } else if (item.type === 'heading') {
                const level = item.attrs?.level || 1;
                const text = extractTextFromContent(item);
                return text ? '#'.repeat(level) + ' ' + text : '';
              } else if (item.type === 'bulletList' || item.type === 'bullet_list') {
                return item.content?.map((listItem: any) => {
                  const text = extractTextFromContent(listItem);
                  return text ? '- ' + text : '- ';
                }).join('\n') || '';
              } else if (item.type === 'orderedList' || item.type === 'ordered_list') {
                return item.content?.map((listItem: any, index: number) => {
                  const text = extractTextFromContent(listItem);
                  return text ? `${index + 1}. ` + text : `${index + 1}. `;
                }).join('\n') || '';
              }
              return '';
            }).filter(text => text.trim() !== '').join('\n\n') || '',
        draft: initialData?.draft || false,
      }}
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            name="title"
            label="Title"
            isRequired
            inputProps={{
              placeholder: 'Enter article title',
            }}
          />
          <InputField
            name="author"
            label="Author"
            isRequired
            inputProps={{
              placeholder: 'Enter author name',
            }}
          />
        </div>

        <InputField
          name="author_expert_title"
          label="Author Expert Title"
          isRequired
          inputProps={{
            placeholder: 'e.g., E-commerce Expert, Marketing Specialist',
          }}
        />

        <InputField
          name="subtitle"
          label="Subtitle"
          inputProps={{
            placeholder: 'Enter article subtitle (optional)',
          }}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* <InputField
            name="url_slug"
            label="URL Slug"
            isRequired
            inputProps={{
              placeholder: 'article-url-slug',
            }}
          /> */}
          <ImageField
          // isRequired
            name="thumbnail_image"
            label="Thumbnail Image"
            dropzoneRootClassName="h-40"
            sizeRecommendation="1200 x 630 (16:9) recommended, up to 10MB"
          />
           <TagInput
            name="tags"
            label="Tags"
            placeholder="Type a tag and press Enter"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            name="seo_title"
            label="SEO Title"
            inputProps={{
              placeholder: 'SEO optimized title',
            }}
          />
         
        </div>

        <TextareaField
          name="seo_description"
          label="SEO Description"
          textareaProps={{
            placeholder: 'SEO meta description',
            rows: 3,
          }}
        />

        <TextareaField
          name="body"
          label="Content"
          isRequired
          textareaProps={{
            placeholder: 'Write your article content here...',
            rows: 10,
          }}
        />

        <CheckboxField
          name="draft"
          label="Save as draft"
        />

        <div className="flex justify-end space-x-3 pt-6 pb-4">
          <SubmitButton
            variant="primary"
            isLoading={isLoading}
          >
            {submitLabel}
          </SubmitButton>
        </div>
      </div>
    </Form>
  );
};
