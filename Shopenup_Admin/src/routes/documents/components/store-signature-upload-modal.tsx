import { useState, useRef, useEffect } from 'react';
import { Button, Text } from "@shopenup/ui";
import { XMarkMini, PencilSquare, ArrowUpTray } from "@shopenup/icons";

interface StoreSignatureUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (file: File) => void;
  isLoading?: boolean;
}

const MAX_FILE_SIZE_MB = 2; // 2MB limit
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export const StoreSignatureUploadModal = ({ isOpen, onClose, onSave, isLoading = false }: StoreSignatureUploadModalProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingSignatureUrl, setExistingSignatureUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchExistingSignature = async () => {
    try {
      setLoadingExisting(true);
      const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
      
      const response = await fetch(`${API_BASE_URL}/admin/documents/document-settings/signature`, {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check for signature URL in the response
        const signatureUrl = data.settings?.storeSignatureSource || data.storeSignatureSource;
        
        if (signatureUrl) {
          setExistingSignatureUrl(signatureUrl);
          setPreviewUrl(signatureUrl);
        } else {
          // Try localStorage fallback
          const localSignature = localStorage.getItem('storeSignature');
          const localSignatureBase64 = localStorage.getItem('storeSignatureBase64');
          if (localSignatureBase64) {
            setExistingSignatureUrl(localSignatureBase64);
            setPreviewUrl(localSignatureBase64);
          } else if (localSignature) {
            setExistingSignatureUrl(localSignature);
            setPreviewUrl(localSignature);
          }
        }
      } else {
        // Try localStorage fallback
        const localSignatureBase64 = localStorage.getItem('storeSignatureBase64');
        const localSignature = localStorage.getItem('storeSignature');
        if (localSignatureBase64) {
          setExistingSignatureUrl(localSignatureBase64);
          setPreviewUrl(localSignatureBase64);
        } else if (localSignature) {
          setExistingSignatureUrl(localSignature);
          setPreviewUrl(localSignature);
        }
      }
    } catch (err) {
      // Error fetching existing signature, try localStorage fallback
      const localSignatureBase64 = localStorage.getItem('storeSignatureBase64');
      const localSignature = localStorage.getItem('storeSignature');
      if (localSignatureBase64) {
        setExistingSignatureUrl(localSignatureBase64);
        setPreviewUrl(localSignatureBase64);
      } else if (localSignature) {
        setExistingSignatureUrl(localSignature);
        setPreviewUrl(localSignature);
      }
    } finally {
      setLoadingExisting(false);
    }
  };

  // Fetch existing signature when modal opens and reset state when closed
  useEffect(() => {
    if (isOpen) {
      fetchExistingSignature();
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
      
      // Save base64 directly (no processing needed for signature)
      localStorage.setItem('storeSignatureBase64', base64Data);
    };
    reader.readAsDataURL(file);
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
    // If there was an existing signature, restore it
    if (existingSignatureUrl) {
      setPreviewUrl(existingSignatureUrl);
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
            <h2 className="text-xl font-semibold text-ui-fg-base">Upload Signature</h2>
            <Text size="small" className="text-ui-fg-subtle">
              Upload signature image for invoices (Max {MAX_FILE_SIZE_MB}MB)
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
                    <PencilSquare className="h-8 w-8 text-ui-fg-muted animate-pulse" />
                  </div>
                  <Text className="text-ui-fg-muted">Loading existing signature...</Text>
                </div>
              </div>
            ) : !previewUrl ? (
              <div
                onClick={handleBrowseClick}
                className="border-2 border-dashed border-ui-border-base rounded-lg p-8 text-center cursor-pointer hover:border-ui-border-strong transition-colors"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-ui-bg-subtle rounded-full">
                    <PencilSquare className="h-8 w-8 text-ui-fg-muted" />
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
                      alt="Signature preview"
                      className="w-48 h-24 object-contain rounded border border-ui-border-base bg-white"
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
                            Current Signature
                          </Text>
                          <Text size="small" className="text-ui-fg-subtle mb-2">
                            Existing signature
                          </Text>
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            onClick={handleBrowseClick}
                          >
                            <ArrowUpTray className="h-4 w-4 mr-2" />
                            Change Signature
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
              <PencilSquare className="h-5 w-5 text-ui-fg-muted flex-shrink-0" />
              <div>
                <Text size="small" className="text-ui-fg-subtle">
                  <strong>Recommended:</strong> Use a transparent background PNG. 
                  Keep signature simple and clear for best results.
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
              {isLoading ? 'Uploading...' : 'Upload Signature'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

