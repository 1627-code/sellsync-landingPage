import React, { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Calendar,
  TrendingUp,
  Package,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  Sparkles,
  Plus,
  Mail,
  PieChart as PieChartIcon,
  BarChart4,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Search,
  Eye,
  FileSpreadsheet,
  Download as DownloadIcon,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { ReportPreviewModal } from "../components/ReportPreviewModal";
import { AskAIModal } from "../components/AskAIModal";
import { CustomReportModal } from "../components/CustomReportModal";
import { EmailShareModal } from "../components/EmailShareModal";
import { SMSShareModal } from "../components/SMSShareModal";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Calendar as CalendarPicker } from "../components/ui/calendar";
import { format } from "date-fns";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeInUp } from "../../animations/variants";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useStore, Transaction, InventoryItem, CartItem } from "../state/store";
import { toast } from "sonner";

// --- Helper Functions for Report Generation ---

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Safe delay for revocation to avoid "Failed to load document" errors
  setTimeout(() => URL.revokeObjectURL(url), 10000);
};

const getQuarter = (date: Date) => Math.floor((date.getMonth() + 3) / 3);

// 1. Sales Report (Excel - Multi Sheet)
const generateSalesExcel = (transactions: Transaction[], inventory: Record<number, InventoryItem>, currency: any, fileNamePrefix: string = "Daily_Weekly_Sales_Summary") => {
  const wb = XLSX.utils.book_new();
  const now = new Date();
  
  const completedTX = transactions.filter(t => t.status === "Completed");

  // Sheet 1: Summary (Total Revenue, Units Sold, Avg Order Value, Growth %)
  const totalRevenue = completedTX.reduce((sum, t) => sum + t.amount, 0);
  const unitsSold = completedTX.reduce((sum, t) => sum + t.items.reduce((s, i) => s + i.qty, 0), 0);
  const avgOrder = completedTX.length > 0 ? totalRevenue / completedTX.length : 0;
  
  // Growth % (Simplified for this example: comparison vs last half of transactions)
  const midpoint = Math.floor(completedTX.length / 2);
  const recentRev = completedTX.slice(0, midpoint).reduce((s, t) => s + t.amount, 0);
  const olderRev = completedTX.slice(midpoint).reduce((s, t) => s + t.amount, 0);
  const growth = olderRev > 0 ? ((recentRev - olderRev) / olderRev) * 100 : 0;

  const summaryData = [
    { Metric: "Total Revenue", Value: `${currency.symbol}${totalRevenue.toLocaleString()}` },
    { Metric: "Total Units Sold", Value: unitsSold },
    { Metric: "Average Order Value", Value: `${currency.symbol}${avgOrder.toLocaleString()}` },
    { Metric: "Growth %", Value: `${growth.toFixed(1)}%` },
    { Metric: "Report Date", Value: now.toLocaleDateString() }
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), "Summary");

  // Sheet 2: Daily Breakdown (Date | Products Sold | Revenue)
  const dailyMap: Record<string, { revenue: number, units: number }> = {};
  completedTX.forEach(t => {
    const day = t.datetime.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, units: 0 };
    dailyMap[day].revenue += t.amount;
    dailyMap[day].units += t.items.reduce((s, i) => s + i.qty, 0);
  });
  const dailyData = Object.entries(dailyMap).map(([date, stats]) => ({
    Date: date,
    "Products Sold": stats.units,
    Revenue: stats.revenue
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyData), "Daily Breakdown");

  // Sheet 3: Products Sold (Product | Category | Units | Amount | Date)
  const productsSoldData: any[] = [];
  completedTX.forEach(t => {
    t.items.forEach(item => {
      const p = inventory[item.productId];
      productsSoldData.push({
        Product: p?.name || "Unknown",
        Category: p?.category || "Retail",
        Units: item.qty,
        Amount: item.qty * item.price,
        Date: t.datetime.slice(0, 10)
      });
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(productsSoldData), "Products Sold");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};

// 2. Inventory Report (Excel) - Product | SKU | Category | Current Stock | Reorder Point | Valuation
const generateInventoryExcel = (inventoryArray: InventoryItem[]) => {
  const data = inventoryArray.map(item => ({
    Product: item.name,
    SKU: item.sku,
    Category: item.category,
    "Current Stock": item.stock,
    "Reorder Point": item.reorderPoint,
    Valuation: item.stock * item.price
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};

// 3. Performance Report (Excel)
const generatePerformanceExcel = (transactions: Transaction[], inventory: Record<number, InventoryItem>, limit: number = 0) => {
  const wb = XLSX.utils.book_new();
  const completedTX = transactions.filter(t => t.status === "Completed");
  
  // Product Performance (Top/Bottom by revenue)
  const productStats: Record<number, { revenue: number, units: number }> = {};
  completedTX.forEach(t => {
    t.items.forEach(item => {
      if (!productStats[item.productId]) productStats[item.productId] = { revenue: 0, units: 0 };
      productStats[item.productId].revenue += item.qty * item.price;
      productStats[item.productId].units += item.qty;
    });
  });
  
  let performanceData: any[] = Object.entries(productStats).map(([id, stats]) => {
    const p = inventory[Number(id)];
    return {
      Product: p?.name || "Unknown",
      Units: stats.units,
      Revenue: stats.revenue,
      "% of Total": 0 // Calculated below
    };
  });

  const totalRevenue = performanceData.reduce((sum, p) => sum + p.Revenue, 0);
  performanceData = performanceData.map(p => ({
    ...p,
    "% of Total": totalRevenue > 0 ? `${((p.Revenue / totalRevenue) * 100).toFixed(1)}%` : "0%"
  }));

  const topPerformers = [...performanceData].sort((a, b) => b.Revenue - a.Revenue);
  const bottomPerformers = [...performanceData].sort((a, b) => a.Revenue - b.Revenue);

  let finalPerfData: any[] = performanceData;
  if (limit > 0) {
    finalPerfData = [
      { Product: "--- TOP PERFORMERS ---", Units: "", Revenue: "", "% of Total": "" },
      ...topPerformers.slice(0, limit),
      { Product: "", Units: "", Revenue: "", "% of Total": "" },
      { Product: "--- BOTTOM PERFORMERS ---", Units: "", Revenue: "", "% of Total": "" },
      ...bottomPerformers.slice(0, limit)
    ];
  } else {
    finalPerfData = topPerformers;
  }

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(finalPerfData), "Product Performance");

  // Staff Performance
  const staffMap: Record<string, { sales: number, count: number }> = {};
  completedTX.forEach(t => {
    const staff = t.cashier || "Admin";
    if (!staffMap[staff]) staffMap[staff] = { sales: 0, count: 0 };
    staffMap[staff].sales += t.amount;
    staffMap[staff].count += 1;
  });
  const staffData = Object.entries(staffMap).map(([name, stats]) => ({
    Staff: name,
    "Total Sales": stats.sales,
    "Order Count": stats.count
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(staffData), "Staff Performance");

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
};

// 4. Inventory Status Report (PDF)
const generateInventoryPDF = (inventoryArray: InventoryItem[], currency: any, storeName: string) => {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("Inventory Status Report", 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Store: ${storeName}`, 10, 25);
  doc.text(`Date: ${new Date().toLocaleString()}`, 10, 30);

  const tableData = inventoryArray.map(item => [
    item.name,
    item.stock,
    item.reorderPoint,
    item.stock < item.reorderPoint ? "LOW" : "Healthy",
    `${currency.symbol}${(item.stock * item.price).toLocaleString()}`
  ]);

  autoTable(doc, {
    startY: 40,
    head: [["Product", "Stock", "Reorder", "Status", "Valuation"]],
    body: tableData,
    headStyles: { fillColor: [99, 102, 241] },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 3 && data.cell.raw === 'LOW') {
        data.cell.styles.textColor = [239, 68, 68];
      }
    }
  });

  return doc.output("blob");
};

// 5. Financial Summary (PDF)
const generateFinancialPDF = (transactions: Transaction[], currency: any, storeName: string) => {
  const doc = new jsPDF();
  const now = new Date();
  const Q = getQuarter(now);
  
  doc.setFontSize(20);
  doc.text(`Financial Summary Q${Q} ${now.getFullYear()}`, 105, 15, { align: "center" });
  doc.setFontSize(10);
  doc.text(`Store: ${storeName}`, 10, 25);
  
  const totalRev = transactions.filter(t => t.status === "Completed").reduce((s, t) => s + t.amount, 0);
  const profitEst = totalRev * 0.25; // 25% margin estimate

  doc.setFontSize(14);
  doc.text(`Estimated Revenue: ${currency.symbol}${totalRev.toLocaleString()}`, 10, 40);
  doc.text(`Estimated Profit (25%): ${currency.symbol}${profitEst.toLocaleString()}`, 10, 50);

  // Monthly breakdown
  const monthlyMap: Record<string, number> = {};
  transactions.filter(t => t.status === "Completed").forEach(t => {
    const month = new Date(t.datetime).toLocaleString('default', { month: 'long' });
    monthlyMap[month] = (monthlyMap[month] || 0) + t.amount;
  });

  const tableData = Object.entries(monthlyMap).map(([m, val]) => [m, `${currency.symbol}${val.toLocaleString()}`]);
  autoTable(doc, {
    startY: 60,
    head: [["Month", "Revenue"]],
    body: tableData,
    headStyles: { fillColor: [99, 102, 241] }
  });

  return doc.output("blob");
};

// 6. VAT Return Form (PDF) - Standard Nigerian Format
const generateVatPDF = (store: any, transactions: Transaction[], vatRate: number, currency: any) => {
  const doc = new jsPDF();
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const year = now.getFullYear();
  const period = `${monthName} ${year}`;

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("VALUE ADDED TAX (VAT) RETURN FORM", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("FEDERAL INLAND REVENUE SERVICE (FIRS)", 105, 28, { align: "center" });

  // Business Info Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SECTION A: BUSINESS INFORMATION", 14, 40);
  doc.line(14, 42, 196, 42);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Business Name: ${store?.name || "SellSync Retail Store"}`, 14, 50);
  doc.text(`Taxpayer ID (TIN): ${store?.tin || "TIN-012345678-0001"}`, 14, 57);
  doc.text(`Store Address: ${store?.address || "Main Business District"}, ${store?.city || "Lagos"}`, 14, 64);
  doc.text(`Reporting Period: ${period}`, 14, 71);

  // Calculations Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("SECTION B: TAX CALCULATIONS", 14, 85);
  doc.line(14, 87, 196, 87);

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const monthlyTX = transactions.filter(t => {
    const d = new Date(t.datetime);
    return t.status === "Completed" && d >= firstDay && d <= lastDay;
  });

  const totalSales = monthlyTX.reduce((sum, t) => sum + t.amount, 0);
  const vatDue = (totalSales * vatRate) / 100;
  const inputVat = 0; // Future: Track purchases/input tax
  const netVat = vatDue - inputVat;

  const tableData = [
    ["1. Total Taxable Sales (Output)", `${currency.symbol}${totalSales.toLocaleString()}`],
    ["2. VAT Rate (%)", `${vatRate}%`],
    ["3. Total Output VAT Due (1 x 2)", `${currency.symbol}${vatDue.toLocaleString()}`],
    ["4. Deductible Input VAT (Purchases)", `${currency.symbol}${inputVat.toLocaleString()}`],
    ["5. Net VAT Payable (3 - 4)", `${currency.symbol}${netVat.toLocaleString()}`],
  ];

  autoTable(doc, {
    startY: 92,
    head: [["Description", "Amount (NGN)"]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { halign: 'right', fontStyle: 'bold' }
    }
  });

  // Signature Section
  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("SECTION C: DECLARATION", 14, finalY - 10);
  doc.setFont("helvetica", "normal");
  doc.text("I hereby certify that the information provided in this return is true and correct.", 14, finalY);
  
  doc.line(14, finalY + 20, 80, finalY + 20);
  doc.text("Authorized Signature", 14, finalY + 25);
  
  doc.line(130, finalY + 20, 196, finalY + 20);
  doc.text("Date of Submission", 130, finalY + 25);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by SellSync Dashboard - FIRS Compliance Module", 105, 285, { align: "center" });

  return doc.output("blob");
};

export function ReportsPage() {
  const { kpis, inventoryArray, transactions, currency, currentStore, currentUser, formatCurrency, analytics } = useStore();
  const [dateRange, setDateRange] = useState("this-month");
  const [reportType, setReportType] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [reportToShare, setReportToShare] = useState<any>(null);
  const [vatRate, setVatRate] = useState(7.5);
  const [isWeeklyEmail, setIsWeeklyEmail] = useState(false);
  const [isMonthlyEmail, setIsMonthlyEmail] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [filingDate, setFilingDate] = useState<Date | undefined>(new Date(2026, 3, 21)); // Next FIRS deadline
  const [filingNotes, setFilingNotes] = useState("");
  const [filingEmail, setFilingEmail] = useState(currentUser?.email || "");
  const [filingPhone, setFilingPhone] = useState(currentStore?.phone || "");

  // Calculate VAT from analytics or transactions
  const vatSales = useMemo(() => {
    if (analytics.dailySales && analytics.dailySales.length > 0) {
      return analytics.dailySales.reduce((sum, item) => sum + item.revenue, 0);
    }
    return transactions
      .filter(t => t.status === "Completed")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [analytics.dailySales, transactions]);

  const vatDue = useMemo(() => (vatSales * vatRate) / 100, [vatSales, vatRate]);

  // Dynamic Chart Data
  const turnoverData = useMemo(() => [
    { month: "Oct", ratio: 4.2 },
    { month: "Nov", ratio: 4.5 },
    { month: "Dec", ratio: 5.8 },
    { month: "Jan", ratio: 4.9 },
    { month: "Feb", ratio: 5.2 },
    { month: "Mar", ratio: 5.5 },
  ], []);

  const stockoutRiskData = useMemo(() => {
    const categories = Array.from(new Set(inventoryArray.map(i => i.category)));
    const riskByCategory = categories.map(cat => {
      const catItems = inventoryArray.filter(i => i.category === cat);
      const lowStockItems = catItems.filter(i => i.stock <= i.reorderPoint);
      return {
        name: cat,
        value: lowStockItems.length,
        total: catItems.length
      };
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

    const COLORS = ["#EF4444", "#F59E0B", "#6366F1", "#10B981", "#EC4899"];
    return riskByCategory.map((c, i) => ({
      ...c,
      color: COLORS[i % COLORS.length]
    }));
  }, [inventoryArray]);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-'); // 17-03-2026
  const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' }).replace(' ', '-'); // March-2026

  const availableReports = [
    {
      id: 1,
      name: `Monthly Sales Report - ${monthYear}`,
      description: `Complete sales breakdown for ${now.toLocaleString('default', { month: 'long' })}`,
      date: now.toLocaleDateString(),
      type: "Sales",
      format: "Excel",
      hasAI: true,
    },
    {
      id: 2,
      name: `Inventory Status Report`,
      description: "Current stock levels and reorder status",
      date: now.toLocaleDateString(),
      type: "Inventory",
      format: "PDF",
      hasAI: false,
    },
    {
      id: 3,
      name: `Financial Summary Q${getQuarter(now)} ${now.getFullYear()}`,
      description: "Quarterly financial performance and insights",
      date: now.toLocaleDateString(),
      type: "Finance",
      format: "PDF",
      hasAI: true,
    },
    {
      id: 4,
      name: "Product Performance",
      description: "Top and bottom performers analysis",
      date: now.toLocaleDateString(),
      type: "Analytics",
      format: "Excel",
      hasAI: false,
    },
  ];

  const handleGenerate = (type: string) => {
    let blob: Blob | null = null;
    let fileName = "";
    const invMap = Object.fromEntries(inventoryArray.map(i => [i.id, i]));

    toast.promise(
      new Promise((resolve) => {
        setTimeout(() => {
          if (type === "Sales Report") {
            blob = generateSalesExcel(transactions, invMap, currency);
            fileName = `Daily_Weekly_Sales_Summary_${dateStr}.xlsx`;
          } else if (type === "Inventory Report") {
            blob = generateInventoryExcel(inventoryArray);
            fileName = `Inventory_Report_${dateStr}.xlsx`;
          } else if (type === "Performance Report") {
            blob = generatePerformanceExcel(transactions, invMap);
            fileName = `Performance_Report_${dateStr}.xlsx`;
          }

          if (blob) {
            downloadFile(blob, fileName);
            resolve(true);
          }
        }, 1500);
      }),
      {
        loading: `Generating ${type}...`,
        success: `${type} generated and downloaded!`,
        error: "Failed to generate report.",
      }
    );
  };

  const handleDownloadAvailable = (report: any) => {
    let blob: Blob | null = null;
    let fileName = "";
    const invMap = Object.fromEntries(inventoryArray.map(i => [i.id, i]));

    if (report.id === 1) { // Monthly Sales
      blob = generateSalesExcel(transactions, invMap, currency, "Monthly_Sales_Report");
      fileName = `Monthly_Sales_Report_${monthYear}.xlsx`;
    } else if (report.id === 2) { // Inventory Status
      blob = generateInventoryPDF(inventoryArray, currency, currentStore?.name || "Main Store");
      fileName = `Inventory_Status_Report_${dateStr}.pdf`;
    } else if (report.id === 3) { // Financial Summary
      blob = generateFinancialPDF(transactions, currency, currentStore?.name || "Main Store");
      fileName = `Financial_Summary_Q${getQuarter(now)}_${now.getFullYear()}.pdf`;
    } else if (report.id === 4) { // Product Performance
      blob = generatePerformanceExcel(transactions, invMap, 10);
      fileName = `Product_Performance_${dateStr}.xlsx`;
    }

    if (blob) downloadFile(blob, fileName);
  };

  const handleExportVatForm = () => {
    toast.promise(
      new Promise(async (resolve) => {
        const blob = generateVatPDF(currentStore, transactions, vatRate, currency);
        const fileName = `VAT_Return_Form_${now.toLocaleString('default', { month: 'long' })}-${now.getFullYear()}.pdf`;
        downloadFile(blob, fileName);
        setTimeout(resolve, 1000);
      }),
      {
        loading: "Generating VAT Return Form...",
        success: "VAT form exported successfully",
        error: "Failed to export VAT form",
      }
    );
  };

  const handleScheduleFiling = () => {
    if (!filingDate) {
      toast.error("Please select a filing date");
      return;
    }
    
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Scheduling VAT filing reminder...",
        success: `VAT filing reminder scheduled for ${format(filingDate, "PPP")}`,
        error: "Failed to schedule reminder",
      }
    );
    setIsScheduleModalOpen(false);
  };

  const handleShareEmail = (report: any) => {
    setReportToShare({
      name: report.name || report.title,
      type: report.type || "General Report",
      format: report.format || "PDF"
    });
    setEmailModalOpen(true);
  };

  const handleShareSMS = (report: any) => {
    setReportToShare({
      name: report.name || report.title,
      type: report.type || "General Report",
      format: report.format || "PDF"
    });
    setSmsModalOpen(true);
  };

  const handlePreview = (report: any) => {
    setSelectedReport(report);
    setPreviewOpen(true);
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/30 min-h-screen">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reports</h1>
            <p className="text-gray-500 font-medium mt-1">
              Generate and download business reports
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              className="h-12 px-6 rounded-2xl border-gray-200 bg-white hover:bg-gray-50 font-bold gap-2 transition-all shadow-sm"
              onClick={() => setChatOpen(true)}
            >
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Ask AI
            </Button>
            <Button 
              className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold gap-2 shadow-lg shadow-indigo-100 transition-all"
              onClick={() => setCustomModalOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Create Custom Report
            </Button>
          </div>
        </div>

        {/* KPI Row */}
        <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" animate="visible">
          {[
            { 
              label: "Total Revenue", 
              value: formatCurrency(kpis.totalRevenueToday), 
              change: `${kpis.totalRevenueTodayChange > 0 ? "+" : ""}${kpis.totalRevenueTodayChange}%`, 
              color: kpis.totalRevenueTodayChange >= 0 ? "text-green-600" : "text-red-600", 
              bg: kpis.totalRevenueTodayChange >= 0 ? "bg-green-50" : "bg-red-50", 
              icon: DollarSign 
            },
            { label: "Sales Growth", value: `${kpis.totalSalesTodayChange > 0 ? "+" : ""}${kpis.totalSalesTodayChange}%`, change: "vs yesterday", color: "text-blue-600", bg: "bg-blue-50", icon: TrendingUp },
            { label: "Units Sold", value: kpis.productsSoldToday.toLocaleString(), change: "Today", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
            { label: "Reports Generated", value: "24", change: "This month", color: "text-indigo-600", bg: "bg-indigo-50", icon: FileText },
          ].map((stat, i) => (
            <motion.div key={i} variants={fadeInUp}>
              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                      <stat.icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold border-indigo-100 text-indigo-600 animate-pulse">
                      LIVE
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
                      <span className={`text-xs font-bold ${stat.color}`}>{stat.change}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Generate Report Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-none shadow-sm bg-white rounded-3xl group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900">Sales Report</h3>
                  <p className="text-xs text-gray-500 font-medium">Daily & Weekly sales summary</p>
                </div>
              </div>
              <Button 
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-black text-white font-bold gap-2 shadow-lg shadow-gray-200 transition-all"
                onClick={() => handleGenerate("Sales Report")}
              >
                <DownloadIcon className="w-4 h-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-3xl group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                  <Package className="w-6 h-6 text-green-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900">Inventory Report</h3>
                  <p className="text-xs text-gray-500 font-medium">Stock levels & valuation</p>
                </div>
              </div>
              <Button 
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-black text-white font-bold gap-2 shadow-lg shadow-gray-200 transition-all"
                onClick={() => handleGenerate("Inventory Report")}
              >
                <DownloadIcon className="w-4 h-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-white rounded-3xl group hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                  <TrendingUp className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900">Performance Report</h3>
                  <p className="text-xs text-gray-500 font-medium">Product & Staff performance</p>
                </div>
              </div>
              <Button 
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-black text-white font-bold gap-2 shadow-lg shadow-gray-200 transition-all"
                onClick={() => handleGenerate("Performance Report")}
              >
                <DownloadIcon className="w-4 h-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Reports Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Inventory Turnover */}
          <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                  <BarChart4 className="w-5 h-5 text-purple-600" />
                </div>
                <Badge className="bg-purple-50 text-purple-700 border-purple-100 font-bold">Real-time</Badge>
              </div>
              <CardTitle className="text-xl font-black text-gray-900">Inventory Turnover Trend</CardTitle>
              <p className="text-sm text-gray-500 font-medium">Last 6 months turnover ratio</p>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={turnoverData}>
                    <defs>
                      <linearGradient id="colorTurnover" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                    <Area type="monotone" dataKey="ratio" stroke="#8B5CF6" strokeWidth={4} fillOpacity={1} fill="url(#colorTurnover)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Right: Stockout Risk */}
          <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="p-8 pb-2">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                </div>
                <Badge className="bg-red-50 text-red-700 border-red-100 font-bold">Urgent</Badge>
              </div>
              <CardTitle className="text-xl font-black text-gray-900">Stockout Risk by Category</CardTitle>
              <p className="text-sm text-gray-500 font-medium">This month distribution</p>
            </CardHeader>
            <CardContent className="p-8 pt-6">
              <div className="h-[300px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockoutRiskData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={110}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {stockoutRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-black text-gray-900">3</p>
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Critical</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
{/*         
        this is the static content i have been asking you to remove from the reports page since, this part is supposed to be reading from the backend not static, 
        [Pasted ~4 lines] 
        this is supposed to read number of products that have low stock, it's not supposed to be static */}
         

        {/* Tax / VAT Calculator */}
        <Card className="border-none shadow-sm bg-white rounded-[2rem] overflow-hidden">
          <CardHeader className="p-8 pb-4 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Calculator className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-black text-gray-900">Tax / VAT Calculator</CardTitle>
                <p className="text-sm text-gray-500 font-medium">Live VAT calculation based on store sales</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Sales Value ({currency.symbol})</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">{currency.symbol}</span>
                  <Input 
                    type="number" 
                    value={vatSales} 
                    onChange={(e) => setVatSales(Number(e.target.value))} 
                    className="h-14 pl-10 bg-gray-50 border-none rounded-2xl text-lg font-black focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">VAT Rate (%)</Label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">%</span>
                  <Input 
                    type="number" 
                    value={vatRate} 
                    onChange={(e) => setVatRate(Number(e.target.value))} 
                    className="h-14 pr-10 bg-gray-50 border-none rounded-2xl text-lg font-black focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <div className="bg-indigo-600 rounded-[1.5rem] p-6 text-white shadow-xl shadow-indigo-100 flex flex-col justify-center">
                <p className="text-xs font-black text-indigo-200 uppercase tracking-[0.2em] mb-1">VAT Due</p>
                <p className="text-3xl font-black tracking-tight">{formatCurrency(vatDue)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button 
                className="h-12 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold gap-2 shadow-lg shadow-indigo-100 transition-all"
                onClick={handleExportVatForm}
              >
                <DownloadIcon className="w-5 h-5" />
                Export VAT Form
              </Button>
              <Button 
                variant="outline" 
                className="h-12 px-8 rounded-xl bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 font-bold gap-2 transition-all"
                onClick={() => setIsScheduleModalOpen(true)}
              >
                <Calendar className="w-5 h-5" />
                Schedule Filing
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Schedule VAT Filing Modal */}
        <Dialog open={isScheduleModalOpen} onOpenChange={setIsScheduleModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl bg-white">
            <DialogHeader className="p-8 pb-4 bg-gray-50/50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-100">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-gray-900">Schedule VAT Filing</DialogTitle>
                  <DialogDescription className="text-gray-500 font-medium">Set a reminder for your next tax submission</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Filing Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full h-12 justify-start text-left font-bold bg-gray-50 border-gray-100 rounded-xl",
                          !filingDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4 text-purple-600" />
                        {filingDate ? format(filingDate, "PPP") : <span>Pick a deadline</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={filingDate}
                        onSelect={setFilingDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Reminder Email</Label>
                    <Input 
                      placeholder="admin@example.com" 
                      value={filingEmail}
                      onChange={(e) => setFilingEmail(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Reminder SMS</Label>
                    <Input 
                      placeholder="0801 234 5678" 
                      value={filingPhone}
                      onChange={(e) => setFilingPhone(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-100 rounded-xl focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Notes</Label>
                  <Textarea 
                    placeholder="Add any specific instructions for this filing..." 
                    rows={3}
                    value={filingNotes}
                    onChange={(e) => setFilingNotes(e.target.value)}
                    className="bg-gray-50 border-gray-100 rounded-2xl focus:ring-2 focus:ring-purple-100 resize-none font-medium"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl border-gray-200 font-bold hover:bg-gray-50 transition-all"
                onClick={() => setIsScheduleModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-[2] h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 font-black text-lg shadow-xl shadow-purple-100 transition-all"
                onClick={handleScheduleFiling}
              >
                Schedule Reminder
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Available Reports Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Available Reports</h2>
              <p className="text-gray-500 font-medium">Download or schedule report generation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {availableReports.map((report) => (
              <Card key={report.id} className="border-none shadow-sm bg-white rounded-3xl overflow-hidden group hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex items-center gap-5 flex-1">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                        <FileText className="w-7 h-7 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{report.name}</h3>
                          {report.hasAI && (
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-[10px]">AI INSIGHT READY</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 font-medium mb-3">{report.description}</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <Badge variant="outline" className="bg-gray-50/50 border-gray-100 text-gray-500 font-bold">{report.type}</Badge>
                          <Badge className="bg-green-50 text-green-700 border-green-100 font-bold">{report.format}</Badge>
                          <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">{report.date}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-gray-400 hover:text-indigo-600 font-bold" onClick={() => handleShareEmail(report)}>
                        <Mail className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-gray-400 hover:text-green-600 font-bold" onClick={() => handleShareSMS(report)}>
                        <MessageSquare className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" className="h-12 px-6 rounded-xl text-gray-400 hover:text-indigo-600 font-bold gap-2" onClick={() => handlePreview(report)}>
                        <Eye className="w-5 h-5" />
                        Preview
                      </Button>
                      <Button 
                        className="h-12 px-8 rounded-xl bg-gray-900 hover:bg-black text-white font-bold gap-2 shadow-lg shadow-gray-200" 
                        onClick={() => handleDownloadAvailable(report)}
                      >
                        <Download className="w-5 h-5" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <ReportPreviewModal 
          open={previewOpen} 
          onClose={() => setPreviewOpen(false)} 
          report={selectedReport}
          onEmail={handleShareEmail}
          onSMS={handleShareSMS}
          onDownload={handleDownloadAvailable}
        />
        <AskAIModal open={chatOpen} onClose={() => setChatOpen(false)} />
        <CustomReportModal open={customModalOpen} onClose={() => setCustomModalOpen(false)} />
        <EmailShareModal 
          open={emailModalOpen} 
          onClose={() => setEmailModalOpen(false)} 
          reportName={reportToShare?.name || "Report"} 
          reportType={reportToShare?.type || "General Report"}
          file={null} // Passing null for now, can be extended to pass generated blobs
        />
        <SMSShareModal 
          open={smsModalOpen} 
          onClose={() => setSmsModalOpen(false)} 
          reportName={reportToShare?.name || "Report"} 
          reportType={reportToShare?.type || "General Report"}
        />
      </div>
  );
}

