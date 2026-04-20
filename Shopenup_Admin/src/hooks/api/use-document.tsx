import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';

export interface Document {
  id: string;
  invoice_number?: string;
  display_id?: number; // Order number (display_id from order)
  title: string;
  description: string | null;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  category?: string;
  tags?: string[];
  is_public?: boolean;
  uploaded_by?: string;
  customer_name?: string;
  customer_email?: string;
  fulfillment_status?: 'fulfilled' | 'pending' | 'cancelled' | 'n/a';
  payment_status?: 'paid' | 'pending' | 'failed' | 'n/a';
  total_amount?: number;
  currency?: string;
  tax_amount?: number;
  tax_status?: 'taxed' | 'exempt' | 'unknown';
  created_at: string;
  updated_at: string;
}

export interface DocumentResponse {
  documents?: Document[];
  orders?: any[];
  count: number;
  limit: number;
  offset: number;
}

export interface DocumentFilters {
  search?: string;
  category?: string;
  file_type?: string;
  is_public?: boolean;
  dateRange?: {
    from?: string;
    to?: string;
  };
}

interface UseDocumentsOptions {
  limit?: number;
  offset?: number;
  page?: number;
  filters?: Partial<DocumentFilters>;
}

interface UseDocumentsReturn {
  documents: Document[];
  allDocuments: Document[];
  loading: boolean;
  error: string | null;
  count: number;
  totalPages: number;
  currentPage: number;
  refetch: () => void;
  createDocument: (data: Partial<Document>) => Promise<Document>;
  updateDocument: (id: string, data: Partial<Document>) => Promise<Document>;
  deleteDocument: (id: string) => Promise<void>;
  setPage: (page: number) => void;
}

export const useDocuments = (options: UseDocumentsOptions = {}): UseDocumentsReturn => {
  const { limit = 15, page = 1, filters = {} } = options;
  
  const [allDocuments, setAllDocuments] = useState<Document[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(page);
  
  // Stringify filters to avoid object reference issues
  const filtersKey = JSON.stringify(filters);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      // Add ordering
      params.append('order', '-created_at');
      
      // Add required fields including tax information
      params.append('fields', 'id,status,display_id,created_at,email,fulfillment_status,payment_status,total,tax_total,currency_code,metadata,items,*customer');
      
      // Add pagination params
      params.append('limit', String(limit));
      params.append('offset', String((currentPage - 1) * limit));
      
      // Add search query
      if (filters.search && filters.search.trim()) {
        params.append('q', filters.search.trim());
      }
      
      // Add status filter
      if (filters.category && filters.category !== 'all') {
        params.append('status', filters.category);
      }
      
      // Add fulfillment status filter
      if (filters.file_type && filters.file_type !== 'all') {
        params.append('fulfillment_status', filters.file_type);
      }
      
      // Add payment status filter
      if (filters.is_public !== undefined) {
        params.append('payment_status', String(filters.is_public));
      }
      
      // Add date range filters
      if (filters.dateRange?.from && filters.dateRange.from.trim()) {
        params.append('created_at[gte]', filters.dateRange.from);
      }
      if (filters.dateRange?.to && filters.dateRange.to.trim()) {
        params.append('created_at[lte]', filters.dateRange.to);
      }

      const queryString = params.toString();
      const url = `${API_BASE_URL}/admin/orders${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform orders data to documents format
      if (data && Array.isArray(data.orders)) {
        // Only check invoices for fulfilled orders (invoices are only shown for fulfilled orders)
        const fulfilledOrders = data.orders.filter((order: any) => {
          const status = order.fulfillment_status?.toLowerCase();
          return ['fulfilled', 'shipped', 'delivered', 'returned'].includes(status);
        });
        
        // Fetch invoice data for fulfilled orders in parallel to check which ones have invoices
        const invoiceChecks = await Promise.allSettled(
          fulfilledOrders.map(async (order: any) => {
            try {
              const invoiceResponse = await fetch(
                `${API_BASE_URL}/admin/documents/invoice?orderId=${order.id}`,
                { credentials: 'include' }
              );
              
              if (invoiceResponse.ok) {
                const invoiceData = await invoiceResponse.json();
                // Extract invoice number from response
                return {
                  orderId: order.id,
                  invoice_number: invoiceData.invoice?.number || 
                                 invoiceData.invoice?.invoice_number || 
                                 invoiceData.number ||
                                 undefined
                };
              }
              return { orderId: order.id, invoice_number: undefined };
            } catch {
              return { orderId: order.id, invoice_number: undefined };
            }
          })
        );
        
        // Create a map of orderId -> invoice_number
        const invoiceMap = new Map<string, string | undefined>();
        invoiceChecks.forEach((result) => {
          if (result.status === 'fulfilled') {
            invoiceMap.set(result.value.orderId, result.value.invoice_number);
          }
        });
        
        const transformedDocuments = data.orders.map((order: any) => {
          // Calculate total tax from order
          const taxTotal = order.tax_total || 0;
          const taxStatus = taxTotal > 0 ? 'taxed' : (taxTotal === 0 ? 'exempt' : 'unknown');
          
          // Get invoice number from map or order object
          const invoiceNumber = invoiceMap.get(order.id) || order.invoice_number || undefined;
          
          return {
            id: order.id,
            invoice_number: invoiceNumber,
            display_id: order.display_id, // Order number
            title: `Order #${order.display_id}`,
            description: `Order from ${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
            file_url: '#', // You can add document URL if available
            file_name: `invoice_${order.display_id}.pdf`,
            file_size: 0,
            file_type: 'application/pdf',
            customer_name: order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : order.email,
            customer_email: order.email,
            fulfillment_status: order.fulfillment_status || 'n/a',
            payment_status: order.payment_status || 'n/a',
            total_amount: order.total || 0,
            currency: order.currency_code === 'inr' ? '₹' : order.currency_code?.toUpperCase() || '₹',
            tax_amount: taxTotal,
            tax_status: taxStatus,
            created_at: order.created_at,
            updated_at: order.updated_at || order.created_at,
          };
        });
        
        setAllDocuments(transformedDocuments);
        setTotalCount(data.count || 0);
      } else {
        console.error('API response format is incorrect:', data);
        setAllDocuments([]);
        setTotalCount(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
      console.error('Error fetching documents:', err);
      setAllDocuments([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [filtersKey, limit, currentPage]);

  const createDocument = useCallback(async (data: Partial<Document>): Promise<Document> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      const newDocument = await response.json();
      setAllDocuments(prev => [newDocument, ...prev]);
      return newDocument;
    } catch (err) {
      console.error('Error creating document:', err);
      throw err;
    }
  }, []);

  const updateDocument = useCallback(async (id: string, data: Partial<Document>): Promise<Document> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Failed to update document: ${response.status} ${response.statusText}`);
      }

      const updatedDocument = await response.json();
      
      setAllDocuments(prev => prev.map(doc => 
        doc.id === id ? updatedDocument : doc
      ));
      return updatedDocument;
    } catch (err) {
      console.error('Error updating document:', err);
      throw err;
    }
  }, []);

  const deleteDocument = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/documents/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete error response:', errorText);
        throw new Error(`Failed to delete document: ${response.status} ${response.statusText}`);
      }

      setAllDocuments(prev => prev.filter(doc => doc.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
      throw err;
    }
  }, []);

  // Calculate total pages from API count
  const totalPages = Math.ceil(totalCount / limit);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  return {
    documents: allDocuments,
    allDocuments,
    loading,
    error,
    count: totalCount,
    totalPages,
    currentPage,
    refetch: fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    setPage,
  };
};

