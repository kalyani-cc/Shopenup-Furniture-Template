import { Label, Button, clx } from '@shopenup/ui';
import { DropzoneProps, useDropzone } from 'react-dropzone';
import { useController, useFormContext } from 'react-hook-form';
import { z } from 'zod';

import { useAdminUploadImage } from '../../hooks/images';

export interface ImageFieldProps {
  className?: string;
  name: string;
  label?: string;
  dropzoneProps?: Omit<DropzoneProps, 'maxFiles'>;
  dropzoneRootClassName?: string;
  sizeRecommendation?: React.ReactNode;
  isRequired?: boolean;
}

export interface ImageFieldValue {
  id: string;
  url: string;
}

export const imageFieldSchema = (params?: z.RawCreateParams) =>
  z.object(
    {
      id: z.string(),
      url: z.string().url(),
    },
    params,
  );

export const ImageField: React.FC<ImageFieldProps> = ({
  className,
  name,
  label,
  dropzoneProps,
  dropzoneRootClassName,
  sizeRecommendation = '1200 x 1600 (3:4) recommended, up to 10MB each',
  isRequired,
}) => {
  const form = useFormContext();
  const { field, fieldState } = useController<{
    __name__: {
      id: string;
      url: string;
    };
  }>({ name: name as '__name__' });
  const uploadFileMutation = useAdminUploadImage({
    onSuccess: (data) => {
      // Fix the URL to include /static/ path
      let imageUrl = data.files[0].url;
      
      // If the URL doesn't include /static/, add it
      if (imageUrl && !imageUrl.includes('/static/')) {
        // Extract the filename from the URL
        const filename = imageUrl.split('/').pop();
        if (filename) {
          imageUrl = `${window.location.origin}/static/${filename}`;
        }
      }
      
      
      field.onChange({
        id: data.files[0].id,
        url: imageUrl,
      });
    },
    onError(error) {
      console.error('Upload error:', error);
      form.setError(name, {
        message: error.message,
        type: 'upload_error',
      });
    },
  });

  const { getRootProps, getInputProps, open } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
    },
    ...dropzoneProps,
    maxFiles: 1,
    onDropAccepted(files) {
      uploadFileMutation.mutate({
        files,
      });
    },
  });

  return (
    <div className={className}>
      {typeof label !== 'undefined' && (
        <Label htmlFor={name} className="block mb-1">
          {label}
          {isRequired ? <span className="text-red-primary">*</span> : ''}
        </Label>
      )}
      <div
        {...getRootProps({
          className: clx(
            'inter-base-regular text-gray-500 dark:text-gray-400 rounded-lg border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:text-gray-700 dark:hover:text-gray-300 flex h-full w-full cursor-pointer select-none flex-col items-center justify-center border-2 border-dashed transition-colors bg-gray-50 dark:bg-gray-800',
            dropzoneRootClassName,
          ),
        })}
      >
        <input {...getInputProps()} id={name} />
        {field.value && typeof field.value === 'object' && field.value.url ? (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            <img
              src={field.value.url}
              className="max-w-full max-h-full object-contain rounded-lg"
              alt="Uploaded image"
              onLoad={() => console.log('Image loaded successfully:', typeof field.value === 'object' ? field.value.url : '')}
              onError={(e) => console.error('Image failed to load:', typeof field.value === 'object' ? field.value.url : '', e)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 h-full">
            <div className="mb-2">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1 text-center">
              Upload image
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Drag & drop or click to upload
            </p>
            {sizeRecommendation && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-center">
                {sizeRecommendation}
              </p>
            )}
          </div>
        )}
      </div>
      {field.value && typeof field.value === 'object' && field.value.url && (
        <div className="mt-3 flex flex-row items-center justify-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              field.onChange(null);
            }}
          >
            Remove
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              open();
            }}
          >
            Replace
          </Button>
        </div>
      )}
      {fieldState.error && (
        <div className="text-red-primary text-sm mt-1">
          {fieldState.error.message}
        </div>
      )}
    </div>
  );
};
