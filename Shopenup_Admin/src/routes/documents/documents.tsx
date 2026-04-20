import { useState } from 'react';
import { Container, Heading, Text, toast } from "@shopenup/ui";
import { DocumentsTable } from './components/documents-table';
import { TemplateSelector } from './components/template-selector';
import { DocumentSettings } from './components/document-settings';
import { Pagination } from '../../components/common/pagination';
import { generatePackingSlipPDF } from '../../lib/generate-packing-slip-pdf.ts';
// import { DocumentsFilters } from './components/documents-filters';
import { useDocuments, Document } from '../../hooks/api/use-document';
// import type { DocumentFilters } from '../../hooks/api/use-document';

type TabType = 'invoices' | 'templates' | 'settings';

export const Documents = () => {
  const [activeTab, setActiveTab] = useState<TabType>('invoices');
  const [currentPage, setCurrentPage] = useState(1);
  // const [searchTerm, setSearchTerm] = useState('');
  // const [filters, setFilters] = useState<Partial<DocumentFilters>>({
  //   search: undefined,
  //   category: 'all',
  //   file_type: 'all',
  //   is_public: undefined,
  //   dateRange: undefined
  // });

  const {
    documents,
    loading: isLoading,
    error,
    count,
    totalPages,
    refetch,
  } = useDocuments({ 
    limit: 15, 
    page: currentPage,
    // filters 
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to download invoice PDF (same as Storefront)
  const downloadInvoice = (pdfBlob: Blob, orderId: string) => {
    const url = URL.createObjectURL(pdfBlob);
    
    // Create a temporary anchor element to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${orderId}.pdf`; // Set filename
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleViewInvoice = async (document: Document) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
      const loadingToast = toast.loading('Loading Invoice', {
        description: 'Fetching stored invoice PDF...',
      });

      // Step 1: First, get the invoice ID by fetching invoice data for this order
      let invoiceId: string | null = null;
      try {
        const invoiceResponse = await fetch(`${API_BASE_URL}/admin/documents/invoice?orderId=${document.id}`, {
          credentials: 'include',
        });

        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          // Extract invoice ID from response
          invoiceId = invoiceData.invoice?.id || invoiceData.id || null;
        }
      } catch (error) {
        console.error('Error fetching invoice ID:', error);
      }

      if (!invoiceId) {
        toast.dismiss(loadingToast);
        toast.error('Error', {
          description: 'Invoice not found. Please generate the invoice first.',
        });
        return;
      }

      // Step 2: Call the new endpoint to get the stored invoice PDF
      const response = await fetch(`${API_BASE_URL}/admin/documents/invoice/${invoiceId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        toast.dismiss(loadingToast);
        if (response.status === 404) {
          toast.error('Error', {
            description: 'Invoice PDF not found. The invoice may not have been generated yet.',
          });
          return;
        }
        throw new Error('Failed to fetch invoice PDF');
      }

      // The endpoint returns the PDF directly as a buffer
      const pdfBlob = await response.blob();
      
      if (pdfBlob && pdfBlob.type === 'application/pdf') {
        downloadInvoice(pdfBlob, document.id || invoiceId || 'invoice');
        toast.dismiss(loadingToast);
      } else {
        toast.dismiss(loadingToast);
        toast.error('Error', {
          description: 'Invalid PDF format received from server',
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to load invoice',
      });
    }
  };

  const handleGenerateInvoice = async (document: Document) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
      const loadingToast = toast.loading('Generating Invoice', {
        description: 'Please wait...',
      });

      // First, ensure invoice is created/saved in backend
      try {
        const saveResponse = await fetch(`${API_BASE_URL}/admin/documents/invoice`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: document.id
          }),
        });

        if (!saveResponse.ok) {
          const errorData = await saveResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to create invoice');
        }
      } catch (saveError) {
        toast.dismiss(loadingToast);
        toast.error('Error', {
          description: 'Failed to create invoice: ' + (saveError instanceof Error ? saveError.message : 'Unknown error'),
        });
        return;
      }

      // Step 2: Get the invoice ID from the created invoice
      let invoiceId: string | null = null;
      let displayNumber: string | null = null;
      try {
        const invoiceResponse = await fetch(`${API_BASE_URL}/admin/documents/invoice?orderId=${document.id}`, {
          credentials: 'include',
        });

        if (invoiceResponse.ok) {
          const invoiceData = await invoiceResponse.json();
          // Extract invoice ID from response
          invoiceId = invoiceData.invoice?.id || invoiceData.id || null;
          displayNumber = invoiceData.invoice?.displayNumber || null;
        }
      } catch (error) {
        console.error('Error fetching invoice ID:', error);
      }

      if (!invoiceId) {
        toast.dismiss(loadingToast);
        toast.error('Error', {
          description: 'Invoice was created but ID not found. Please try viewing the invoice.',
        });
        refetch(); // Refresh to show the invoice link
        return;
      }

      // Step 3: Fetch the stored invoice PDF from backend using the new endpoint
      try {
        const response = await fetch(`${API_BASE_URL}/admin/documents/invoice/${invoiceId}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch generated invoice PDF');
        }
        // The endpoint returns the PDF directly as a buffer
        const pdfBlob = await response.blob();
        
        if (pdfBlob && pdfBlob.type === 'application/pdf') {
          downloadInvoice(pdfBlob, displayNumber || '');
          toast.dismiss(loadingToast);
          
          // Refresh the documents list to show the new invoice link
          refetch();
          
          toast.success('Invoice Generated', {
            description: 'Invoice has been generated and downloaded successfully',
          });
        } else {
          toast.dismiss(loadingToast);
          toast.error('Error', {
            description: 'Invoice generated but PDF format is invalid',
          });
        }
      } catch (fetchError) {
        toast.dismiss(loadingToast);
        toast.error('Error', {
          description: 'Failed to fetch generated invoice: ' + (fetchError instanceof Error ? fetchError.message : 'Unknown error'),
        });
      }
    } catch (error) {
      toast.error('Error', {
        description: 'Failed to generate invoice',
      });
    }
  };

  const handleGeneratePackagingSlip = async (document: Document) => {
    try {
      // Fetch full order details from API
      const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
      const response = await fetch(`${API_BASE_URL}/admin/orders/${document.id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const orderData = await response.json();
      const order = orderData.order;

      // Format order date
      const orderDate = new Date(order.created_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
      });

      // Get shipping method
      const shippingMethod = order.shipping_methods?.[0]?.shipping_option?.name || 'Standard Shipping';

      // Get stock location for "from" address
      let fromName = 'Akshar Ayurved';
      let fromAddress: string[] = [];

      // Try to get fulfillment location first
      const fulfillment = order.fulfillments?.[0];
      let locationId = fulfillment?.location_id;

      // If no fulfillment location, try to get from order's stock location
      if (!locationId && order.items?.[0]?.variant?.inventory_items?.[0]) {
        const inventoryItem = order.items[0].variant.inventory_items[0];
        if (inventoryItem.location_levels?.[0]) {
          locationId = inventoryItem.location_levels[0].location_id;
        }
      }

      // Fetch location details if we have a location ID
      if (locationId) {
        try {
          const locationResponse = await fetch(
            `${API_BASE_URL}/admin/stock-locations/${locationId}`,
            { credentials: 'include' }
          );
          
          if (locationResponse.ok) {
            const locationData = await locationResponse.json();
            const location = locationData.stock_location;
            
            if (location?.address) {
              const addr = location.address;
              // Add address lines
              if (addr.city && addr.postal_code) {
                fromAddress.push(`${addr.city} ${addr.postal_code}`);
              }
              if (addr.address_1) fromAddress.push(addr.address_1);
              if (addr.address_2) fromAddress.push(addr.address_2);
              if (addr.province && addr.country_code) {
                fromAddress.push(`${addr.province}, ${addr.country_code}`);
              }
            }
          }
        } catch (err) {
          // Error fetching location
        }
      }

      // Format billing address
      const billingAddress = order.billing_address;
      const billToName = billingAddress 
        ? `${billingAddress.first_name || ''} ${billingAddress.last_name || ''}`.trim()
        : order.customer 
          ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim()
          : order.email || 'N/A';

      const billToAddress = billingAddress
        ? [
            billingAddress.city && billingAddress.postal_code 
              ? `${billingAddress.city} ${billingAddress.postal_code}` 
              : billingAddress.city || '',
            billingAddress.address_1 || '',
            billingAddress.address_2 || '',
            billingAddress.province && billingAddress.country_code
              ? `${billingAddress.province}, ${billingAddress.country_code}`
              : billingAddress.province || billingAddress.country_code || ''
          ].filter(Boolean).join('\n')
        : 'N/A';

      // Format shipping address
      const shippingAddress = order.shipping_address;
      const shipToName = shippingAddress 
        ? `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim()
        : billToName;

      const shipToAddress = shippingAddress
        ? [
            shippingAddress.city && shippingAddress.postal_code 
              ? `${shippingAddress.city} ${shippingAddress.postal_code}` 
              : shippingAddress.city || '',
            shippingAddress.address_1 || '',
            shippingAddress.address_2 || '',
            shippingAddress.province && shippingAddress.country_code
              ? `${shippingAddress.province}, ${shippingAddress.country_code}`
              : shippingAddress.province || shippingAddress.country_code || ''
          ].filter(Boolean).join('\n')
        : billToAddress;

      // Map order items to packing slip format
      const packingSlipItems = order.items.map((item: any) => ({
        id: item.id,
        title: item.title,
        subtitle: item.variant?.title || '',
        quantity: item.quantity,
      }));

      // Prepare packing slip data
      const packingSlipData = {
        orderNumber: order.display_id,
        orderDate: orderDate,
        shippingMethod: shippingMethod,
        from: {
          name: fromName,
          address: fromAddress,
        },
        billTo: {
          name: billToName,
          address: billToAddress,
        },
        shipTo: {
          name: shipToName,
          address: shipToAddress,
        },
        items: packingSlipItems,
      };

      // Generate the PDF
      generatePackingSlipPDF(packingSlipData);

      toast.success('Packing Slip Generated', {
        description: `Packing slip for order #${order.display_id} has been generated.`,
      });
    } catch (error) {
      toast.error('Error Generating Packing Slip', {
        description: error instanceof Error ? error.message : 'Failed to generate packing slip',
      });
    }
  };

  const tabs: { id: TabType; label: string }[] = [
    { id: 'invoices', label: 'Invoices' },
    { id: 'templates', label: 'Templates' },
    { id: 'settings', label: 'Settings' },
  ];

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setCurrentPage(1); // Reset to first page when switching tabs
  };

  return (
    <Container>
      <div className="flex flex-col gap-y-6">
        <div className="flex flex-col gap-y-2">
          <Heading level="h1">Invoices</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Manage and organize your invoices and documents
          </Text>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  activeTab === tab.id
                    ? 'bg-ui-bg-subtle text-ui-fg-base shadow-sm'
                    : 'text-ui-fg-muted hover:text-ui-fg-subtle'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filter section commented out for now */}
        {/* <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
          <DocumentsFilters
            filters={filters}
            searchTerm={searchTerm}
            onSearchChange={handleSearchChange}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
        </div> */}

        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <Text className="text-red-800 dark:text-red-400">
              Error loading documents: {error}
            </Text>
          </div>
        )}
        {!error && !isLoading && documents.length === 0 && count === 0 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Text className="text-blue-800 dark:text-blue-400">
              ℹ️ No documents found. Upload your first document to get started.
            </Text>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'invoices' && (
          <>
            <div className="bg-ui-bg-base border border-ui-border-base rounded-lg overflow-hidden">
              <DocumentsTable
                documents={documents}
                isLoading={isLoading}
                onView={handleGenerateInvoice}
                onDownload={handleGeneratePackagingSlip}
                onViewInvoice={handleViewInvoice}
              />
            </div>
            
            {/* Pagination */}
            {!isLoading && documents.length > 0 && (
              <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  totalItems={count}
                  itemsPerPage={15}
                />
              </div>
            )}
          </>
        )}

        {activeTab === 'templates' && (
          <div className="bg-ui-bg-base border border-ui-border-base rounded-lg p-6">
            <TemplateSelector />
          </div>
        )}

        {activeTab === 'settings' && (
          <DocumentSettings />
        )}
      </div>
    </Container>
  );
};
