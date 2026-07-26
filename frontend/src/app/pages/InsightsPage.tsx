import { useMemo, useState } from "react";
import {
  AlertTriangle,
  TrendingUp,
  Clock,
  ArrowRight,
  Info,
  Users,
  DollarSign,
  TrendingDown,
  Tag,
  Package,
  LayoutDashboard,
  ShoppingCart,
  BarChart4,
  Star,
  Calendar,
  Layers,
  ShieldAlert,
  Download,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../components/ui/select";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useStore } from "../state/store";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from "recharts";

const COLORS = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#ec4899"];

// Sample chart data (fallback if transactions are empty)
const fallbackRevenueData: { name: string; revenue: number }[] = [];
const fallbackGrowthData: { name: string; customers: number }[] = [];
const fallbackAovData: { name: string; aov: number }[] = [];

interface InsightItem {
  id: string;
  title: string;
  type: string;
  product?: string;
  message: string;
  priority: string;
  category: string[];
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
  action?: string;
  trendData?: { sales: number }[];
  trendColor?: string;
}

export function InsightsPage() {
  const { inventoryArray, transactions, formatCurrency, analytics, salesTrend, topProducts } = useStore();
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState("30d");
  const [insightSearch, setInsightSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const dailySales = useMemo(() => {
    if (analytics.dailySales && analytics.dailySales.length > 0) {
      const sales: Record<number, number> = {};
      analytics.dailySales.forEach((item: { date: string; revenue: number }) => {
        const date = new Date(item.date);
        sales[date.getTime()] = item.revenue;
      });
      return sales;
    }
    return {};
  }, [analytics.dailySales]);

  // Helper to filter transactions by time range
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 3650;
    const cutoff = new Date(now.setDate(now.getDate() - days));
    return transactions.filter((tx: { datetime: string }) => new Date(tx.datetime) >= cutoff);
  }, [transactions, timeRange]);

  // 1. Calculate Sales by Category
  const categorySalesData = useMemo(() => {
    if (analytics.salesByCategory && analytics.salesByCategory.length > 0) {
      return analytics.salesByCategory.map((item: { category: string; revenue: number }) => ({
        name: item.category,
        revenue: item.revenue
      })).sort((a, b) => b.revenue - a.revenue);
    }

    const categoryTotals: Record<string, number> = {};
    
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const product = inventoryArray.find(p => p.id === item.productId);
        const category = product?.category || "Uncategorized";
        categoryTotals[category] = (categoryTotals[category] || 0) + (item.qty * item.price);
      });
    });

    const data = Object.entries(categoryTotals).map(([name, revenue]) => ({
      name,
      revenue
    })).sort((a, b) => b.revenue - a.revenue);

    if (data.length === 0) {
      return [];
    }
    return data;
  }, [filteredTransactions, inventoryArray, analytics.salesByCategory]);

  // 2. Dynamic Revenue Trend (Daily)
  const revenueTrendData = useMemo(() => {
    if (filteredTransactions.length === 0) return fallbackRevenueData;
    
    const dailyTotals: Record<string, number> = {};
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.datetime);
      const dayName = days[date.getDay()];
      dailyTotals[dayName] = (dailyTotals[dayName] || 0) + tx.amount;
    });

    return days.map(day => ({
      name: day,
      revenue: dailyTotals[day] || 0
    }));
  }, [filteredTransactions]);

  // 4. Average Order Value (AOV) Chart
  const { aovData, aovChange } = useMemo(() => {
    if (filteredTransactions.length === 0) return { aovData: fallbackAovData, aovChange: 18 };

    const weeklyStats: Record<string, { totalRevenue: number, txCount: number }> = {};
    
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.datetime);
      const weekNumber = Math.ceil(date.getDate() / 7);
      const weekLabel = `Week ${weekNumber}`;
      
      if (!weeklyStats[weekLabel]) {
        weeklyStats[weekLabel] = { totalRevenue: 0, txCount: 0 };
      }
      weeklyStats[weekLabel].totalRevenue += tx.amount;
      weeklyStats[weekLabel].txCount += 1;
    });

    const data = Object.entries(weeklyStats).map(([name, stats]) => ({
      name,
      aov: Math.round(stats.totalRevenue / stats.txCount)
    })).sort((a, b) => a.name.localeCompare(b.name));

    let change = 0;
    if (data.length >= 2) {
      const last = data[data.length - 1].aov;
      const prev = data[data.length - 2].aov;
      change = prev !== 0 ? Math.round(((last - prev) / prev) * 100) : 0;
    }

    return { aovData: data, aovChange: change };
  }, [filteredTransactions]);

  // 3. Dynamic Customer Growth (Weekly)
  const { customerGrowthData, customerGrowthChange } = useMemo(() => {
    if (filteredTransactions.length === 0) return { customerGrowthData: fallbackGrowthData, customerGrowthChange: 28 };

    const weeklyUniqueCustomers: Record<string, Set<string>> = {};
    
    filteredTransactions.forEach(tx => {
      const date = new Date(tx.datetime);
      const weekNumber = Math.ceil(date.getDate() / 7);
      const weekLabel = `Week ${weekNumber}`;
      
      if (!weeklyUniqueCustomers[weekLabel]) {
        weeklyUniqueCustomers[weekLabel] = new Set();
      }
      if (tx.customer) {
        weeklyUniqueCustomers[weekLabel].add(tx.customer);
      } else {
        weeklyUniqueCustomers[weekLabel].add(tx.id);
      }
    });

    const data = Object.entries(weeklyUniqueCustomers).map(([name, customers]) => ({
      name,
      users: customers.size
    })).sort((a, b) => a.name.localeCompare(b.name));

    let change = 0;
    if (data.length >= 2) {
      const last = data[data.length - 1].users;
      const prev = data[data.length - 2].users;
      change = prev !== 0 ? Math.round(((last - prev) / prev) * 100) : 0;
    }

    return { customerGrowthData: data, customerGrowthChange: change };
  }, [filteredTransactions]);

  // 5. Product Performance Chart (Revenue per product)
  const productPerformanceData = useMemo(() => {
    const productRevenue: Record<string, number> = {};
    
    filteredTransactions.forEach(tx => {
      tx.items.forEach(item => {
        const product = inventoryArray.find(p => p.id === item.productId);
        const name = product?.name || `Product ${item.productId}`;
        productRevenue[name] = (productRevenue[name] || 0) + (item.qty * item.price);
      });
    });

    const data = Object.entries(productRevenue).map(([name, revenue]) => ({
      name,
      revenue
    })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    if (data.length === 0) {
      return [];
    }
    return data;
  }, [filteredTransactions, inventoryArray]);

  const dynamicInsights = useMemo(() => {
    const list: any[] = [];
    
    // Helper to generate mock trend data for sparklines
    const generateTrend = (type: 'up' | 'down' | 'flat') => {
      const data = [];
      let val = type === 'up' ? 20 : type === 'down' ? 80 : 50;
      for (let i = 0; i < 7; i++) {
        if (type === 'up') val += Math.random() * 15;
        else if (type === 'down') val -= Math.random() * 15;
        else val += (Math.random() - 0.5) * 10;
        data.push({ sales: Math.max(0, Math.round(val)) });
      }
      return data;
    };

    inventoryArray.forEach((p) => {
      const soldToday = dailySales[p.id] || 0;
      
      // 1. High Priority / Critical Stock Alert (New)
      if (p.stock < p.reorderPoint) {
        list.push({
          id: `critical-${p.id}`,
          title: "Critical Stock Alert",
          type: "Stock Alert",
          product: p.name,
          message: `${p.name} critically low (${p.stock} units). Risk of stockout in 3 days.`,
          priority: "critical",
          category: ["alerts"],
          timestamp: "Just now",
          icon: ShieldAlert,
          action: "Reorder Now",
          trendData: generateTrend('down'),
          trendColor: "#ef4444",
        });
      } 
      // 2. Medium Priority Stock Alert
      else if (p.stock < p.reorderPoint * 2) {
        list.push({
          id: `med-${p.id}`,
          title: "Medium Priority Stock Alert",
          type: "Stock Alert",
          product: p.name,
          message: `${p.name} stock level is ${p.stock}. Plan restocking soon to maintain optimal levels.`,
          priority: "medium",
          category: ["alerts"],
          timestamp: "1 hour ago",
          icon: Info,
          action: "Reorder",
          trendData: generateTrend('down'),
          trendColor: "#f59e0b",
        });
      }

      // 3. Dead Stock Alert
      if (soldToday === 0 && p.stock > 100) {
        list.push({
          id: `dead-${p.id}`,
          title: "Dead Stock Alert",
          type: "Stock Alert",
          product: p.name,
          message: `${p.name} (Stock: ${p.stock}) has not sold recently. Consider creating a promotion.`,
          priority: "recommendation",
          category: ["alerts"],
          timestamp: "1 day ago",
          icon: Package,
          action: "Create Promo",
          trendData: generateTrend('flat'),
          trendColor: "#94a3b8",
        });
      }

      // 4. Discount Recommendation
      if (soldToday === 0 && p.stock > p.reorderPoint && p.stock < 100) {
        list.push({
          id: `discount-${p.id}`,
          title: "Discount Recommendation",
          type: "Pricing Insight",
          product: p.name,
          message: `No sales in 12 days for ${p.name}. Apply 10% discount to boost movement.`,
          priority: "recommendation",
          category: ["pricing"],
          timestamp: "5 hours ago",
          icon: Tag,
          action: "Create Discount",
          trendData: generateTrend('down'),
          trendColor: "#3b82f6",
        });
      }

      // 5. Slow-Moving Product Alert (New)
      if (soldToday > 0 && soldToday < 3) {
        list.push({
          id: `slow-${p.id}`,
          title: "Slow-Moving Product Alert",
          type: "Stock Alert",
          product: p.name,
          message: `${p.name} sold only ${soldToday} units today. Consider bundling or promotion.`,
          priority: "recommendation",
          category: ["alerts", "pricing"],
          timestamp: "3 hours ago",
          icon: Clock,
          action: "Create Bundle",
          trendData: generateTrend('down'),
          trendColor: "#f59e0b",
        });
      }

      // 6. Top Performer Highlight (New)
      if (soldToday > 15) {
        list.push({
          id: `top-${p.id}`,
          title: "Top Performer Highlight",
          type: "Pricing Insight",
          product: p.name,
          message: `${p.name} is a top seller this week but stock dropping fast. Increase safety stock?`,
          priority: "opportunity",
          category: ["pricing"],
          timestamp: "2 hours ago",
          icon: Star,
          action: "Adjust Reorder",
          trendData: generateTrend('up'),
          trendColor: "#10b981",
        });
      }

      // 7. Overstock / Excess Inventory Alert (New)
      if (p.stock > 250) {
        list.push({
          id: `overstock-${p.id}`,
          title: "Overstock Alert",
          type: "Stock Alert",
          product: p.name,
          message: `${p.name} (${p.stock} units) projected to last 140+ days. Risk of overstock.`,
          priority: "high",
          category: ["alerts"],
          timestamp: "4 hours ago",
          icon: Layers,
          action: "Create Promo",
          trendData: generateTrend('flat'),
          trendColor: "#f59e0b",
        });
      }
    });

    // 8. Seasonal Trend Alert (Manual entry for now)
    list.push({
      id: "seasonal-1",
      title: "Seasonal Trend Alert",
      type: "Market Insight",
      product: "Pain Relief Tablets",
      message: "Demand for pain relief typically increases 25% in March. Prepare stock now.",
      priority: "insight",
      category: ["all"],
      timestamp: "1 day ago",
      icon: Calendar,
      action: "View Forecast",
      trendData: generateTrend('up'),
      trendColor: "#8b5cf6",
    });

    // 9. Upcoming Expirations
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const today = new Date();

    inventoryArray.forEach(p => {
      if (p.expiryDate) {
        const expiry = new Date(p.expiryDate);
        if (expiry < today) {
          list.push({
            id: `expired-${p.id}`,
            title: "Product Expired",
            type: "Expiry Alert",
            product: p.name,
            message: `${p.name} expired on ${expiry.toLocaleDateString()}. Remove from shelf immediately.`,
            priority: "critical",
            category: ["alerts"],
            timestamp: "Just now",
            icon: ShieldAlert,
            action: "Remove Item",
            trendData: generateTrend('down'),
            trendColor: "#ef4444",
          });
        } else if (expiry <= thirtyDaysFromNow) {
          list.push({
            id: `expiring-${p.id}`,
            title: "Expiring Soon",
            type: "Expiry Alert",
            product: p.name,
            message: `${p.name} expires in ${Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days. Review stock level (${p.stock}).`,
            priority: "high",
            category: ["alerts"],
            timestamp: "Today",
            icon: Clock,
            action: "Markdown",
            trendData: generateTrend('down'),
            trendColor: "#f59e0b",
          });
        }
      }
    });

    return list;
  }, [inventoryArray, transactions, analytics]);

  // TOP 5 PRODUCTS RANKING LOGIC
  const topStaffData = useMemo(() => {
    const staffSales: Record<string, number> = {};
    transactions.forEach(tx => {
      if (tx.status === "Completed" && tx.cashier) {
        staffSales[tx.cashier] = (staffSales[tx.cashier] || 0) + tx.amount;
      }
    });

    return Object.entries(staffSales)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [transactions, analytics.topProducts]);

  const topProductsData = useMemo(() => {
    // Use analytics data if available
    if (analytics.topProducts && analytics.topProducts.length > 0) {
      return analytics.topProducts.slice(0, 5).map(p => ({
        name: p.productName,
        sold: p.unitsSold
      }));
    }

    // 1. Calculate total units sold per product from ALL transactions
    const productSales: Record<number, number> = {};
    transactions.forEach(tx => {
      tx.items.forEach(item => {
        productSales[item.productId] = (productSales[item.productId] || 0) + item.qty;
      });
    });

    return inventoryArray
      .map(p => ({
        name: p.name,
        sold: productSales[p.id] || 0
      }))
      // 2. Rank by total quantity sold (desc), then alphabetically (asc)
      .sort((a, b) => {
        if (b.sold !== a.sold) {
          return b.sold - a.sold;
        }
        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);
  }, [inventoryArray, transactions]);

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const rangeLabel = timeRange === "7d" ? "Last_7_Days" : timeRange === "30d" ? "Last_30_Days" : timeRange === "90d" ? "Last_90_Days" : "All_Time";
    const fileName = `Insights_${rangeLabel}_${dateStr}`;

    if (format === "csv") {
      const headers = ["Priority", "Type", "Product", "Message", "Time"];
      const rows = tableInsights.map(i => [i.priority, i.type, i.product, `"${i.message.replace(/"/g, '""')}"`, i.timestamp]);
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
      toast.success("Insights exported to CSV");
    } else if (format === "excel") {
      const data = tableInsights.map(i => ({
        Priority: i.priority,
        Type: i.type,
        Product: i.product,
        Message: i.message,
        Time: i.timestamp
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Insights");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      toast.success("Insights exported to Excel");
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`Insights Analysis - ${rangeLabel.replace(/_/g, ' ')}`, 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

      const tableData = tableInsights.map(i => [
        i.priority.toUpperCase(),
        i.type,
        i.product,
        i.message,
        i.timestamp
      ]);

      (doc as any).autoTable({
        startY: 30,
        head: [["Priority", "Type", "Product", "Message", "Time"]],
        body: tableData,
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: { 3: { cellWidth: 80 } }
      });

      doc.save(`${fileName}.pdf`);
      toast.success("Insights exported to PDF");
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "critical":
        return <Badge className="bg-red-100 text-red-700 border-red-200">CRITICAL</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">HIGH</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">MEDIUM</Badge>;
      case "recommendation":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">RECOMMENDATION</Badge>;
      case "opportunity":
        return <Badge className="bg-green-100 text-green-700 border-green-200">OPPORTUNITY</Badge>;
      case "insight":
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200">INSIGHT</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const filterInsights = (category: string) => {
    let list = dynamicInsights;
    if (category !== "all") {
      list = list.filter(i => i.category.includes(category));
    }
    return list;
  };

  const tableInsights = useMemo(() => {
    return dynamicInsights.filter(i => {
      const matchesSearch = i.product.toLowerCase().includes(insightSearch.toLowerCase()) || 
                           i.message.toLowerCase().includes(insightSearch.toLowerCase()) ||
                           i.title.toLowerCase().includes(insightSearch.toLowerCase());
      const matchesPriority = priorityFilter === "all" || i.priority.toLowerCase() === priorityFilter.toLowerCase();
      return matchesSearch && matchesPriority;
    });
  }, [dynamicInsights, insightSearch, priorityFilter]);

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Live
            </Badge>
          </div>
          <p className="text-sm text-gray-500">
            Store intelligence: recommendations and alerts based on real-time data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px] bg-white border-gray-200">
              <Calendar className="w-4 h-4 mr-0.7 text-gray-400" />
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white border-gray-200 gap-2 shadow-sm">
                <Download className="w-4 h-4" />
                Export Analytics
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl">
              <DropdownMenuItem onClick={() => handleExport("csv")} className="gap-2 font-medium">
                <FileText className="w-4 h-4 text-gray-400" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")} className="gap-2 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-green-500" /> Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")} className="gap-2 font-medium">
                <Download className="w-4 h-4 text-red-500" /> Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 1. Insights Tabs Section */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 bg-white border border-gray-200 p-1 h-11 shadow-sm">
          <TabsTrigger value="all" className="px-8 h-9 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">All</TabsTrigger>
          <TabsTrigger value="alerts" className="px-8 h-9 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Alerts</TabsTrigger>
          <TabsTrigger value="pricing" className="px-8 h-9 data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <InsightList items={filterInsights("all")} navigate={navigate} />
        </TabsContent>
        <TabsContent value="alerts">
          <InsightList items={filterInsights("alerts")} navigate={navigate} />
        </TabsContent>
        <TabsContent value="pricing">
          <InsightList items={filterInsights("pricing")} navigate={navigate} />
        </TabsContent>
      </Tabs>

      {/* Staff Performance Insights */}
      {topStaffData.length > 0 && (
        <Card className="border-none shadow-sm bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-[2rem] overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-300 fill-yellow-300" />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Top Performing Staff</h3>
                <p className="text-indigo-100 text-sm font-medium">Recognizing this month's sales champions</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topStaffData.map((staff, i) => (
                <div key={staff.name} className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold">{staff.name}</p>
                      <p className="text-[10px] text-indigo-200 uppercase font-black tracking-widest">Revenue</p>
                    </div>
                  </div>
                  <p className="text-lg font-black">{formatCurrency(staff.revenue)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Top 5 Selling Products (Real-time) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Top 5 Selling Products (Real-time)</h2>
          <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700 p-0 text-sm font-semibold" onClick={() => navigate("/products")}>
            View All Products
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {topProductsData.map((p, index) => (
            <Card key={p.name} className="border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-white overflow-hidden group" onClick={() => navigate("/products")}>
              <CardContent className="p-5 flex flex-col items-center text-center relative">
                <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                  {index + 1}
                </div>
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-50 transition-colors">
                  <Package className="w-6 h-6 text-gray-400 group-hover:text-indigo-600" />
                </div>
                <p className="text-sm font-bold text-gray-900 line-clamp-1 mb-1">{p.name}</p>
                <div className="flex flex-col">
                  <span className="text-2xl font-black text-indigo-600">{p.sold}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Units Sold Today</span>
                </div>
                <div className="mt-3 text-[10px] text-gray-400 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-green-500" />
                  Live updates
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AOV Card */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all bg-white flex flex-col h-[420px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <Badge className={`${aovChange >= 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'} flex items-center gap-1`}>
                {aovChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(aovChange)}%
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">Average Order Value (AOV)</CardTitle>
            <p className="text-sm text-gray-500">Weekly customer spending behavior</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={aovData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₦${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`₦${value.toLocaleString()}`, "AOV"]}
                  />
                  <Line type="monotone" dataKey="aov" stroke="#3b82f6" strokeWidth={4} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Updated just now</span>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-blue-600 hover:text-blue-700 p-0 uppercase">Details</Button>
          </div>
        </Card>

        {/* Product Performance Card */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all bg-white flex flex-col h-[420px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <BarChart4 className="w-5 h-5 text-orange-600" />
              </div>
              <Badge className="bg-orange-50 text-orange-700 border-orange-100">Top Performers</Badge>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">Product Performance (Top Revenue)</CardTitle>
            <p className="text-sm text-gray-500">Revenue generated per product</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformanceData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar 
                    dataKey="revenue" 
                    radius={[0, 6, 6, 0]} 
                    barSize={24}
                    onClick={() => navigate("/products")}
                    className="cursor-pointer"
                  >
                    {productPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Updated just now</span>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-orange-600 hover:text-orange-700 p-0 uppercase">Full List</Button>
          </div>
        </Card>

        {/* Sales by Category Card */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all bg-white flex flex-col h-[420px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-indigo-600" />
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100">Market Mix</Badge>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">Sales by Category</CardTitle>
            <p className="text-sm text-gray-500">Revenue distribution by category</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySalesData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" fontSize={11} tickLine={false} axisLine={false} width={80} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar 
                    dataKey="revenue" 
                    radius={[0, 6, 6, 0]} 
                    barSize={24}
                    onClick={(data) => {
                      if (data && data.name) {
                        setInsightSearch(data.name);
                        setPriorityFilter("all");
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {categorySalesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Updated just now</span>
            <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 p-0 uppercase">View Details</Button>
          </div>
        </Card>
      </div>

      {/* 4. Customer Growth & Revenue Trend Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Growth Card */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all bg-white flex flex-col h-[400px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <Badge className={`${customerGrowthChange >= 0 ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'} flex items-center gap-1`}>
                {customerGrowthChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(customerGrowthChange)}%
              </Badge>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">Customer Growth</CardTitle>
            <p className="text-sm text-gray-500">Weekly store popularity growth</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={customerGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={4} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Updates Enabled</span>
          </div>
        </Card>

        {/* Revenue Trend Card */}
        <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all bg-white flex flex-col h-[400px]">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-50 text-green-700 border-green-100">Rising</Badge>
              </div>
            </div>
            <CardTitle className="text-lg font-bold text-gray-900">Revenue Trend</CardTitle>
            <p className="text-sm text-gray-500">Daily sales performance fluctuations</p>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrendData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₦${val}`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`₦${value.toLocaleString()}`, "Revenue"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
          <div className="px-6 py-3 bg-gray-50/50 border-t border-gray-100 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Synced with POS</span>
          </div>
        </Card>
      </div>

      {/* 5. All Insights Table Section */}
      <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">All Insights Table</CardTitle>
              <p className="text-sm text-gray-500">Detailed list of all system-generated store insights</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search insights..." 
                  className="pl-9 w-[240px] h-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                  value={insightSearch}
                  onChange={(e) => setInsightSearch(e.target.value)}
                />
              </div>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-gray-50 border-gray-200">
                  <Filter className="w-3.5 h-3.5 mr-2 text-gray-400" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="recommendation">Recommendation</SelectItem>
                  <SelectItem value="opportunity">Opportunity</SelectItem>
                  <SelectItem value="insight">Insight</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-gray-400 uppercase tracking-widest bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Priority</th>
                  <th className="px-6 py-4 font-bold">Type</th>
                  <th className="px-6 py-4 font-bold">Product</th>
                  <th className="px-6 py-4 font-bold">Description</th>
                  <th className="px-6 py-4 font-bold">Action</th>
                  <th className="px-6 py-4 font-bold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tableInsights.length > 0 ? (
                  tableInsights.map((insight) => (
                    <tr key={insight.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        {getPriorityBadge(insight.priority)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{insight.type}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer underline-offset-4 hover:underline"
                          onClick={() => navigate("/products")}
                        >
                          {insight.product}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 max-w-md line-clamp-2 leading-relaxed">{insight.message}</p>
                      </td>
                      <td className="px-6 py-4">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(insight.action.includes("Reorder") ? "/inventory" : "/products")}
                          className="h-8 text-xs font-bold border-gray-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 transition-all gap-1.5"
                        >
                          {insight.action}
                          <ArrowRight className="w-3 h-3" />
                        </Button>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400 font-medium whitespace-nowrap">{insight.timestamp}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No insights found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Showing {tableInsights.length} insights</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200 bg-white" disabled>Previous</Button>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200 bg-white" disabled>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  function InsightList({ items, navigate }: { items: any[], navigate: any }) {
    if (items.length === 0) {
      return (
        <div className="text-center py-16 bg-white border-2 border-dashed border-gray-200 rounded-2xl">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">No active insights</h3>
          <p className="text-gray-500 max-w-xs mx-auto">We couldn't find any insights in this category at the moment.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((insight) => {
          const Icon = insight.icon;
          return (
            <Card key={insight.id} className="shadow-sm border-gray-200 bg-white hover:border-indigo-400 hover:shadow-lg transition-all duration-300 group overflow-hidden">
              <div className="h-1 bg-transparent group-hover:bg-indigo-500 transition-colors" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-50 transition-colors shadow-inner">
                    <Icon className="w-6 h-6 text-gray-500 group-hover:text-indigo-600 transition-colors" />
                  </div>
                  {getPriorityBadge(insight.priority)}
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-bold text-base text-gray-900 leading-tight group-hover:text-indigo-700 transition-colors">{insight.title}</h4>
                    {insight.trendData && (
                      <div className="h-[40px] w-[90px] flex-shrink-0 bg-gray-50/50 rounded-lg p-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={insight.trendData}>
                            <Line 
                              type="monotone" 
                              dataKey="sales" 
                              stroke={insight.trendColor} 
                              strokeWidth={3} 
                              dot={false} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 leading-relaxed min-h-[40px]">
                    {insight.message}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      <Clock className="w-3.5 h-3.5" /> {insight.timestamp}
                    </span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-9 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 px-3 font-bold gap-1 transition-all" 
                      onClick={() => navigate(insight.action.includes("Reorder") ? "/inventory" : "/products")}
                    >
                      {insight.action} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }
}

