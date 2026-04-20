import { useState, useEffect } from 'react';
import { Text, Button, toast } from "@shopenup/ui";
import { BuildingStorefront, DocumentText, PencilSquare, PhotoSolid } from "@shopenup/icons";
import { StoreAddressFormModal } from './store-address-form-modal';
import { StoreLogoUploadModal } from './store-logo-upload-modal';
import { StoreSignatureUploadModal } from './store-signature-upload-modal';
import { InvoiceSettingsFormModal } from './invoice-settings-form-modal';
import { useStoreSettings, type StoreAddressData } from '../../../hooks/api/use-store-settings';

export const DocumentSettings = () => {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isInvoiceSettingsModalOpen, setIsInvoiceSettingsModalOpen] = useState(false);
  const [existingAddressData, setExistingAddressData] = useState<StoreAddressData | null>(null);
  const { saveStoreAddress, saveStoreLogo, saveStoreSignature, saveInvoiceSettings, getStoreSettings, loading } = useStoreSettings();

  // Load existing address data on mount
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const settings = await getStoreSettings();
        if (settings?.address) {
          setExistingAddressData(settings.address);
        }
      } catch (err) {
        // Failed to load existing settings
      }
    };
    loadExistingData();
  }, [getStoreSettings]);

  // Helper function to fix data format in database
  const handleFixAddressFormat = async () => {
    if (!existingAddressData) {
      toast.error('Error', {
        description: 'No address data found to fix. Please configure your address first.',
      });
      return;
    }

    const loadingToast = toast.loading('Fixing Address Format', {
      description: 'Updating database with correct format...',
    });

    try {
      const result = await saveStoreAddress(existingAddressData);
      
      toast.dismiss(loadingToast);
      toast.success('Fixed!', {
        description: 'Address format has been updated. Try generating an invoice now.',
      });
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to fix address format.',
      });
    }
  };

  const handleChangeStoreAddress = () => {
    setIsAddressModalOpen(true);
  };

  const handleChangeStoreLogo = () => {
    setIsLogoModalOpen(true);
  };

  const handleChangeStoreSignature = () => {
    setIsSignatureModalOpen(true);
  };

  const handleChangeInvoiceSettings = () => {
    setIsInvoiceSettingsModalOpen(true);
  };

  const handleSaveStoreAddress = async (data: any) => {
    try {
      const result = await saveStoreAddress(data);
      setExistingAddressData(data); // Update local state
      setIsAddressModalOpen(false); // Close modal on success
      toast.success('Success', {
        description: 'Store address saved successfully. You can now generate invoices.',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to save store address. Please try again.',
      });
    }
  };

  const handleSaveStoreLogo = async (file: File) => {
    try {
      const result = await saveStoreLogo(file);
      
      toast.success('Success', {
        description: 'Store logo uploaded successfully',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to save store logo. Please try again.',
      });
    }
  };

  const handleSaveStoreSignature = async (file: File) => {
    try {
      const result = await saveStoreSignature(file);
      
      toast.success('Success', {
        description: 'Signature uploaded successfully',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to save signature. Please try again.',
      });
    }
  };

  const handleSaveInvoiceSettings = async (data: any) => {
    try {
      await saveInvoiceSettings(data);
      toast.success('Success', {
        description: 'Invoice settings saved successfully',
      });
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to save invoice settings. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-full">
      {/* Store Settings Section */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-ui-bg-subtle rounded-lg">
            <BuildingStorefront className="h-6 w-6 text-ui-fg-base" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ui-fg-base mb-1">Store Settings</h3>
            <Text size="small" className="text-ui-fg-subtle">
              Manage your store information, address, and branding for invoices
            </Text>
          </div>
        </div>

        <div className="space-y-4">
          {/* Fix Address Format - Show if data exists */}
          {existingAddressData && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center flex-col md:flex-row gap-2 justify-between gap-3">
                <div className="flex-1">
                  <Text className="font-medium text-yellow-900 dark:text-yellow-100">
                    🔧 Quick Fix Available
                  </Text>
                  <Text size="small" className="text-yellow-800 dark:text-yellow-200 mt-1">
                    Click below to update your address format for invoice generation
                  </Text>
                </div>
                <Button 
                  variant="primary" 
                  size="small"
                  onClick={handleFixAddressFormat}
                  disabled={loading}
                >
                  {loading ? 'Fixing...' : 'Fix Now'}
                </Button>
              </div>
            </div>
          )}

          {/* Change Store Address */}
          <div className="flex flex-col md:flex-row gap-2 items-center justify-between p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base hover:border-ui-border-strong transition-colors ">
            <div className="flex items-center gap-3">
              <PencilSquare className="h-5 w-5 text-ui-fg-muted" />
              <div>
                <Text className="font-medium text-ui-fg-base">Change Store Address</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Update your store name, address, and contact information
                </Text>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="small"
         
              onClick={handleChangeStoreAddress}
            >
              Configure
            </Button>
          </div>

          {/* Change Store Logo */}
          <div className="flex flex-col md:flex-row gap-2 items-center justify-between p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base hover:border-ui-border-strong transition-colors">
            <div className="flex items-center gap-3">
              <PhotoSolid className="h-5 w-5 text-ui-fg-muted" />
              <div>
                <Text className="font-medium text-ui-fg-base">Change Store Logo</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Upload or update your store logo for invoices
                </Text>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="small"
              onClick={handleChangeStoreLogo}
            >
              Upload
            </Button>
          </div>

          {/* Change Signature */}
          <div className="flex items-center flex-col gap-2 md:flex-row justify-between p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base hover:border-ui-border-strong transition-colors">
            <div className="flex items-center gap-3">
              <PencilSquare className="h-5 w-5 text-ui-fg-muted" />
              <div>
                <Text className="font-medium text-ui-fg-base">Upload Signature</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Upload signature image for invoices
                </Text>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="small"
              onClick={handleChangeStoreSignature}
            >
              Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Settings Section */}
      <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-ui-bg-subtle rounded-lg">
            <DocumentText className="h-6 w-6 text-ui-fg-base" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ui-fg-base mb-1">Invoice Settings</h3>
            <Text size="small" className="text-ui-fg-subtle">
              Configure invoice numbering, tax details, terms, and notes
            </Text>
          </div>
        </div>

        <div className="space-y-4">
          {/* Change Invoice Settings */}
          <div className="flex items-center flex-col gap-2 md:flex-row justify-between p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base hover:border-ui-border-strong transition-colors">
            <div className="flex items-center gap-3">
              <PencilSquare className="h-5 w-5 text-ui-fg-muted" />
              <div>
                <Text className="font-medium text-ui-fg-base">Change Invoice Settings</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Update invoice prefix, numbering, tax information, and default text
                </Text>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="small"
              onClick={handleChangeInvoiceSettings}
            >
              Configure
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StoreAddressFormModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveStoreAddress}
        isLoading={loading}
        initialData={existingAddressData}
      />
      <StoreLogoUploadModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        onSave={handleSaveStoreLogo}
        isLoading={loading}
      />
      <StoreSignatureUploadModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSaveStoreSignature}
        isLoading={loading}
      />
      <InvoiceSettingsFormModal
        isOpen={isInvoiceSettingsModalOpen}
        onClose={() => setIsInvoiceSettingsModalOpen(false)}
        onSave={handleSaveInvoiceSettings}
        isLoading={loading}
      />
    </div>
  );
};

