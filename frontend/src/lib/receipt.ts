import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

export const generateReceiptPDF = (data: {
  store: any;
  transactionId: string;
  date: string;
  cashier: string;
  customer: string;
  items: any[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  currency: any;
  changeDue?: number;
}) => {
  console.log("Generating Professional PDF for transaction:", data.transactionId);
  
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let y = 20;

    // Currency symbol fallback
    let currencySymbol = "N";
    if (data.currency && data.currency.symbol) {
      currencySymbol = data.currency.symbol;
    }

    // 1. Header Section
    // SellSync Logo/Brand
    doc.setFillColor(79, 70, 229);
    doc.roundedRect(margin, y, 12, 12, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("SS", margin + 6, y + 7.5, { align: "center" });

    doc.setTextColor(59, 130, 246); // Bright Blue (#3B82F6)
    doc.setFontSize(22);
    doc.text("Sell", margin + 15, y + 8);
    doc.setFont("helvetica", "black");
    doc.text("Sync", margin + 31, y + 8);

    doc.setTextColor(17, 24, 39);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("Payment Receipt", pageWidth - margin, y + 8, { align: "right" });
    y += 25;

    // 2. Info Grid Section (Sold To vs Payment Summary)
    const colWidth = (pageWidth - (margin * 2)) / 2;
    
    // Left Side: Sold To / Store Info
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "bold");
    doc.text("SOLD TO:", margin, y);
    y += 6;
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text(data.customer || "Guest Customer", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Customer Address: N/A", margin, y);
    y += 4;
    doc.text("Contact: N/A", margin, y);
    y += 10;

    // Store Info (Below Sold To)
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "bold");
    doc.text("STORE INFORMATION:", margin, y);
    y += 6;
    doc.setTextColor(17, 24, 39);
    doc.text(data.store?.name || "Main Store - Downtown", margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(data.store?.address || "Store Address Location", margin, y);
    y += 4;
    doc.text(`${data.store?.city || "Lagos"}, ${data.store?.state || "Nigeria"}`, margin, y);
    
    // Right Side: Payment Summary (reset Y for this part)
    let rightY = y - 31;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "bold");
    doc.text("PAYMENT SUMMARY:", margin + colWidth, rightY);
    rightY += 6;
    
    doc.setTextColor(17, 24, 39);
    const summaryItems = [
      ["Receipt #:", data.transactionId || "TXN-000000"],
      ["Date:", data.date || new Date().toLocaleDateString()],
      ["Payment Method:", data.paymentMethod || "Cash"],
      ["Served By:", data.cashier || "System Admin"],
      ["Status:", "PAID"]
    ];

    summaryItems.forEach(([label, value]) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin + colWidth, rightY);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + colWidth + 35, rightY);
      rightY += 5;
    });

    y = Math.max(y, rightY) + 15;

    // 3. Items Table
    autoTable(doc, {
      startY: y,
      head: [["DESCRIPTION", "MANUFACTURED", "EXPIRY", "QTY", "PRICE", "TOTAL"]],
      body: (data.items || []).map(i => [
        { content: `${i.name || 'Product Item'}\nSKU: ${i.sku || 'N/A'}`, styles: { fontSize: 8 } },
        i.manufacturedDate ? new Date(i.manufacturedDate).toLocaleDateString() : "-",
        i.expiryDate ? new Date(i.expiryDate).toLocaleDateString() : "-",
        (i.qty || 0).toString(),
        `${currencySymbol}${(i.price || 0).toLocaleString()}`,
        `${currencySymbol}${((i.price || 0) * (i.qty || 0)).toLocaleString()}`
      ]),
      theme: "striped",
      styles: { 
        fontSize: 8, 
        cellPadding: 4, 
        textColor: [31, 41, 55], 
        valign: 'middle',
        lineColor: [243, 244, 246],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [249, 250, 251], 
        textColor: [107, 114, 128], 
        fontStyle: "bold",
        fontSize: 7
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 25, halign: "center" },
        3: { cellWidth: 15, halign: "center" },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 25, halign: "right" }
      },
      margin: { left: margin, right: margin }
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // 4. Totals Section
    const totalsX = pageWidth - margin - 80;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Subtotal:", totalsX, y);
    doc.setTextColor(17, 24, 39);
    doc.text(`${currencySymbol}${(data.subtotal || 0).toLocaleString()}`, pageWidth - margin, y, { align: "right" });
    y += 7;

    if (data.discount > 0) {
      doc.setTextColor(107, 114, 128);
      doc.text("Discount:", totalsX, y);
      doc.setTextColor(239, 68, 68);
      doc.text(`-${currencySymbol}${(data.discount || 0).toLocaleString()}`, pageWidth - margin, y, { align: "right" });
      y += 7;
    }

    doc.setDrawColor(243, 244, 246);
    doc.line(totalsX, y, pageWidth - margin, y);
    y += 8;

    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text("GRAND TOTAL:", totalsX, y);
    doc.setTextColor(79, 70, 229);
    doc.text(`${currencySymbol}${(data.total || 0).toLocaleString()}`, pageWidth - margin, y, { align: "right" });
    
    if (data.changeDue && data.changeDue > 0) {
      y += 10;
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text("Change Given:", totalsX, y);
      doc.setTextColor(17, 24, 39);
      doc.text(`${currencySymbol}${data.changeDue.toLocaleString()}`, pageWidth - margin, y, { align: "right" });
    }

    // 5. Footer & Bank Details
    y = pageWidth > 250 ? pageWidth - 60 : 230; // Push to bottom of A4

    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Bank Details Placeholder
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "bold");
    doc.text("BANK DETAILS / NOTES:", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text("Account Name: SellSync Retail Solutions", margin, y);
    y += 4;
    doc.text("Bank: Zenith Bank PLC | Account: 1012345678", margin, y);
    y += 4;
    doc.text("Inventory updated in real-time. Thank you for shopping with SellSync!", margin, y);

    // AI Badge at bottom right
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "bold");
    doc.text("POWERED BY SELLSYNC AI", pageWidth - margin, y + 4, { align: "right" });

    return doc.output("blob");
  } catch (err) {
    console.error("Professional PDF Creation Failed:", err);
    throw err;
  }
};

export const downloadReceiptPDF = (blob: Blob, transactionId: string, isAuto = false) => {
  try {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SellSync-Receipt-${transactionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    if (isAuto) {
      toast.success("Receipt downloaded automatically", {
        description: `Order ${transactionId} saved to your device.`
      });
    } else {
      toast.success("Receipt generated successfully");
    }
  } catch (err) {
    console.error("PDF Download Failed:", err);
    toast.error("Could not download receipt");
  }
};
