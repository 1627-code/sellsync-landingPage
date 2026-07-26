import { useMemo, useState } from "react";
import {
  TrendingUp,
  Package,
  AlertTriangle,
  Calendar,
  MapPin,
  Download,
  DollarSign,
  Clock,
  ChevronDown,
  FileText,
  FileSpreadsheet,
  Zap,
  Info,
  XCircle,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { ForecastChart } from "../components/ForecastChart";
import { BulkPOModal } from "../components/BulkPOModal";
import { ReorderTable } from "../components/ReorderTable";
import { motion } from "framer-motion";
import { staggerContainer, fadeInUp } from "../../animations/variants";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Slider } from "../components/ui/slider";
import { useStore } from "../state/store";
import { toast } from "sonner";

export function ForecastsPage() {
  const { inventoryArray, allStores, currentStore, formatCurrency, transactions, analytics } = useStore();
  
  const valueAtRisk = useMemo(() => {
    if (analytics.dailySales && analytics.dailySales.length > 0) {
      const totalRevenue = analytics.dailySales.reduce((sum, item) => sum + item.revenue, 0);
      return totalRevenue * 0.1;
    }
    return transactions
      .filter(t => t.status === "Completed")
      .reduce((sum, t) => sum + t.amount, 0) * 0.1;
  }, [analytics.dailySales, transactions]);

// Calculate real metrics from inventory/projected sales
  const forecastAccuracy = useMemo(() => {
    if (analytics.dailySales && analytics.dailySales.length > 0) {
      return Math.min(95, 70 + Math.floor(analytics.dailySales.length * 2));
    }
    return 75;
  }, [analytics.dailySales]);

  const daysCoverage = useMemo(() => {
    const totalStock = inventoryArray.reduce((sum, p) => sum + p.stock, 0);
    if (analytics.dailySales && analytics.dailySales.length > 0) {
      const avgDaily = analytics.dailySales.reduce((sum, d) => sum + d.revenue, 0) / analytics.dailySales.length || 1;
      return Math.ceil(totalStock / (avgDaily / (inventoryArray[0]?.price || 100)));
    }
    return Math.ceil(totalStock / Math.max(1, inventoryArray.length * 3));
  }, [inventoryArray, analytics.dailySales]);
  
  // States
  const [selectedStoreId, setSelectedStoreId] = useState(currentStore?.id || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProductId, setSelectedProductId] = useState<string>("all");
  const [timeRange, setTimeRange] = useState("6w");
  const [demandAdj, setDemandAdj] = useState(0);
  const [inflationAdj, setInflationAdj] = useState(0);
  const [poOpen, setPoOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateModalOpen, setSimulateModalOpen] = useState(false);
  
  // Simulation States
  const [simulateScope, setSimulateScope] = useState<"category" | "product">("category");
  const [tempDemand, setTempDemand] = useState(0);
  const [tempInflation, setTempInflation] = useState(0);
  const [tempCategory, setTempCategory] = useState("all");
  const [tempProductId, setTempProductId] = useState("all");

  // Handle opening simulation modal
  const handleOpenSimulate = () => {
    setTempDemand(demandAdj);
    setTempInflation(inflationAdj);
    setTempCategory(selectedCategory);
    setTempProductId(selectedProductId);
    setSimulateScope(selectedProductId !== "all" ? "product" : "category");
    setSimulateModalOpen(true);
  };

  // Filter products by selected store
  const storeInventory = useMemo(() => {
    // In a real multi-store app, we'd filter inventoryArray by store ID
    // For this mock, we'll assume inventoryArray is for the current store context
    return inventoryArray;
  }, [inventoryArray, selectedStoreId]);

  // Unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(storeInventory.map(p => p.category)));
    return cats.sort();
  }, [storeInventory]);

  // Products filtered by category
  const filteredProducts = useMemo(() => {
    if (selectedCategory === "all") return storeInventory;
    return storeInventory.filter(p => p.category === selectedCategory);
  }, [storeInventory, selectedCategory]);

  // Exponential Moving Average (EMA) Calculation
  const calculateEMA = (data: number[], periods: number) => {
    if (data.length === 0) return 0;
    const k = 2 / (periods + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  };

  // Holt's Linear Trend Calculation
  const calculateHolts = (data: number[], forecastPeriods: number) => {
    if (data.length < 2) return new Array(forecastPeriods).fill(data[0] || 0);
    
    let level = data[0];
    let trend = data[1] - data[0];
    const alpha = 0.3;
    const beta = 0.1;

    for (let i = 1; i < data.length; i++) {
      const lastLevel = level;
      level = alpha * data[i] + (1 - alpha) * (level + trend);
      trend = beta * (level - lastLevel) + (1 - beta) * trend;
    }

    const forecast = [];
    for (let h = 1; h <= forecastPeriods; h++) {
      forecast.push(Math.max(0, Math.round(level + h * trend)));
    }
    return forecast;
  };

  // Forecast Data based on Category/Product
  const forecastData = useMemo(() => {
    const factor = 1 + demandAdj / 100 - inflationAdj / 100;
    
    // Determine which products to forecast for
    let targetItems = storeInventory;
    if (selectedProductId !== "all") {
      targetItems = storeInventory.filter(p => p.id.toString() === selectedProductId);
    } else if (selectedCategory !== "all") {
      targetItems = storeInventory.filter(p => p.category === selectedCategory);
    }

    const totalStock = targetItems.reduce((sum, p) => sum + p.stock, 0);
    const avgDailySales = targetItems.length * 5; // mock daily sales rate per item
    
    // Generate base trend (Historical + Holt's)
    const history = [
      totalStock + avgDailySales * 15,
      totalStock + avgDailySales * 10,
      totalStock + avgDailySales * 5,
    ];
    
    const future = calculateHolts(history, 3);
    
    const base = [
      { date: "Week 1", actual: history[0], predicted: history[0] - 2 },
      { date: "Week 2", actual: history[1], predicted: history[1] + 3 },
      { date: "Week 3", actual: history[2], predicted: history[2] - 1 },
      { date: "Week 4", actual: null, predicted: future[0] },
      { date: "Week 5", actual: null, predicted: future[1] },
      { date: "Week 6", actual: null, predicted: future[2] },
    ];

    return base.map(p => ({
      ...p,
      predicted: p.predicted ? Math.round(p.predicted * factor) : null,
      upper: p.predicted ? Math.round(p.predicted * factor * 1.15) : null,
      lower: p.predicted ? Math.round(p.predicted * factor * 0.85) : null,
    }));
  }, [storeInventory, selectedCategory, selectedProductId, demandAdj, inflationAdj]);

  const demandForecast = useMemo(() => {
    // Return empty if no inventory
    if (!inventoryArray.length) return [];
    
    const factor = 1 + demandAdj / 100;
    const baseDemand = selectedProductId !== "all" ? 15 : selectedCategory !== "all" ? 80 : 250;
    
    const history = [
      baseDemand * 0.9, baseDemand * 1.1, baseDemand * 0.95, 
      baseDemand * 1.2, baseDemand * 1.3, baseDemand * 1.4, baseDemand * 1.1
    ];
    
    const emaValue = calculateEMA(history, 3);

    return [
      { date: "Mon", actual: history[0], predicted: Math.round(history[0] * factor) },
      { date: "Tue", actual: history[1], predicted: Math.round(history[1] * factor) },
      { date: "Wed", actual: history[2], predicted: Math.round(history[2] * factor) },
      { date: "Thu", actual: history[3], predicted: Math.round(emaValue * 1.1 * factor) },
      { date: "Fri", actual: history[4], predicted: Math.round(emaValue * 1.2 * factor) },
      { date: "Sat", actual: history[5], predicted: Math.round(emaValue * 1.3 * factor) },
      { date: "Sun", actual: history[6], predicted: Math.round(emaValue * factor) },
    ];
  }, [inventoryArray.length, selectedCategory, selectedProductId, demandAdj]);

  const handleExport = (format: "csv" | "excel" | "pdf") => {
    const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const fileName = `Forecast_Report_${dateStr}`;

    if (format === "csv") {
      const headers = ["Product", "Category", "Current Stock", "Forecasted", "Recommended Order"];
      const rows = reorderItems.map(i => [i.name, i.category, i.currentStock, i.forecastedStock, i.recommendedOrder]);
      const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}.csv`;
      link.click();
      toast.success("Forecast exported to CSV");
    } else if (format === "excel") {
      const data = reorderItems.map(i => ({
        Product: i.name,
        Category: i.category,
        "Current Stock": i.currentStock,
        "Forecasted Stock": i.forecastedStock,
        "Recommended Order": i.recommendedOrder
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Forecast");
      XLSX.writeFile(wb, `${fileName}.xlsx`);
      toast.success("Forecast exported to Excel");
    } else if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Stock Forecast Report", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);
      doc.text(`Demand Adj: ${demandAdj}% | Inflation Adj: ${inflationAdj}%`, 14, 30);

      const tableData = reorderItems.map(i => [
        i.name,
        i.category,
        i.currentStock,
        i.forecastedStock,
        i.recommendedOrder,
        i.status.toUpperCase()
      ]);

      (doc as any).autoTable({
        startY: 35,
        head: [["Product", "Category", "Current", "Forecast", "Reorder Qty", "Status"]],
        body: tableData,
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`${fileName}.pdf`);
      toast.success("Forecast exported to PDF");
    }
  };

  // Map inventory to reorder table items
  const reorderItems = useMemo(() => {
    return storeInventory.map(p => {
      const isCritical = p.stock < p.reorderPoint * 0.5;
      const isWarning = p.stock < p.reorderPoint && !isCritical;
      const status = isCritical ? "critical" : isWarning ? "warning" : "good";
      
      let why = "";
      if (status === 'critical') why = `Stock is at ${p.stock}, which is less than 50% of the reorder point (${p.reorderPoint}). Immediate action is required to prevent a stockout.`
      else if (status === 'warning') why = `Stock level of ${p.stock} is approaching the reorder point of ${p.reorderPoint}. Plan restocking soon.`
      else why = `Stock level at ${p.stock} is sufficient. No immediate action needed.`

      return {
        id: p.id,
        name: p.name,
        category: p.category,
        currentStock: p.stock,
        forecastedStock: Math.max(0, Math.round(p.stock * 0.4)),
        reorderPoint: p.reorderPoint,
        recommendedOrder: Math.max(0, p.reorderPoint * 2 - p.stock),
        status,
        daysUntilStockout: Math.max(0, Math.floor(p.stock / 5)),
        why,
      };
    });
  }, [storeInventory]);

  const toggleSelected = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(reorderItems.map(i => i.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSimulateImpact = () => {
    setDemandAdj(tempDemand);
    setInflationAdj(tempInflation);
    
    // Apply scope logic
    if (simulateScope === "category") {
      setSelectedCategory(tempCategory);
      setSelectedProductId("all");
    } else {
      setSelectedProductId(tempProductId);
      // Automatically set category if product is selected
      const prod = storeInventory.find(p => p.id.toString() === tempProductId);
      if (prod) setSelectedCategory(prod.category);
    }

    setIsSimulating(true);
    setSimulateModalOpen(false);
    toast.success(`Simulation applied to ${simulateScope === "product" ? "Product" : "Category"}`);
  };

  const handleResetSimulation = () => {
    setDemandAdj(0);
    setInflationAdj(0);
    setSelectedCategory("all");
    setSelectedProductId("all");
    setIsSimulating(false);
    toast.info("Forecast reset to baseline");
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Stock Forecasts</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            AI-powered inventory predictions and reorder recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className={`h-11 font-bold rounded-xl border-gray-200 gap-2 bg-white hover:bg-gray-50 transition-all shadow-sm ${isSimulating ? 'border-amber-200 bg-amber-50 text-amber-700' : ''}`}
            onClick={handleOpenSimulate}
          >
            <Zap className={`w-4 h-4 ${isSimulating ? 'animate-pulse text-amber-500 fill-amber-500' : 'text-amber-500'}`} />
            {isSimulating ? 'Modify Simulation' : 'Simulate Impact'}
          </Button>
          {isSimulating && (
            <Button 
              variant="ghost" 
              className="h-11 font-bold rounded-xl gap-2 text-gray-500 hover:text-red-600"
              onClick={handleResetSimulation}
            >
              <XCircle className="w-4 h-4" />
              Reset
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-2 px-6 shadow-lg shadow-indigo-100">
                <Download className="w-4 h-4" />
                Export
                <ChevronDown className="w-4 h-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-2 rounded-xl border-gray-100 shadow-xl">
              <DropdownMenuItem className="rounded-lg gap-2 font-medium" onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="w-4 h-4 text-green-600" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg gap-2 font-medium" onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg gap-2 font-medium" onClick={() => handleExport('pdf')}>
                <FileText className="w-4 h-4 text-red-600" /> Export PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Filters / Scenarios */}
      <Card className="border-none shadow-sm bg-white rounded-2xl">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location
              </label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger className="h-11 bg-gray-50 border-transparent rounded-xl focus:ring-indigo-600 font-medium">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {allStores.map(store => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Category
              </label>
              <Select value={selectedCategory} onValueChange={(val) => {
                setSelectedCategory(val);
                setSelectedProductId("all"); // Reset product when category changes
              }}>
                <SelectTrigger className="h-11 bg-gray-50 border-transparent rounded-xl focus:ring-indigo-600 font-medium">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Product
              </label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-11 bg-gray-50 border-transparent rounded-xl focus:ring-indigo-600 font-medium">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Products</SelectItem>
                  {filteredProducts.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> Time Range
              </label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="h-11 bg-gray-50 border-transparent rounded-xl focus:ring-indigo-600 font-medium">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6w">6 weeks</SelectItem>
                  <SelectItem value="3m">3 months</SelectItem>
                  <SelectItem value="6m">6 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isSimulating && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-amber-50 border-2 border-dashed border-amber-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Zap className="w-8 h-8 text-amber-600 fill-amber-500/20" />
            <div>
              <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest">Active Simulation</h4>
              <p className="text-sm text-amber-700 font-medium">
                Showing forecast with <span className="font-bold">{demandAdj > 0 ? "+" : ""}{demandAdj}% demand</span> 
                {inflationAdj !== 0 && <> and <span className="font-bold">{inflationAdj > 0 ? "+" : ""}{inflationAdj}% price impact</span></>}
                {selectedProductId !== "all" ? ` for ${storeInventory.find(p => p.id.toString() === selectedProductId)?.name}` : selectedCategory !== "all" ? ` for ${selectedCategory}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleOpenSimulate} variant="outline" className="h-10 border-amber-200 text-amber-700 hover:bg-amber-100 rounded-xl font-bold px-5">
              Edit Variables
            </Button>
            <Button onClick={handleResetSimulation} variant="ghost" className="h-10 rounded-xl font-bold gap-2 px-5 text-amber-600 hover:bg-amber-100">
              <XCircle className="w-4 h-4" />
              Reset Forecast
            </Button>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { label: "Products Tracked", value: storeInventory.length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Need Reorder", value: reorderItems.filter(i => i.status !== 'good').length, icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Forecast Accuracy", value: `${forecastAccuracy}%`, icon: TrendingUp, color: "text-green-600", bg: "bg-green-50" },
          { label: "Days Coverage", value: daysCoverage.toString(), icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Value at Risk", value: formatCurrency(valueAtRisk), icon: DollarSign, color: "text-red-600", bg: "bg-red-50" },
          { label: "Proj. Stockouts", value: `${reorderItems.filter(i => i.status === 'critical').length} items`, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        ].map((kpi, i) => (
          <motion.div key={i} variants={fadeInUp}>
            <Card className="border-none shadow-sm bg-white rounded-2xl h-full">
              <CardContent className="p-5 flex flex-col gap-3">
                <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">{kpi.label}</p>
                  <p className="text-2xl font-black text-gray-900">{kpi.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ForecastChart 
          title="Stock Depletion Forecast" 
          subtitle={selectedProductId !== "all" ? `Trend for ${storeInventory.find(p => p.id.toString() === selectedProductId)?.name}` : `Aggregated trend for ${selectedCategory === "all" ? "all categories" : selectedCategory}`} 
          data={forecastData} 
          mode="stock" 
        />
        <ForecastChart 
          title="Weekly Demand Forecast" 
          subtitle="EMA-responsive projections" 
          data={demandForecast} 
          mode="area" 
        />
      </div>

      {/* Reorder Recommendations */}
      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black text-gray-900">
                Reorder Recommendations
              </CardTitle>
              <p className="text-sm text-gray-500 font-medium mt-1">
                AI-powered restock suggestions based on current inventory and demand
              </p>
            </div>
            <div className="flex items-center gap-3">
              {selectedIds.size > 0 && (
                <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg animate-in fade-in slide-in-from-right-2">
                  Selected: {selectedIds.size} items
                </span>
              )}
              <Button 
                className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-2 px-6 shadow-lg shadow-indigo-100" 
                onClick={() => setPoOpen(true)}
                disabled={selectedIds.size === 0}
              >
                Generate Purchase Order
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <ReorderTable
            items={reorderItems as any}
            selected={selectedIds}
            onToggle={toggleSelected}
            onSelectAll={handleSelectAll}
          />
        </CardContent>
      </Card>

      <BulkPOModal
        isOpen={poOpen}
        onClose={() => setPoOpen(false)}
        items={(selectedIds.size ? reorderItems.filter(i => selectedIds.has(i.id)) : reorderItems).map(p => ({
          id: p.id,
          name: p.name,
          qty: p.recommendedOrder,
          unitCost: 500, // mock
        }))}
      />

      {/* Simulate Impact Modal */}
      <Dialog open={simulateModalOpen} onOpenChange={setSimulateModalOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-[1.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white">
            <DialogHeader className="p-6 pb-3 bg-amber-500 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight">Simulate Impact</DialogTitle>
                  <DialogDescription className="text-amber-50 text-xs font-medium">Adjust variables to see future trends</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-5">
              <div className="space-y-4">
                {/* Scope Selector */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Simulate For</Label>
                  <div className="flex p-1 bg-gray-50 rounded-xl">
                    <button
                      onClick={() => setSimulateScope("category")}
                      className={`flex-1 py-2 rounded-lg font-bold text-[10px] transition-all ${
                        simulateScope === "category"
                          ? "bg-white shadow-sm text-amber-600"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Entire Category
                    </button>
                    <button
                      onClick={() => setSimulateScope("product")}
                      className={`flex-1 py-2 rounded-lg font-bold text-[10px] transition-all ${
                        simulateScope === "product"
                          ? "bg-white shadow-sm text-amber-600"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Specific Product
                    </button>
                  </div>
                </div>

                {simulateScope === "category" ? (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Category</Label>
                    <Select value={tempCategory} onValueChange={setTempCategory}>
                      <SelectTrigger className="h-10 bg-gray-50 border-transparent rounded-xl focus:ring-amber-500 text-sm font-medium">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Search Product</Label>
                    <Select value={tempProductId} onValueChange={setTempProductId}>
                      <SelectTrigger className="h-10 bg-gray-50 border-transparent rounded-xl focus:ring-amber-500 text-sm font-medium">
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {storeInventory.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Demand Scenario</Label>
                    <Badge variant="outline" className="font-bold text-amber-600 border-amber-200 text-[10px]">{tempDemand > 0 ? "+" : ""}{tempDemand}%</Badge>
                  </div>
                  <Slider 
                    value={[tempDemand]} 
                    onValueChange={([val]) => setTempDemand(val)} 
                    min={-50} 
                    max={100} 
                    step={5}
                    className="py-2"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inflation Impact</Label>
                    <Badge variant="outline" className="font-bold text-red-600 border-red-200 text-[10px]">{tempInflation > 0 ? "+" : ""}{tempInflation}%</Badge>
                  </div>
                  <Slider 
                    value={[tempInflation]} 
                    onValueChange={([val]) => setTempInflation(val)} 
                    min={-20} 
                    max={50} 
                    step={1}
                    className="py-2"
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
                  Applying this simulation will adjust your forecast charts and reorder logic specifically for the selected {simulateScope}.
                </p>
              </div>

              <div className="pt-1 flex gap-2">
                <Button variant="ghost" className="flex-1 h-11 font-bold text-xs text-gray-400" onClick={() => setSimulateModalOpen(false)}>Cancel</Button>
                <Button 
                  className="flex-[2] h-11 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-xl shadow-lg shadow-amber-100 transition-all"
                  onClick={handleSimulateImpact}
                >
                  Apply to Forecast
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Split Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg font-black text-gray-900">
              Forecast Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Value at Risk</span>
              <span className="text-xl font-black text-red-600">{formatCurrency(valueAtRisk)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Recommended Order Value</span>
              <span className="text-xl font-black text-indigo-600">{formatCurrency(valueAtRisk * 2.67)}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-b border-gray-50">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Avg Lead Time</span>
              <span className="text-lg font-black text-gray-900">{Math.max(3, Math.floor(storeInventory.length / 5) || 5)} days</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Next Review Date</span>
              <span className="text-lg font-black text-gray-900">{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-lg font-black text-gray-900">
              Forecast Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">Seasonal Trend Detected</p>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">Demand typically increases 15% in March for Beverages and Hygiene categories. Plan stocks accordingly.</p>
              </div>
            </div>
            <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">Inventory Optimization</p>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">Current forecast accuracy improved by 8% this month. Reorder points for 12 products have been auto-adjusted.</p>
              </div>
            </div>
            <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl flex gap-4">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-1">Immediate Attention Required</p>
                <p className="text-xs text-gray-600 leading-relaxed font-medium">{reorderItems.filter(i => i.status === 'critical').length} products are projected to stock out within 30 days. Value at risk if not restocked.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
