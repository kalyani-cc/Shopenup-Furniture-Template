import { useState, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

export interface StoreAddressData {
  company_name: string;
  first_name: string;
  last_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  country_code: string;
  province?: string;
  postal_code: string;
}

export interface StoreSettings {
  address: StoreAddressData;
  logo_url?: string;
}

export const useStoreSettings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveStoreAddress = useCallback(async (addressData: StoreAddressData): Promise<StoreSettings> => {
    try {
      setLoading(true);
      setError(null);
        
      
      // Build address object with backend-expected field names
      // This will be sent as an object and stored as JSON in the database
      const addressObject = {
        city: addressData.city,
        company: addressData.company_name,
        address_1: addressData.address_1,
        last_name: addressData.last_name,
        first_name: addressData.first_name,
        postal_code: addressData.postal_code,
        // Include optional fields if they exist
        ...(addressData.address_2 && { address_2: addressData.address_2 }),
        ...(addressData.province && { province: addressData.province }),
        ...(addressData.country_code && { country_code: addressData.country_code.toUpperCase() }),
      };


      // Send address as an object directly (not stringified)
      // Backend should store this in the storeAddress column as JSON
      const payload = {
        address: addressObject  // Send as object, backend stores as JSON
      };


      const response = await fetch(`${API_BASE_URL}/admin/documents/document-settings/document-address`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Failed to save store address: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Verify what was actually stored
      if (data.settings?.storeAddress) {
        const storedAddress = data.settings.storeAddress;
        if (typeof storedAddress === 'string') {
          console.error('❌ Backend stored address as STRING instead of JSON object!');
          console.error('❌ Backend should store req.body.address (object) in storeAddress column');
        } else if (typeof storedAddress === 'object') {
        }
      }
      
      // Also save to localStorage as backup
      localStorage.setItem('storeAddress', JSON.stringify(addressData));
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save store address';
      setError(errorMessage);
      console.error('Error saving store address:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStoreSettings = useCallback(async (): Promise<StoreSettings | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/admin/documents/document-settings`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        // If API fails, try to get from localStorage
        const localData = localStorage.getItem('storeAddress');
        if (localData) {
          return { address: JSON.parse(localData) };
        }
        throw new Error(`Failed to fetch store settings: ${response.statusText}`);
      }

      const data = await response.json();
      
      
      // Parse storeAddress if it's a JSON string
      // Check both data.settings.storeAddress (nested) and data.storeAddress (flat) for compatibility
      const storeAddress = data.settings?.storeAddress || data.storeAddress;
      
      if (storeAddress) {
        let parsedAddress;
        if (typeof storeAddress === 'string') {
          try {
            parsedAddress = JSON.parse(storeAddress);
          } catch (parseErr) {
            console.error('Failed to parse storeAddress JSON:', parseErr);
            parsedAddress = null;
          }
        } else {
          parsedAddress = storeAddress;
        }
        
        // Convert backend format to frontend format if needed
        if (parsedAddress) {
          const addressData: StoreAddressData = {
            company_name: parsedAddress.company || parsedAddress.company_name || '',
            first_name: parsedAddress.first_name || '',
            last_name: parsedAddress.last_name || '',
            address_1: parsedAddress.address_1 || parsedAddress.address || '',
            address_2: parsedAddress.address_2 || '',
            city: parsedAddress.city || '',
            country_code: (parsedAddress.country_code || 'in').toLowerCase(),
            province: parsedAddress.province || '',
            postal_code: parsedAddress.postal_code || '',
          };
          return { address: addressData };
        }
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch store settings';
      setError(errorMessage);
      console.error('Error fetching store settings:', err);
      
      // Fallback to localStorage
      const localData = localStorage.getItem('storeAddress');
      if (localData) {
        return { address: JSON.parse(localData) };
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStoreLogo = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/documents/document-settings/logo`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const localLogo = localStorage.getItem('storeLogo');
        return localLogo;
      }

      const data = await response.json();
      const logoUrl = data.settings?.storeLogoSource || data.storeLogoSource;
      
      return logoUrl || localStorage.getItem('storeLogo');
    } catch (err) {
      console.error('Error fetching logo:', err);
      return localStorage.getItem('storeLogo');
    }
  }, []);

  const saveStoreSignature = useCallback(async (file: File): Promise<StoreSettings> => {
    try {
      setLoading(true);
      setError(null);

      
      // Note: API endpoint not available yet, signature is already saved to localStorage
      // in the modal component as base64, which will be used for PDF generation
      
      // Return success response
      const mockResponse: StoreSettings = {
        address: {} as any,
      };
      
      
      return mockResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save signature';
      setError(errorMessage);
      console.error('Error saving signature:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveStoreLogo = useCallback(async (file: File): Promise<StoreSettings> => {
    try {
      setLoading(true);
      setError(null);

      // Create FormData and append the file
      const formData = new FormData();
      formData.append('logo', file);


      const response = await fetch(`${API_BASE_URL}/admin/documents/document-settings/logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,  // Send FormData, not JSON
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Failed to save store logo: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      // Save the returned logo URL to localStorage as backup
      if (data.settings?.storeLogoSource) {
        localStorage.setItem('storeLogo', data.settings.storeLogoSource);
      }
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save store logo';
      setError(errorMessage);
      console.error('Error saving store logo:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveInvoiceSettings = useCallback(async (settingsData: any): Promise<any> => {
    try {
      setLoading(true);
      setError(null);


      const response = await fetch(`${API_BASE_URL}/admin/documents/document-invoice-settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(`Failed to save invoice settings: ${errorData.message || response.statusText}`);
      }

      const data = await response.json();
      
      // Also save to localStorage as backup
      localStorage.setItem('invoiceSettings', JSON.stringify(settingsData));
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save invoice settings';
      setError(errorMessage);
      console.error('Error saving invoice settings:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getInvoiceSettings = useCallback(async (): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/documents/document-invoice-settings`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const localData = localStorage.getItem('invoiceSettings');
        return localData ? JSON.parse(localData) : null;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching invoice settings:', err);
      const localData = localStorage.getItem('invoiceSettings');
      return localData ? JSON.parse(localData) : null;
    }
  }, []);

  return {
    saveStoreAddress,
    getStoreSettings,
    getStoreLogo,
    saveStoreLogo,
    saveStoreSignature,
    saveInvoiceSettings,
    getInvoiceSettings,
    loading,
    error,
  };
};

