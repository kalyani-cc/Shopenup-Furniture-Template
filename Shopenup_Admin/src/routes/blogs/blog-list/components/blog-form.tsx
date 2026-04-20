import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Input, 
  Label, 
  Textarea,
  Switch,
  Badge
} from "@shopenup/ui";
import { X, ArrowDownTray } from "@shopenup/icons";
// import { FileUpload } from "../../../components/common/file-upload/file-upload";
// import { useImageUpload } from "../../../hooks/api/use-image-upload";
import { BlogArticleFormData } from '../types/blog';

interface BlogFormProps {
  onSubmit: (data: BlogArticleFormData) => void;
  isLoading?: boolean;
  submitLabel?: string;
  initialData?: Partial<BlogArticleFormData>;
}

export const BlogForm: React.FC<BlogFormProps> = ({ 
  onSubmit, 
  isLoading = false, 
  submitLabel = "Submit",
  initialData = {}
}) => {
  const [formData, setFormData] = useState<BlogArticleFormData>({
    title: '',
    subtitle: '',
    author: '',
    author_expert_title: 'Expert',
    seo_title: '',
    seo_description: '',
    thumbnail_image: '',
    tags: [],
    body: {
      type: 'doc',
      content: []
    },
    draft: true,
    ...initialData
  });

  const [newTag, setNewTag] = useState('');
  const [bodyContent, setBodyContent] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{ id: string; url: string; file: File } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData.body && typeof initialData.body === 'object' && initialData.body.content) {
      // Convert structured content to plain text for editing
      const textContent = initialData.body.content
        .map(item => {
          if (item.type === 'paragraph' && item.content) {
            return item.content.map(c => c.text).join('');
          }
          return '';
        })
        .join('\n\n');
      setBodyContent(textContent);
    }

    // Set initial image if provided
    if (initialData.thumbnail_image) {
      setUploadedImage({
        id: 'initial',
        url: initialData.thumbnail_image,
        file: new File([], 'initial-image.jpg', { type: 'image/jpeg' })
      });
    }
  }, [initialData]);

  const handleInputChange = (field: keyof BlogArticleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleImageUpload = async (files: { id: string; url: string; file: File }[]) => {
    if (files.length === 0) return;
    
    const file = files[0];
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Create FormData
      const formData = new FormData();
      formData.append('files', file.file);

      // Upload to backend
      const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
      const response = await fetch(`${API_BASE_URL}/admin/uploads`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.files || data.files.length === 0) {
        throw new Error('No files returned from upload');
      }

      // Fix the URL to include /static/ path
      let imageUrl = data.files[0].url;
      
      // If the URL doesn't include /static/, add it using the backend URL
      if (imageUrl && !imageUrl.includes('/static/')) {
        const filename = imageUrl.split('/').pop();
        if (filename) {
          imageUrl = `${API_BASE_URL}/static/${filename}`;
        }
      }

      setUploadedImage(file);
      handleInputChange('thumbnail_image', imageUrl);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      console.error('Image upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    handleInputChange('thumbnail_image', '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert plain text to structured content
    const structuredBody = {
      type: 'doc',
      content: bodyContent.split('\n\n').map(paragraph => ({
        type: 'paragraph',
        content: [{ type: 'text', text: paragraph }]
      }))
    };

    onSubmit({
      ...formData,
      body: structuredBody
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-ui-bg-component rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter article title"
              required
              className="w-full"
            />
          </div>

          <div>
            <Label htmlFor="author" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author *
            </Label>
            <Input
              id="author"
              value={formData.author}
              onChange={(e) => handleInputChange('author', e.target.value)}
              placeholder="Enter author name"
              required
              className="w-full"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="author_expert_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Author Expert Title
          </Label>
          <Input
            id="author_expert_title"
            value={formData.author_expert_title}
            onChange={(e) => handleInputChange('author_expert_title', e.target.value)}
            placeholder="e.g., E-commerce Expert, Marketing Specialist"
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Subtitle
          </Label>
          <Input
            id="subtitle"
            value={formData.subtitle}
            onChange={(e) => handleInputChange('subtitle', e.target.value)}
            placeholder="Enter article subtitle (optional)"
            className="w-full"
          />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-ui-bg-component rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content</h3>
        
        <div>
          <Label htmlFor="body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Article Content *
          </Label>
          <Textarea
            id="body"
            value={bodyContent}
            onChange={(e) => setBodyContent(e.target.value)}
            placeholder="Write your article content here..."
            rows={10}
            required
            className="w-full"
          />
        </div>

        <div>
          <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Thumbnail Image
          </Label>
          
          {/* Image Upload Section */}
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    const fileObj = {
                      id: Math.random().toString(36).substring(7),
                      url: URL.createObjectURL(file),
                      file: file
                    };
                    handleImageUpload([fileObj]);
                  }
                }}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center space-y-2"
              >
                <ArrowDownTray className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Upload Image
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Drag and drop an image or click to upload (JPG, PNG, WebP)
                </span>
              </label>
            </div>
            
            {/* Current Image Preview */}
            {uploadedImage && (
              <div className="relative inline-block">
                <img
                  src={uploadedImage.url}
                  alt="Thumbnail preview"
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Upload Status */}
            {isUploading && (
              <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                <ArrowDownTray className="w-4 h-4 animate-spin" />
                <span className="text-sm">Uploading image...</span>
              </div>
            )}
            
            {uploadError && (
              <div className="text-red-600 dark:text-red-400 text-sm">
                Upload failed: {uploadError}
              </div>
            )}
            
            {/* Manual URL Input */}
            <div>
              <Label htmlFor="thumbnail_image_url" className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Or enter image URL manually:
              </Label>
              <Input
                id="thumbnail_image_url"
                value={formData.thumbnail_image}
                onChange={(e) => handleInputChange('thumbnail_image', e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-ui-bg-component rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tags</h3>
        
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Type a tag and press Enter"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            className="flex-1"
          />
          <Button type="button" onClick={handleAddTag} variant="secondary">
            Add Tag
          </Button>
        </div>

        {formData.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag) => (
              <Badge key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* SEO */}
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-ui-bg-component rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">SEO</h3>
        
        <div>
          <Label htmlFor="seo_title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SEO Title
          </Label>
          <Input
            id="seo_title"
            value={formData.seo_title}
            onChange={(e) => handleInputChange('seo_title', e.target.value)}
            placeholder="SEO optimized title"
            className="w-full"
          />
        </div>

        <div>
          <Label htmlFor="seo_description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SEO Description
          </Label>
          <Textarea
            id="seo_description"
            value={formData.seo_description}
            onChange={(e) => handleInputChange('seo_description', e.target.value)}
            placeholder="SEO meta description"
            rows={3}
            className="w-full"
          />
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-6 p-6 bg-gray-50 dark:bg-ui-bg-component rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Settings</h3>
        
        <div className="flex items-center space-x-3">
          <Switch
            id="draft"
            checked={formData.draft}
            onCheckedChange={(checked) => handleInputChange('draft', checked)}
          />
          <Label htmlFor="draft" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Save as draft
          </Label>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button type="submit" disabled={isLoading} className="px-6 py-2">
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};
