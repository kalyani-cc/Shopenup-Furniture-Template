import { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

// Optimized image compression using Canvas with high quality preservation
// Preserves original image format (JPG stays JPG, PNG stays PNG) while compressing
export const compressImage = async (
  file: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: string;
  },
): Promise<File> => {
  // Higher quality (0.92) for better visual quality while still compressing file size
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.92 } = options || {};

  // If not an image, return as-is
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip compression for SVG (vector format, already small)
  if (file.type === 'image/svg+xml') {
    return file;
  }

  // Preserve original format - use original MIME type unless explicitly overridden
  let outputMimeType = options?.mimeType || file.type;
  
  // Normalize MIME types for better browser compatibility
  if (outputMimeType === 'image/jpg') {
    outputMimeType = 'image/jpeg';
  }

  // Get original file extension
  const originalExtension = file.name.match(/\.[^/.]+$/)?.[0] || '';
  
  // Map MIME types to file extensions
  const getExtensionForMimeType = (mime: string): string => {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
    };
    return mimeToExt[mime] || originalExtension || '.jpg';
  };

  const outputExtension = getExtensionForMimeType(outputMimeType);

  const imageBitmap = await createImageBitmap(file).catch(async () => {
    // Fallback via HTMLImageElement if createImageBitmap fails
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      image.src = url;
    });
    // Draw to canvas to get an ImageBitmap-like source
    const c = document.createElement('canvas');
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return img as unknown as ImageBitmap;
    ctx.drawImage(img, 0, 0);
    const blob: Blob | null = await new Promise((resolve) => c.toBlob(resolve));
    if (!blob) return img as unknown as ImageBitmap;
    return createImageBitmap(blob);
  });

  const srcWidth = (imageBitmap as any).width as number;
  const srcHeight = (imageBitmap as any).height as number;

  // Only resize if image is larger than max dimensions
  // This preserves quality for smaller images
  let targetWidth = srcWidth;
  let targetHeight = srcHeight;
  const widthRatio = maxWidth / srcWidth;
  const heightRatio = maxHeight / srcHeight;
  const ratio = Math.min(1, widthRatio, heightRatio);

  if (ratio < 1) {
    targetWidth = Math.floor(srcWidth * ratio);
    targetHeight = Math.floor(srcHeight * ratio);
  }

  // Create canvas with high-quality rendering settings
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', {
    alpha: true,
    desynchronized: false,
    willReadFrequently: false,
  });
  
  if (!ctx) return file;

  // Enable high-quality image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw scaled image with high quality
  ctx.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  // Convert to blob with optimized quality settings
  // Quality 0.92 provides excellent visual quality with good compression
  // Note: PNG doesn't support quality parameter, it will be ignored
  const blob = await new Promise<Blob | null>((resolve) => {
    if (outputMimeType === 'image/png') {
      // PNG doesn't support quality, use default
      canvas.toBlob(resolve, outputMimeType);
    } else {
      // JPEG and WebP support quality parameter
      canvas.toBlob(resolve, outputMimeType, quality);
    }
  });

  if (!blob) return file;

  // Only use compressed version if it's actually smaller
  // This ensures we don't increase file size
  if (blob.size >= file.size) {
    return file;
  }

  // Create new file with compressed data, preserving original format
  const newFileName = file.name.replace(/\.[^/.]+$/, '') + outputExtension;
  const compressedFile = new File([blob], newFileName, {
    type: outputMimeType,
    lastModified: Date.now(),
  });

  return compressedFile;
};

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = async (file: File): Promise<string> => {
    try {
      setIsUploading(true);
      setError(null);

      // Compress the image
      const compressedFile = await compressImage(file);

      // Create FormData
      const formData = new FormData();
      formData.append('files', compressedFile);

      // Upload to backend
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
      
      // If the URL doesn't include /static/, add it
      if (imageUrl && !imageUrl.includes('/static/')) {
        const filename = imageUrl.split('/').pop();
        if (filename) {
          imageUrl = `${window.location.origin}/static/${filename}`;
        }
      }

      return imageUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadImage,
    isUploading,
    error,
  };
};
