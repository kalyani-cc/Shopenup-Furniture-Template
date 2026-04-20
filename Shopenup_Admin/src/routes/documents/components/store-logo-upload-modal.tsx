import { useState, useRef, useEffect } from 'react';
import { Button, Text } from "@shopenup/ui";
import { XMarkMini, PhotoSolid, ArrowUpTray } from "@shopenup/icons";

interface StoreLogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => void;
  isLoading?: boolean;
}

const MAX_FILE_SIZE_MB = 2; // 2MB limit
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const StoreLogoUploadModal = ({ isOpen, onClose, onSave, isLoading = false }: StoreLogoUploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchExistingLogo = async () => {
    try {
      setLoadingExisting(true);
      const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
      
      const response = await fetch(`${API_BASE_URL}/admin/documents/document-settings/logo`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check for logo URL in the response
        const logoUrl = data.settings?.storeLogoSource || data.storeLogoSource;
        
        if (logoUrl) {
          setExistingLogoUrl(logoUrl);
          setPreviewUrl(logoUrl);
        } else {
          // Try localStorage fallback
          const localLogo = localStorage.getItem('storeLogo');
          if (localLogo) {
            setExistingLogoUrl(localLogo);
            setPreviewUrl(localLogo);
          }
        }
      } else {
        // Try localStorage fallback
        const localLogo = localStorage.getItem('storeLogo');
        if (localLogo) {
          setExistingLogoUrl(localLogo);
          setPreviewUrl(localLogo);
        }
      }
    } catch (err) {
      // Error fetching existing logo, try localStorage fallback
      const localLogo = localStorage.getItem('storeLogo');
      if (localLogo) {
        setExistingLogoUrl(localLogo);
        setPreviewUrl(localLogo);
      }
    } finally {
      setLoadingExisting(false);
    }
  };

  // Fetch existing logo when modal opens and reset state when closed
  useEffect(() => {
    if (isOpen) {
      fetchExistingLogo();
      // Reset selected file when opening
      setSelectedFile(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setError(null);

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size must be less than ${MAX_FILE_SIZE_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setSelectedFile(file);

    // Create preview URL and save base64 to localStorage immediately
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      setPreviewUrl(base64Data);
      
      try {
        // Process image to ensure transparency (if PNG) or convert background to white
        const processedBase64 = await processLogoImage(base64Data);
        // Save processed base64 to localStorage for PDF generation
        localStorage.setItem('storeLogoBase64', processedBase64);
      } catch (err) {
        // If processing fails, save original
        localStorage.setItem('storeLogoBase64', base64Data);
      }
    };
    reader.readAsDataURL(file);
  };

  // Process logo image to remove solid background colors and make transparent
  const processLogoImage = (base64Data: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw image
        ctx.drawImage(img, 0, 0);

        // Get image data to process pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Get the background color from top-left corner pixel
        const bgR = data[0];
        const bgG = data[1];
        const bgB = data[2];

        // Remove background color (make it transparent)
        // Threshold for color similarity
        const threshold = 40;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Check if pixel color is close to background color
          if (Math.abs(r - bgR) < threshold && 
              Math.abs(g - bgG) < threshold && 
              Math.abs(b - bgB) < threshold) {
            // Make this pixel transparent
            data[i + 3] = 0;
          }
        }

        // Put the modified image data back
        ctx.putImageData(imageData, 0, 0);

        // Convert to PNG with transparency
        const processedBase64 = canvas.toDataURL('image/png');
        resolve(processedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.src = base64Data;
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      // Call onSave with the file directly
      // The parent component will handle the API upload
      await onSave(selectedFile);
      
      // Reset and close
      setSelectedFile(null);
      setPreviewUrl(null);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      setError(errorMessage);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    // If there was an existing logo, restore it
    if (existingLogoUrl) {
      setPreviewUrl(existingLogoUrl);
    } else {
      setPreviewUrl(null);
    }
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-ui-bg-base rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-ui-border-base">
          <div>
            <h2 className="text-xl font-semibold text-ui-fg-base">Upload Store Logo</h2>
            <Text size="small" className="text-ui-fg-subtle">
              Upload your company logo for invoices (Max {MAX_FILE_SIZE_MB}MB)
            </Text>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-ui-bg-subtle rounded transition-colors"
            disabled={isLoading}
          >
            <XMarkMini className="h-5 w-5 text-ui-fg-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* File Upload Area */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              onChange={handleFileSelect}
              className="hidden"
            />

            {loadingExisting ? (
              <div className="border-2 border-dashed border-ui-border-base rounded-lg p-8 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-ui-bg-subtle rounded-full">
                    <PhotoSolid className="h-8 w-8 text-ui-fg-muted animate-pulse" />
                  </div>
                  <Text className="text-ui-fg-muted">Loading existing logo...</Text>
                </div>
              </div>
            ) : !previewUrl ? (
              <div
                onClick={handleBrowseClick}
                className="border-2 border-dashed border-ui-border-base rounded-lg p-8 text-center cursor-pointer hover:border-ui-border-strong transition-colors"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-ui-bg-subtle rounded-full">
                    <PhotoSolid className="h-8 w-8 text-ui-fg-muted" />
                  </div>
                  <div>
                    <Text className="font-medium text-ui-fg-base mb-1">
                      Click to browse or drag and drop
                    </Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      JPEG, PNG, or WebP (max {MAX_FILE_SIZE_MB}MB)
                    </Text>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBrowseClick();
                    }}
                  >
                    <ArrowUpTray className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Preview */}
                <div className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-subtle">
                  <div className="flex items-start gap-4">
                    <img
                      src={previewUrl}
                      alt="Logo preview"
                      className="w-32 h-32 object-contain rounded border border-ui-border-base bg-white"
                    />
                    <div className="flex-1">
                      {selectedFile ? (
                        <>
                          <Text className="font-medium text-ui-fg-base mb-1">
                            {selectedFile.name}
                          </Text>
                          <Text size="small" className="text-ui-fg-subtle mb-2">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </Text>
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            onClick={handleRemoveFile}
                          >
                            Remove
                          </Button>
                        </>
                      ) : (
                        <>
                          <Text className="font-medium text-ui-fg-base mb-1">
                            Current Logo
                          </Text>
                          <Text size="small" className="text-ui-fg-subtle mb-2">
                            Existing store logo
                          </Text>
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            onClick={handleBrowseClick}
                          >
                            <ArrowUpTray className="h-4 w-4 mr-2" />
                            Change Logo
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text size="small" className="text-red-600">
                {error}
              </Text>
            </div>
          )}

          {/* Info */}
          <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-4">
            <div className="flex gap-2">
              <PhotoSolid className="h-5 w-5 text-ui-fg-muted flex-shrink-0" />
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  <strong>Recommended:</strong> Use a square logo (1:1 ratio) with transparent background.
                  Optimal size: 512x512 pixels or higher.
                </Text>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-ui-border-base">
          <Button 
            type="button" 
            variant="secondary" 
            onClick={onClose}
            disabled={isLoading}
          >
            {selectedFile ? 'Cancel' : 'Close'}
          </Button>
          {selectedFile && (
            <Button 
              type="button" 
              variant="primary"
              onClick={handleUpload}
              disabled={isLoading}
            >
              {isLoading ? 'Uploading...' : 'Upload Logo'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

