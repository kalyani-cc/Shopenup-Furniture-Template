import { HttpTypes } from '@shopenup/framework/types';
import { UseMutationOptions, useMutation } from '@tanstack/react-query';

// Basic, dependency-free client-side image compression using Canvas
// Converts images to WebP with max dimensions and quality settings
const compressImage = async (
  file: File,
  options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0..1
    mimeType?: string; // e.g. 'image/webp'
  },
): Promise<File> => {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.8, mimeType = 'image/webp' } = options || {};

  // If not an image, return as-is
  if (!file.type.startsWith('image/')) {
    return file;
  }

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

  // Compute scaled dimensions
  let targetWidth = srcWidth;
  let targetHeight = srcHeight;
  const widthRatio = maxWidth / srcWidth;
  const heightRatio = maxHeight / srcHeight;
  const ratio = Math.min(1, widthRatio, heightRatio);
  targetWidth = Math.round(srcWidth * ratio);
  targetHeight = Math.round(srcHeight * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file; // fail-safe
  }
  ctx.drawImage(imageBitmap as unknown as CanvasImageSource, 0, 0, targetWidth, targetHeight);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, mimeType, quality));
  if (!blob) {
    return file; // fallback if compression fails
  }

  const newName = file.name.replace(/\.(png|jpg|jpeg|webp|gif|tiff?)$/i, '') + '.webp';
  return new File([blob], newName, { type: mimeType, lastModified: Date.now() });
};

const getFileBase64EncodedContent = (file: File) => {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(
        (reader.result as string).replace('data:', '').replace(/^.+,/, ''),
      );
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const createPayload = async (payload: HttpTypes.AdminUploadFile) => {
  if (payload instanceof FileList) {
    const formData = new FormData();
    for (const file of payload) {
      const compressed = await compressImage(file);
      formData.append('files', compressed);
    }
    return formData;
  }

  if (payload.files.every((f) => f instanceof File)) {
    const formData = new FormData();
    for (const file of payload.files) {
      const compressed = await compressImage(file as File);
      formData.append('files', compressed);
    }
    return formData;
  }

  const obj: {
    files: {
      name: string;
      content: string;
    }[];
  } = {
    files: [],
  };

  for (const file of payload.files) {
    if (file instanceof File) {
      const compressed = await compressImage(file);
      obj.files.push({
        name: compressed.name,
        content: await getFileBase64EncodedContent(compressed),
      });
    } else {
      obj.files.push(file);
    }
  }

  return JSON.stringify(obj);
};

export const useAdminUploadImage = (
  options?: UseMutationOptions<
    HttpTypes.AdminFileListResponse,
    Error,
    HttpTypes.AdminUploadFile
  >,
) => {
  return useMutation<
    HttpTypes.AdminFileListResponse,
    Error,
    HttpTypes.AdminUploadFile
  >({
    mutationKey: ['admin-upload-image'],
    mutationFn: async (payload) => {
      const res = await fetch(`/admin/uploads`, {
        method: 'POST',
        body: await createPayload(payload),
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(res.statusText);
      }

      return res.json();
    },
    ...options,
  });
};
