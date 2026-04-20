// @ts-ignore - jsPDF types
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable types
import autoTable from 'jspdf-autotable';

interface OrderItem {
  id: string;
  title: string;
  subtitle?: string;
  hsn_code?: string;
  unit_price: number;
  discount_total?: number;
  quantity: number;
  subtotal: number;
  tax_lines?: any[];
  tax_rate?: number;
  tax_type?: string;
  tax_total: number;
  total: number;
}

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  isDomestic: boolean;
  from: {
    name: string;
    address: string[];
  };
  billTo: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  shipTo: {
    address: string;
  };
  items: OrderItem[];
  shipping: {
    amount: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
  };
  totals: {
    netAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
}

// Helper function to load image via proxy to avoid CORS issues
const loadImageViaProxy = async (originalUrl: string): Promise<string> => {
  
  // Extract filename from URL
  const filename = originalUrl.split('/').pop();
  if (!filename) {
    throw new Error('Invalid logo URL');
  }
  
  const API_BASE_URL = import.meta.env.VITE_SHOPENUP_BACKEND_URL || '';
  
  // Use admin API endpoint to fetch the logo (which has CORS enabled)
  const proxyUrl = `${API_BASE_URL}/admin/uploads/logo-proxy/${filename}`;
  
  try {
    const response = await fetch(proxyUrl, {
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Proxy failed with status: ${response.status}`);
    }

    const blob = await response.blob();

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = (e) => {
        console.error('FileReader failed:', e);
        reject(new Error('Failed to convert to base64'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Proxy approach failed, falling back to direct URL:', err);
    // Final fallback: try direct URL (might work in some browsers/configs)
    throw err;
  }
}

export const generateInvoicePDF = async (data: InvoiceData, hasLogo: boolean = false, logoUrl?: string, signatureUrl?: string) => {
  // @ts-ignore
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true
  });
  
  // Add custom font configuration for better Unicode support
  // Note: Since jsPDF's default fonts don't support ₹, we'll use a workaround
  // by rendering it as an image or using HTML entities
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Section
  let yPosition = 20;
  
  if (hasLogo) {
    // WITH LOGO TEMPLATE: Only show logo, no text
    if (logoUrl) {
      // Add actual logo image
      try {
        // Try direct URL approach first (jsPDF handles CORS differently in some browsers)
        
        // Determine image format from URL
        let imageFormat: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';
        if (logoUrl.includes('.jpg') || logoUrl.includes('.jpeg')) {
          imageFormat = 'JPEG';
        } else if (logoUrl.includes('.webp')) {
          imageFormat = 'WEBP';
        }
        
        
        // Add logo higher on page
        // Position moved up for better spacing
        doc.addImage(logoUrl, imageFormat, 15, yPosition - 5, 50, 50);
      } catch (err) {
        console.error('Direct URL approach failed, trying base64 conversion:', err);
        
        // If direct URL fails, try proxy approach
        try {
          const base64Image = await loadImageViaProxy(logoUrl);
          
          let imageFormat: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';
          if (logoUrl.includes('.jpg') || logoUrl.includes('.jpeg')) {
            imageFormat = 'JPEG';
          } else if (logoUrl.includes('.webp')) {
            imageFormat = 'WEBP';
          }
          
          // Increased size for better quality, positioned higher
          doc.addImage(base64Image, imageFormat, 15, yPosition - 5, 50, 50);
        } catch (base64Err) {
          console.error('Base64 approach also failed:', base64Err);
          // Fallback to placeholder if both approaches fail, positioned higher
          doc.setFillColor(205, 133, 115); // #CD8573
          doc.roundedRect(15, yPosition - 5, 50, 50, 3, 3, 'F');
        }
      }
    } else {
      // No logo URL provided, show placeholder positioned higher
      doc.setFillColor(205, 133, 115); // #CD8573
      doc.roundedRect(15, yPosition - 5, 50, 50, 3, 3, 'F');
    }
    
    // DO NOT show company name/tagline when logo is present
    
  } else {
    // WITHOUT LOGO TEMPLATE: Only show text, no logo
    // Company Name (left side - no logo)
    doc.setFontSize(20);
    doc.setTextColor('#333333'); // Dark grey
    doc.setFont('helvetica', 'bold');
    doc.text('Akshar Ayurved', 15, yPosition);
    
    // Tagline
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666'); // Medium grey
    doc.text('Traditional Medicine & Healthcare', 15, yPosition + 7);
  }
  
  // Invoice Title (top right)
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#333333');
  doc.text('Invoice', pageWidth - 15, yPosition + 2, { align: 'right' });
  
  // Invoice Details - Fixed alignment to prevent overlap
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#666666');
  doc.text('Invoice no.:', pageWidth - 55, yPosition + 12, { align: 'left' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#333333');
  doc.text(String(data.invoiceNumber), pageWidth - 15, yPosition + 12, { align: 'right' });
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor('#666666');
  doc.text('Invoice date:', pageWidth - 55, yPosition + 18, { align: 'left' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#333333');
  doc.text(String(data.invoiceDate), pageWidth - 15, yPosition + 18, { align: 'right' });
  
  // From, Bill to, Ship to Section - Increased spacing for more gap from logo
  yPosition = 80;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#333333'); // Dark grey
  
  // From
  doc.text('From', 15, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#666666');
  doc.text(String(data.from.name), 15, yPosition + 5);
  let fromY = yPosition + 10;
  data.from.address.forEach((line) => {
    doc.text(String(line), 15, fromY);
    fromY += 4;
  });
  
  // Bill to
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#333333');
  doc.text('Bill to', 75, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#666666');
  doc.text(String(data.billTo.name), 75, yPosition + 5);
  doc.text(String(data.billTo.email), 75, yPosition + 10);
  doc.text(String(data.billTo.phone), 75, yPosition + 15);
  doc.text(String(data.billTo.address), 75, yPosition + 20);
  
  // Ship to
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#333333');
  doc.text('Ship to', 145, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor('#666666');
  doc.text(String(data.shipTo.address), 145, yPosition + 5);
  
  // Items Table
  yPosition = Math.max(fromY, yPosition + 30);
  
  // Helper to format currency with commas
  const formatAmount = (amount: number): string => {
    const formattedNumber = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // Using a special approximation for ₹ symbol
    // We'll prepend "Rs. " which renders reliably in all PDF viewers
    return `Rs. ${formattedNumber}`;
  };
  
  const tableData = data.items.map((item, index) => {
    // Build description with subtitle if present
    const description = item.subtitle 
      ? `${item.title}\n${item.subtitle}`
      : String(item.title);
    
    // Use the isDomestic flag from invoice data
    let taxTypeDisplay = '';
    let taxRateDisplay = '';
    let taxAmountDisplay = '';
    
    if (data.isDomestic) {
      // Domestic transaction (same state) - show CGST and SGST
      // Check if tax_lines have CGST/SGST already, otherwise calculate
      const cgstTax = item.tax_lines?.find((tl: any) => 
        String(tl?.code || '').toUpperCase().includes('CGST')
      );
      const sgstTax = item.tax_lines?.find((tl: any) => 
        String(tl?.code || '').toUpperCase().includes('SGST')
      );
      
      let cgstRate, sgstRate, cgstAmount, sgstAmount;
      
      if (cgstTax && sgstTax) {
        // Use actual CGST/SGST from API
        cgstRate = cgstTax.rate || 0;
        sgstRate = sgstTax.rate || 0;
        cgstAmount = cgstTax.total || 0;
        sgstAmount = sgstTax.total || 0;
      } else {
        // Split IGST into CGST + SGST (tax is equally divided)
        cgstRate = (item.tax_rate || 0) / 2;
        sgstRate = (item.tax_rate || 0) / 2;
        cgstAmount = item.tax_total / 2;
        sgstAmount = item.tax_total / 2;
      }
      
      taxTypeDisplay = 'CGST\nSGST';
      taxRateDisplay = `${cgstRate.toFixed(1)}%\n${sgstRate.toFixed(1)}%`;
      taxAmountDisplay = `${formatAmount(cgstAmount)}\n${formatAmount(sgstAmount)}`;
    } else {
      // Interstate transaction (different state) - show IGST
      taxTypeDisplay = 'IGST';
      taxRateDisplay = `${(item.tax_rate || 0).toFixed(1)}%`;
      taxAmountDisplay = formatAmount(item.tax_total);
    }
    
    return [
      String(index + 1),
      description,
      item.hsn_code || 'N/A',
      formatAmount(item.unit_price),
      formatAmount(item.discount_total || 0),
      String(item.quantity),
      formatAmount(item.subtotal),
      taxRateDisplay,
      taxTypeDisplay,
      taxAmountDisplay,
      formatAmount(item.total)
    ];
  });
  
  // Add shipping row with proper tax handling
  if (data.shipping.amount > 0) {
    let shippingTaxType = '';
    let shippingTaxRate = '';
    let shippingTaxAmount = '';
    
    if (data.isDomestic) {
      // Domestic (same state) - split shipping tax into CGST + SGST
      const halfTaxRate = data.shipping.tax_rate / 2;
      const halfTaxAmount = data.shipping.tax_amount / 2;
      shippingTaxType = 'CGST\nSGST';
      shippingTaxRate = `${halfTaxRate.toFixed(1)}%\n${halfTaxRate.toFixed(1)}%`;
      shippingTaxAmount = `${formatAmount(halfTaxAmount)}\n${formatAmount(halfTaxAmount)}`;
    } else {
      // Interstate (different state) - IGST only
      shippingTaxType = 'IGST';
      shippingTaxRate = `${data.shipping.tax_rate.toFixed(1)}%`;
      shippingTaxAmount = formatAmount(data.shipping.tax_amount);
    }
    
    tableData.push([
      '',
      'Shipping',
      '',
      '',
      '',
      '',
      formatAmount(data.shipping.amount),
      shippingTaxRate,
      shippingTaxType,
      shippingTaxAmount,
      formatAmount(data.shipping.total)
    ]);
  }
  
  // Add total row
  tableData.push([
    '',
    'Total',
    '',
    '',
    '',
    '',
    formatAmount(data.totals.netAmount),
    '',
    '',
    formatAmount(data.totals.taxAmount),
    formatAmount(data.totals.totalAmount)
  ]);
  
  // @ts-ignore
  autoTable(doc, {
    startY: yPosition,
    head: [[
      'Sr. No.',
      'Description',
      'HSN \n Code',
      'Unit \n Price',
      'Discount',
      'Quantity',
      'Net \n Amount',
      'Tax \n Rate',
      'Tax \n Type',
      'Tax \n Amount',
      'Total \n Amount'
    ]],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: '#333333',
      lineColor: [230, 230, 230],
      lineWidth: 0.5,
      minCellHeight: 10,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [205, 133, 115], // Reddish-brown #CD8573
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      minCellHeight: 10,
      cellPadding: 3,
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },  // Sr. No.
      1: { halign: 'left', cellWidth: 32 },     // Description (reduced from 36)
      2: { halign: 'center', cellWidth: 14 },   // HSN Code (new)
      3: { halign: 'center', cellWidth: 18 },   // Unit Price
      4: { halign: 'center', cellWidth: 16 },   // Discount (reduced from 18)
      5: { halign: 'center', cellWidth: 11 },   // Quantity (reduced from 12)
      6: { halign: 'center', cellWidth: 19 },   // Net Amount (reduced from 21)
      7: { halign: 'center', cellWidth: 13 },   // Tax Rate (reduced from 14)
      8: { halign: 'center', cellWidth: 13 },   // Tax Type (reduced from 14)
      9: { halign: 'center', cellWidth: 18 },   // Tax Amount (reduced from 20)
      10: { halign: 'center', cellWidth: 20 },  // Total Amount (reduced from 22)
    },
    margin: { left: 14, right: 14 },
    tableWidth: 'wrap',
    didParseCell: function(cellData: any) {
      // Shipping row - keep white background
      const isShippingRow = cellData.row.index === tableData.length - 2 && tableData.length > 1;
      
      // Total row - light peach background and bold
      const isTotalRow = cellData.row.index === tableData.length - 1;
      
      if (isTotalRow) {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.fillColor = [253, 245, 239]; // Light peach #FDF5EF
        cellData.cell.styles.textColor = '#333333';
      } else if (isShippingRow) {
        cellData.cell.styles.fillColor = [255, 255, 255]; // White
      }
    }
  });
  
  // Signature Section
  // @ts-ignore
  const finalY = (doc as any).lastAutoTable?.finalY || yPosition + 80;
  const signatureY = finalY + 20;
  const signatureX = pageWidth - 65;
  
  // Add signature image if available
  if (signatureUrl) {
    try {
      // Try to add signature image
      let signatureFormat: 'PNG' | 'JPEG' | 'WEBP' = 'PNG';
      if (signatureUrl.includes('.jpg') || signatureUrl.includes('.jpeg')) {
        signatureFormat = 'JPEG';
      } else if (signatureUrl.includes('.webp')) {
        signatureFormat = 'WEBP';
      }
      
      // Add signature image with proper aspect ratio (typical signature is wider than tall)
      // Increased height from 15 to 25 for better visibility
      doc.addImage(signatureUrl, signatureFormat, signatureX, signatureY - 20, 45, 25);
      
      // Signature line below the image - reduced gap from +8 to +6
      doc.setDrawColor(160, 82, 45); // Reddish-brown
      doc.setLineWidth(0.8);
      doc.line(signatureX, signatureY + 6, signatureX + 45, signatureY + 6);
      
      // Signature text
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#666666'); // Medium grey
      doc.text('Signature', signatureX + 22.5, signatureY + 11, { align: 'center' });
    } catch (err) {
      console.error('Error adding signature image:', err);
      // Fallback to text-only signature
      doc.setDrawColor(160, 82, 45); // Reddish-brown
      doc.setLineWidth(0.8);
      doc.line(signatureX, signatureY, signatureX + 50, signatureY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor('#666666'); // Medium grey
      doc.text('Signature', signatureX + 25, signatureY + 5, { align: 'center' });
    }
  } else {
    // No signature uploaded - show line only
    doc.setDrawColor(160, 82, 45); // Reddish-brown
    doc.setLineWidth(0.8);
    doc.line(signatureX, signatureY, signatureX + 50, signatureY);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#666666'); // Medium grey
    doc.text('Signature', signatureX + 25, signatureY + 5, { align: 'center' });
  }
  
  // Return the PDF blob for saving and opening
  const pdfBlob = doc.output('blob');
  return pdfBlob;
};

