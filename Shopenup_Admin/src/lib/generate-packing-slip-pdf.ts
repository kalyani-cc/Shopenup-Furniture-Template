// @ts-ignore - jsPDF types
import jsPDF from 'jspdf';
// @ts-ignore - jspdf-autotable types
import autoTable from 'jspdf-autotable';

interface PackingSlipItem {
  id: string;
  title: string;
  subtitle?: string;
  quantity: number;
}

interface PackingSlipData {
  orderNumber: string;
  orderDate: string;
  shippingMethod: string;
  from: {
    name: string;
    address: string[];
  };
  billTo: {
    name: string;
    address: string;
  };
  shipTo: {
    name: string;
    address: string;
  };
  items: PackingSlipItem[];
}

export const generatePackingSlipPDF = (data: PackingSlipData) => {
  // @ts-ignore
  const doc = new jsPDF({
    putOnlyUsedFonts: true,
    compress: true
  });
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header Section
  let yPosition = 25;
  
  // Packing Slip Title
  doc.setFontSize(22);
  doc.setTextColor(51, 51, 51); // #333333
  doc.setFont('helvetica', 'bold');
  doc.text('Packing Slip', 15, yPosition);
  
  // Sender Information
  yPosition += 10;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102); // #666666
  doc.text(String(data.from.name), 15, yPosition);
  
  yPosition += 5;
  doc.setFontSize(9);
  data.from.address.forEach((line) => {
    if (line && line.trim()) {
      doc.text(String(line), 15, yPosition);
      yPosition += 4;
    }
  });
  
  // Horizontal line separator
  yPosition += 5;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.3);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  
  // Bill to and Ship to Section
  yPosition += 8;
  const billShipStartY = yPosition;
  
  // Bill to (left side)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51); // #333333
  doc.text('Bill to:', 15, yPosition);
  
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102); // #666666
  doc.text(String(data.billTo.name), 15, yPosition);
  
  // Split address by newlines and display each line
  yPosition += 4;
  const billToLines = data.billTo.address.split('\n').filter(line => line && line.trim());
  billToLines.forEach((line) => {
    doc.text(String(line), 15, yPosition);
    yPosition += 4;
  });
  const billToEndY = yPosition;
  
  // Ship to (right side)
  yPosition = billShipStartY;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51); // #333333
  doc.text('Ship to:', pageWidth - 15, yPosition, { align: 'right' });
  
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102); // #666666
  doc.text(String(data.shipTo.name), pageWidth - 15, yPosition, { align: 'right' });
  
  // Split address by newlines and display each line
  yPosition += 4;
  const shipToLines = data.shipTo.address.split('\n').filter(line => line && line.trim());
  shipToLines.forEach((line) => {
    doc.text(String(line), pageWidth - 15, yPosition, { align: 'right' });
    yPosition += 4;
  });
  const shipToEndY = yPosition;
  
  // Horizontal line separator
  yPosition = Math.max(billToEndY, shipToEndY) + 5;
  doc.setLineWidth(0.3);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  
  // Order Details Section
  yPosition += 8;
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 51, 51); // #333333
  
  // Headers
  doc.text('Order #', 15, yPosition);
  doc.text('Order date', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('Shipping method', pageWidth - 15, yPosition, { align: 'right' });
  
  // Values
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(102, 102, 102); // #666666
  doc.text(String(data.orderNumber), 15, yPosition);
  doc.text(String(data.orderDate), pageWidth / 2, yPosition, { align: 'center' });
  doc.text(String(data.shippingMethod), pageWidth - 15, yPosition, { align: 'right' });
  
  // Horizontal line separator
  yPosition += 8;
  doc.setLineWidth(0.3);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  
  // Items Table
  yPosition += 8;
  
  const tableData = data.items.map((item) => {
    const description = item.subtitle || '';
    return [
      item.title,
      description,
      String(item.quantity)
    ];
  });
  
  // Add total row
  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);
  tableData.push(['Total', '', String(totalQuantity)]);
  
  // @ts-ignore
  autoTable(doc, {
    startY: yPosition,
    head: [['Item', 'Description', 'Quantity']],
    body: tableData,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 5, right: 5, bottom: 5, left: 5 },
      textColor: [102, 102, 102], // #666666
      lineColor: [220, 220, 220],
      lineWidth: 0.3,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [51, 51, 51], // #333333
      fontStyle: 'bold',
      halign: 'left',
      lineWidth: { bottom: 0.3 },
      lineColor: [220, 220, 220],
      cellPadding: { top: 5, right: 5, bottom: 5, left: 5 },
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 80 },
      1: { halign: 'left', cellWidth: 70 },
      2: { halign: 'right', cellWidth: 'auto' },
    },
    margin: { left: 15, right: 15 },
    didParseCell: function(cellData: any) {
      // Total row - make it bold
      const isTotalRow = cellData.row.index === tableData.length - 1;
      
      if (isTotalRow) {
        cellData.cell.styles.fontStyle = 'bold';
        cellData.cell.styles.textColor = [51, 51, 51]; // #333333
        cellData.cell.styles.lineWidth = { top: 0.3, bottom: 0 };
        cellData.cell.styles.lineColor = [220, 220, 220];
      }
    }
  });
  
  // Generate PDF blob and open in new tab
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
};

