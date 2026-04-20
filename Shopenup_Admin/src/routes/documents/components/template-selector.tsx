import { useState, useEffect } from 'react';
import { Text, Button } from "@shopenup/ui";
import { DocumentText, SquaresPlusSolid } from "@shopenup/icons";
import { TemplateCard } from './template-card';
import { INVOICE_TEMPLATES, type TemplateId } from './template-types';
import { generateInvoicePDF } from '../../../lib/generate-invoice-pdf';

export const TemplateSelector = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('without-logo');

  // Load saved template on mount
  useEffect(() => {
    const savedTemplate = localStorage.getItem('selectedInvoiceTemplate') as TemplateId;
    if (savedTemplate && INVOICE_TEMPLATES.some(t => t.id === savedTemplate)) {
      setSelectedTemplate(savedTemplate);
    }
  }, []);
  
  
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId as TemplateId);
    // Auto-save when template is selected
    localStorage.setItem('selectedInvoiceTemplate', templateId);
  };

  const handlePreviewTemplate = async (templateId: string) => {
    // Generate a sample invoice with mock data
    const mockInvoiceData = {
      invoiceNumber: 'INV-2024-001',
      invoiceDate: new Date().toLocaleDateString('en-GB'),
      isDomestic: true,
      from: {
        name: 'Akshar Ayurved',
        address: [
          'Shop No. 5, Ground Floor',
          'Medical Complex, Station Road',
          'Ahmedabad, Gujarat, India',
          '380001'
        ]
      },
      billTo: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+91 98765 43210',
        address: '123 Sample Street, Ahmedabad, Gujarat 380015'
      },
      shipTo: {
        address: '123 Sample Street, Ahmedabad, Gujarat 380015'
      },
      items: [
        {
          id: '1',
          title: 'Ayurvedic Medicine Pack',
          subtitle: '250ml Bottle',
          hsn_code: '3003',
          unit_price: 500,
          discount_total: 50,
          quantity: 2,
          subtotal: 950,
          tax_lines: [],
          tax_rate: 18,
          tax_type: 'CGST+SGST',
          tax_total: 171,
          total: 1121
        },
        {
          id: '2',
          title: 'Herbal Supplement',
          subtitle: '100g Package',
          hsn_code: '3004',
          unit_price: 300,
          discount_total: 0,
          quantity: 1,
          subtotal: 300,
          tax_lines: [],
          tax_rate: 18,
          tax_type: 'CGST+SGST',
          tax_total: 54,
          total: 354
        }
      ],
      shipping: {
        amount: 100,
        tax_rate: 18,
        tax_amount: 18,
        total: 118
      },
      totals: {
        netAmount: 1350,
        taxAmount: 243,
        totalAmount: 1593
      }
    };

    try {
      // Generate PDF with or without logo based on selected template
      const template = INVOICE_TEMPLATES.find(t => t.id === templateId);
      
      // Fetch logo URL if template has logo
      let logoUrl: string | undefined = undefined;
      if (template?.hasLogo) {
        // Try base64 from localStorage first (CORS workaround)
        const localLogoBase64 = localStorage.getItem('storeLogoBase64');
        if (localLogoBase64) {
          logoUrl = localLogoBase64;
        } else {
          // Fallback to URL
          const localLogo = localStorage.getItem('storeLogo');
          if (localLogo) {
            logoUrl = localLogo;
          }
        }
        
        if (!logoUrl) {
          // Fallback to API
          const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
          try {
            const logoResponse = await fetch(`${API_BASE_URL}/admin/documents/document-settings/logo`, {
              credentials: 'include',
            });
            
            if (logoResponse.ok) {
              const logoData = await logoResponse.json();
              logoUrl = logoData.settings?.storeLogoSource || logoData.storeLogoSource;
              
              // Save to localStorage
              if (logoUrl) {
                localStorage.setItem('storeLogo', logoUrl);
              }
            }
          } catch (err) {
            // Error fetching logo
          }
        }
      }
      
      // Fetch signature from localStorage
      const signatureUrl = localStorage.getItem('storeSignatureBase64') || localStorage.getItem('storeSignature') || undefined;
      
      const pdfBlob = await generateInvoicePDF(mockInvoiceData, template?.hasLogo ?? false, logoUrl, signatureUrl);
      
      // Open PDF in new tab
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      // Clean up the URL after some time
      setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 100);
    } catch (error) {
      // Error generating preview
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <DocumentText className="h-6 w-6 text-ui-fg-base" />
            <h2 className="text-xl font-semibold text-ui-fg-base">Active Invoice Template</h2>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            Choose whether to include a company logo in your invoices. Select an option and preview it with sample data.
          </Text>
        </div>
        {/* <Button
          variant="primary"
          size="base"
          onClick={handleSaveTemplate}
        >
          Save Selection
        </Button> */}
      </div>

      {/* Template Grid */}
      <div className="flex flex-col md:flex-row gap-4">
        {INVOICE_TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplate === template.id}
            onSelect={handleSelectTemplate}
            onPreview={handlePreviewTemplate}
          />
        ))}
      </div>

      {/* Selected Template Info */}
      <div className="bg-ui-bg-subtle border border-ui-border-base rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <SquaresPlusSolid className="h-5 w-5 text-ui-fg-interactive" />
              <Text className="font-semibold text-ui-fg-base">
                Active Template: {INVOICE_TEMPLATES.find(t => t.id === selectedTemplate)?.name}
              </Text>
            </div>
            <Text size="small" className="text-ui-fg-subtle mb-4">
              {INVOICE_TEMPLATES.find(t => t.id === selectedTemplate)?.description}
            </Text>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => handlePreviewTemplate(selectedTemplate)}
              >
                <SquaresPlusSolid className="h-4 w-4 mr-2" />
                Preview with Sample Data
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

