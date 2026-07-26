import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Search,
  Filter,
  Plus,
  Download,
  MoreVertical,
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  ChevronDown,
  Trash2,
  Tag,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Pin,
  Minus,
  FileText,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Checkbox } from "../components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { Progress } from "../components/ui/progress";
import { ScrollArea } from "../components/ui/scroll-area";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useStore } from "../state/store";

export function InventoryPage() {
  const {
    inventoryArray,
    categories,
    addProduct,
    setProductStock,
    setProductPrice,
    deleteProduct,
    addCategory,
    theme,
    currency,
    formatCurrency,
  } = useStore();

  const location = useLocation();

  // Filter & Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | "none" }>({
    key: "none",
    direction: "none",
  });
  const [quickFilter, setQuickFilter] = useState<"all" | "in-stock" | "low-stock" | "critical">("all");

  // Handle incoming navigation filter (e.g. from Dashboard or Global Search)
  useEffect(() => {
    if (location.state?.highlightId) {
      const product = inventoryArray.find(p => p.id === location.state.highlightId);
      if (product) {
        setSearchTerm(product.name);
        setHighlightedId(product.id);
        setQuickFilter("all");
        
        // Scroll to the row
        setTimeout(() => {
          const element = document.getElementById(`product-row-${product.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);

        // Remove highlight after 3 seconds
        const timer = setTimeout(() => setHighlightedId(null), 3000);
        return () => clearTimeout(timer);
      }
    } else if (location.state?.search) {
      setSearchTerm(location.state.search);
      setQuickFilter("all");
    } else if (location.state?.productId) {
      const product = inventoryArray.find(p => p.id === location.state.productId);
      if (product) {
        setSearchTerm(product.name);
        setSelectedRows([product.id]);
        setQuickFilter("all");
      }
    } else if (location.state?.filter) {
      setQuickFilter(location.state.filter);
      
      if (location.state.filter === "low-stock") {
        const lowStockIds = inventoryArray
          .filter(item => item.stock < item.reorderPoint)
          .map(item => item.id);
        setSelectedRows(lowStockIds);
      }
    }
  }, [location.state, inventoryArray]);

  const thresholds = { low: 30, critical: 10, max: 100 };

  // Interaction State
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [viewItemId, setViewItemId] = useState<number | null>(null);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState<string>("");
  const [editPrice, setEditPrice] = useState<string>("");
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [stockUpOpen, setStockUpOpen] = useState(false);
  const [pinnedItems, setPinnedItems] = useState<Set<number>>(new Set());

  // Form State
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formStock, setFormStock] = useState("");
  const [formPrice, setFormPrice] = useState("");

  const filteredItems = useMemo(() => {
    let arr = inventoryArray.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      
      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && item.createdAt >= new Date(dateFrom).toISOString();
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && item.createdAt <= end.toISOString();
      }

      let matchesQuickFilter = true;
      if (quickFilter === "in-stock") matchesQuickFilter = item.stock > 0;
      else if (quickFilter === "low-stock") matchesQuickFilter = item.stock >= thresholds.critical && item.stock < thresholds.low;
      else if (quickFilter === "critical") matchesQuickFilter = item.stock < thresholds.critical;

      return matchesSearch && matchesCategory && matchesDate && matchesQuickFilter;
    });

    // Pinned logic: pinned items first
    arr = [...arr].sort((a, b) => {
      const aPinned = pinnedItems.has(a.id);
      const bPinned = pinnedItems.has(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

    if (sortConfig.key !== "none") {
      arr = [...arr].sort((a: any, b: any) => {
        // If one is pinned and other isn't, maintain pinned status first
        const aPinned = pinnedItems.has(a.id);
        const bPinned = pinnedItems.has(b.id);
        if (aPinned !== bPinned) return 0; 

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (typeof aValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      });
    }
    return arr;
  }, [inventoryArray, searchTerm, categoryFilter, dateFrom, dateTo, sortConfig, quickFilter, pinnedItems, thresholds]);

  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const metrics = useMemo(() => {
    const totalProducts = inventoryArray.length;
    const stockOnHand = inventoryArray.reduce((sum, item) => sum + item.stock, 0);
    const critical = inventoryArray.filter((item) => item.stock < thresholds.critical).length;
    const low = inventoryArray.filter((item) => item.stock >= thresholds.critical && item.stock < thresholds.low).length;
    return { totalProducts, stockOnHand, critical, low };
  }, [inventoryArray, thresholds]);

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const getStatusBadge = (item: any) => {
    const stock = item.stock;
    const expiryDate = item.expiryDate ? new Date(item.expiryDate) : null;
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expiryDate && expiryDate < today) {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }

    if (expiryDate && expiryDate <= thirtyDaysFromNow) {
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Expiring Soon
        </Badge>
      );
    }

    if (stock < thresholds.critical) {
      return (
        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Critical Stock
        </Badge>
      );
    }
    if (stock < thresholds.low) {
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Low Stock
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Healthy
      </Badge>
    );
  };

  const exportCsv = () => {
    const rows = [
      ["Product Name", "SKU", "Category", "Stock", "Status", "Price", "Created At"],
      ...filteredItems.map((i) => {
        const status = i.stock < thresholds.critical ? "Critical" : i.stock < thresholds.low ? "Low Stock" : "In Stock";
        return [i.name, i.sku, i.category, String(i.stock), status, String(i.price), i.createdAt];
      }),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportFile = (format: "csv" | "excel" | "pdf") => {
    if (format === "csv") {
      exportCsv();
      return;
    }
    
    // Excel Export
    if (format === "excel") {
      const data = filteredItems.map(i => ({
        "Product Name": i.name,
        "SKU": i.sku,
        "Category": i.category,
        "Stock Level": i.stock,
        "Status": i.stock < thresholds.critical ? "Critical" : i.stock < thresholds.low ? "Low Stock" : "Healthy",
        "Price": i.price
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
      XLSX.writeFile(wb, `SellSync_Inventory_${dateStr}.xlsx`);
      toast.success("Inventory exported as Excel");
      return;
    }

    // PDF Export
    if (format === "pdf") {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Inventory Status Report", 105, 15, { align: "center" });
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 25);

      const tableData = filteredItems.map(i => [
        i.name,
        i.sku,
        i.category,
        i.stock,
        formatCurrency(i.price),
        i.stock < thresholds.critical ? "CRITICAL" : i.stock < thresholds.low ? "LOW" : "Healthy"
      ]);

      (doc as any).autoTable({
        startY: 30,
        head: [["Product", "SKU", "Category", "Stock", "Price", "Status"]],
        body: tableData,
        headStyles: { fillColor: [79, 70, 229] }
      });

      doc.save(`inventory_report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Inventory exported to PDF");
    }
  };

  const onAddSubmit = () => {
    if (!formName || !formSku) return;
    addProduct({
      name: formName,
      sku: formSku,
      category: formCategory || "Retail",
      stock: Number(formStock) || 0,
      price: Number(formPrice) || 0,
      reorderPoint: 40,
      createdAt: new Date().toISOString(),
    });
    setAddOpen(false);
    setFormName(""); setFormSku(""); setFormCategory(""); setFormStock(""); setFormPrice("");
  };

  const handleBulkPin = () => {
    const nextPinned = new Set(pinnedItems);
    selectedRows.forEach(id => {
      if (nextPinned.has(id)) nextPinned.delete(id);
      else nextPinned.add(id);
    });
    setPinnedItems(nextPinned);
    setSelectedRows([]);
  };

  const handleBulkDelete = () => {
    selectedRows.forEach(id => deleteProduct(id));
    setSelectedRows([]);
  };

  const selectedView = viewItemId ? inventoryArray.find((i) => i.id === viewItemId) : null;

  return (
    <div className={`p-6 space-y-6 min-h-screen ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your product stock levels and inventory health</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => exportFile("excel")}
            className={`hidden sm:flex gap-2 ${theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white hover:bg-gray-800' : 'bg-white hover:bg-gray-50'}`}
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button onClick={() => setAddCatOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-100">
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className={`border-gray-200 shadow-sm cursor-pointer transition-all hover:ring-2 hover:ring-indigo-500/20 ${quickFilter === "all" ? "ring-2 ring-indigo-500" : ""} ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}
                onClick={() => setQuickFilter("all")}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Products</p>
                      <p className="text-3xl font-bold mt-1">{metrics.totalProducts}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-green-600 font-medium">+12%</span>
                    <span>this month</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Click to see all products</TooltipContent>
          </Tooltip>

          <TooltipProvider>
            <Card 
              className={`border-gray-200 shadow-sm cursor-pointer transition-all hover:ring-2 hover:ring-indigo-500/20 ${quickFilter === "in-stock" ? "ring-2 ring-indigo-500" : ""} ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}
              onClick={() => setQuickFilter("in-stock")}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Stock on Hand</p>
                    <p className="text-3xl font-bold mt-1">{metrics.stockOnHand.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <span className="text-red-600 font-medium">-3%</span>
                  <span>vs last week</span>
                </div>
              </CardContent>
            </Card>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className={`border-gray-200 shadow-sm cursor-pointer transition-all hover:ring-2 hover:ring-indigo-500/20 ${quickFilter === "low-stock" ? "ring-2 ring-indigo-500" : ""} ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}
                  onClick={() => setQuickFilter("low-stock")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Low Stock</p>
                        <p className="text-3xl font-bold mt-1">{metrics.low}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-yellow-700">
                      <span className="font-medium">5-30 units</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Low: 10–29 units</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card 
                  className={`border-gray-200 shadow-sm cursor-pointer transition-all hover:ring-2 hover:ring-indigo-500/20 ${quickFilter === "critical" ? "ring-2 ring-indigo-500" : ""} ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}
                  onClick={() => setQuickFilter("critical")}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Critical</p>
                        <p className="text-3xl font-bold mt-1">{metrics.critical}</p>
                      </div>
                      <div className={`w-12 h-12 ${metrics.critical > 0 ? "bg-red-50" : "bg-gray-50"} rounded-xl flex items-center justify-center`}>
                        <AlertTriangle className={`w-6 h-6 ${metrics.critical > 0 ? "text-red-600 animate-pulse" : "text-gray-400"}`} />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm">
                      {metrics.critical > 0 ? (
                        <span className="text-red-600 font-bold">Urgent Attention</span>
                      ) : (
                        <span className="text-gray-500">All Healthy</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>Critical: &lt;10 units</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TooltipProvider>
      </div>

      {/* Intelligent Alert Banner */}
      {(metrics.low > 0 || metrics.critical > 0) && (
        <Card className={`${theme === 'dark' ? 'bg-orange-950/20 border-orange-900/30' : 'bg-orange-50 border-orange-100'} shadow-sm overflow-hidden`}>
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className={`text-sm font-bold ${theme === 'dark' ? 'text-orange-400' : 'text-orange-900'}`}>{metrics.critical + metrics.low} items need attention</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-orange-500/70' : 'text-orange-700'}`}>AI Suggestion: Reorder critical items now to prevent stockouts based on current sales velocity.</p>
              </div>
            </div>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white shrink-0 gap-2" onClick={() => setStockUpOpen(true)}>
              Stock Up
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className={`flex items-center gap-1 p-1 rounded-lg w-fit ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <Button
            variant={quickFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className={`px-4 rounded-md ${quickFilter === "all" ? (theme === 'dark' ? "bg-gray-800" : "bg-white shadow-sm") : ""}`}
            onClick={() => setQuickFilter("all")}
          >
            All
          </Button>
          <Button
            variant={quickFilter === "in-stock" ? "secondary" : "ghost"}
            size="sm"
            className={`px-4 rounded-md ${quickFilter === "in-stock" ? (theme === 'dark' ? "bg-gray-800" : "bg-white shadow-sm") : ""}`}
            onClick={() => setQuickFilter("in-stock")}
          >
            In Stock
          </Button>
          <Button
            variant={quickFilter === "low-stock" ? "secondary" : "ghost"}
            size="sm"
            className={`px-4 rounded-md ${quickFilter === "low-stock" ? (theme === 'dark' ? "bg-gray-800" : "bg-white shadow-sm") : ""}`}
            onClick={() => setQuickFilter("low-stock")}
          >
            Low Stock
          </Button>
          <Button
            variant={quickFilter === "critical" ? "secondary" : "ghost"}
            size="sm"
            className={`px-4 rounded-md ${quickFilter === "critical" ? (theme === 'dark' ? "bg-gray-800" : "bg-white shadow-sm") : ""}`}
            onClick={() => setQuickFilter("critical")}
          >
            Critical
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search product name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-9 border-none ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              className={`gap-2 ${filtersOpen ? "bg-indigo-50 border-indigo-200 text-indigo-700" : ""} ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : ''}`}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <Card className={`border-gray-200 shadow-sm relative overflow-hidden ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white'}`}>
        {selectedRows.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-14 bg-indigo-600 text-white flex items-center px-6 justify-between z-10 animate-in slide-in-from-top duration-200">
            <span className="font-medium">{selectedRows.length} items selected</span>
            <div className="flex items-center gap-3">
              {selectedRows.length === 1 ? (
                <>
                  <Button variant="ghost" className="text-white hover:bg-white/10 gap-2" onClick={() => setEditItemId(selectedRows[0])}>
                    <Plus className="w-4 h-4" />
                    Edit Stock
                  </Button>
                  <Button variant="ghost" className="text-white hover:bg-white/10 gap-2" onClick={() => setEditItemId(selectedRows[0])}>
                    <Tag className="w-4 h-4" />
                    Edit Price
                  </Button>
                </>
              ) : (
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10 gap-2" 
                  onClick={handleBulkPin}
                >
                  <Pin className="w-4 h-4" />
                  Pin to Top
                </Button>
              )}
              <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 text-red-100" onClick={() => {
                if (selectedRows.length === 1) setDeleteItemId(selectedRows[0]);
                else handleBulkDelete();
              }}>
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setSelectedRows([])}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className={`${theme === 'dark' ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50/50 border-gray-100'}`}>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedRows.length === paginatedItems.length && paginatedItems.length > 0}
                      onCheckedChange={(checked) => {
                        setSelectedRows(checked ? paginatedItems.map(i => i.id) : []);
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead className="cursor-pointer hover:text-indigo-600 transition-colors group" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      Product Name
                      {sortConfig.key === "name" ? (sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-indigo-600 transition-colors group" onClick={() => handleSort("sku")}>
                    <div className="flex items-center gap-1">
                      SKU
                      {sortConfig.key === "sku" ? (sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-48 cursor-pointer hover:text-indigo-600 transition-colors group" onClick={() => handleSort("stock")}>
                    <div className="flex items-center gap-1">
                      Stock Level
                      {sortConfig.key === "stock" ? (sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-indigo-600 transition-colors group" onClick={() => handleSort("price")}>
                    <div className="flex items-center gap-1 justify-end">
                      Price
                      {sortConfig.key === "price" ? (sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />) : <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />}
                    </div>
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Package className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm">Try adjusting your filters or search term</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => {
                    const stockPercent = Math.min(100, (item.stock / thresholds.max) * 100);
                    const stockColor = item.stock < thresholds.critical ? "bg-red-500" : item.stock < thresholds.low ? "bg-yellow-500" : "bg-green-500";
                    const isPinned = pinnedItems.has(item.id);
                    const isHighlighted = highlightedId === item.id;
                    
                    return (
                      <TableRow 
                        key={item.id} 
                        id={`product-row-${item.id}`}
                        className={`group transition-all duration-500 ${isPinned ? (theme === 'dark' ? "bg-indigo-950/20" : "bg-indigo-50/30") : ""} ${isHighlighted ? (theme === 'dark' ? 'ring-2 ring-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.3)]' : 'ring-2 ring-indigo-500 bg-indigo-50 shadow-[0_0_15px_rgba(99,102,241,0.2)] scale-[1.01]') : ""} ${theme === 'dark' ? 'hover:bg-gray-800/50 border-gray-800' : 'hover:bg-gray-50/80 border-gray-100'}`}
                      >
                        <TableCell>
                          <Checkbox 
                            checked={selectedRows.includes(item.id)}
                            onCheckedChange={(checked) => {
                              setSelectedRows(prev => checked ? [...prev, item.id] : prev.filter(id => id !== item.id));
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`}>
                            {isPinned ? <Pin className="w-4 h-4 text-indigo-600" /> : <span className="text-gray-400 font-bold text-lg">{item.name[0]}</span>}
                          </div>
                        </TableCell>
                        <TableCell className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{item.name}</TableCell>
                        <TableCell className="text-gray-500 font-mono text-xs">{item.sku}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`font-normal ${theme === 'dark' ? 'border-gray-700 text-gray-400' : 'border-gray-200'}`}>{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-900'}>{item.stock} units</span>
                              <span className="text-gray-400">{thresholds.max} max</span>
                            </div>
                            <Progress value={stockPercent} className={`h-1.5 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`} indicatorClassName={stockColor} />
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                        <TableCell className="text-right font-black text-indigo-600">{formatCurrency(item.price)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" title="Actions" aria-label="Actions">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className={`w-48 ${theme === 'dark' ? 'bg-gray-900 border-gray-800 text-white' : 'bg-slate-900 text-white border-slate-700'}`}>
                                <DropdownMenuItem onClick={() => setViewItemId(item.id)} className="gap-2">
                                  <ExternalLink className="w-4 h-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setEditItemId(item.id); setEditStock(String(item.stock)); setEditPrice(String(item.price)); }} className="gap-2">
                                  <Plus className="w-4 h-4" /> Edit Stock/Price
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    const next = new Set(pinnedItems);
                                    if (next.has(item.id)) next.delete(item.id);
                                    else next.add(item.id);
                                    setPinnedItems(next);
                                  }} 
                                  className="gap-2"
                                >
                                  <Pin className="w-4 h-4" /> {isPinned ? "Unpin" : "Pin to Top"}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 gap-2" onClick={() => setDeleteItemId(item.id)}>
                                  <Trash2 className="w-4 h-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }).map((_, i) => (
              <Button
                key={i}
                variant={currentPage === i + 1 ? "default" : "outline"}
                className={`w-10 h-10 ${currentPage === i + 1 ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Sheets & Dialogs */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Stock Status</label>
              <Select value={quickFilter} onValueChange={(v: any) => setQuickFilter(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in-stock">In Stock</SelectItem>
                  <SelectItem value="low-stock">Low Stock</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">From</label>
                <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">To</label>
                <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="pt-6 border-t flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => {
                setCategoryFilter("all"); setQuickFilter("all"); setDateFrom(""); setDateTo("");
              }}>Reset</Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => setFiltersOpen(false)}>Apply Filters</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Product Name</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Pain Relief Tablets" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SKU</label>
              <Input value={formSku} onChange={e => setFormSku(e.target.value)} placeholder="MED-001" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="new">+ Add New Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Stock</label>
              <Input type="number" value={formStock} onChange={e => setFormStock(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Price ({currency.symbol})</label>
              <Input type="number" step="0.01" value={formPrice} onChange={e => setFormPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={onAddSubmit}>Create Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={viewItemId !== null} onOpenChange={(o) => !o && setViewItemId(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Product Details</DialogTitle>
          </DialogHeader>
          {selectedView && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Name</p>
                  <p className="text-lg font-medium">{selectedView.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">SKU</p>
                  <p className="text-lg font-medium font-mono">{selectedView.sku}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Category</p>
                  <p className="text-lg font-medium">{selectedView.category}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Current Stock</p>
                  <p className="text-lg font-medium">{selectedView.stock} units</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Price</p>
                  <p className="text-lg font-medium font-bold text-indigo-400">{formatCurrency(selectedView.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider">Reorder Point</p>
                  <p className="text-lg font-medium">{selectedView.reorderPoint} units</p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Created At</p>
                <p className="text-sm">{new Date(selectedView.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => setViewItemId(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Stock/Price Modal */}
      <Dialog open={editItemId !== null} onOpenChange={(o) => !o && setEditItemId(null)}>
        <DialogContent className="bg-slate-900 text-white border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Stock Quantity</label>
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                  onClick={() => setEditStock(prev => String(Math.max(0, Number(prev) - 1)))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <Input 
                  type="number" 
                  className="bg-slate-800 border-slate-700 text-white text-center text-lg font-bold"
                  value={editStock}
                  onChange={(e) => setEditStock(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                  onClick={() => setEditStock(prev => String(Number(prev) + 1))}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Product Price ({currency.symbol})</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{currency.symbol}</span>
                <Input 
                  type="number" 
                  step="0.01"
                  className="bg-slate-800 border-slate-700 text-white pl-8"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setEditItemId(null)}>Cancel</Button>
            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              if (editItemId !== null) {
                setProductStock(editItemId, Number(editStock));
                setProductPrice(editItemId, Number(editPrice));
                setEditItemId(null);
              }
            }}>Update Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Up / Reorder Modal */}
      <Dialog open={stockUpOpen} onOpenChange={setStockUpOpen}>
        <DialogContent className="bg-slate-900 text-white border-slate-700 sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Stock Up Required</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-4">
              {inventoryArray
                .filter(i => i.stock < thresholds.low)
                .sort((a, b) => a.stock - b.stock)
                .map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700">
                    <div className="space-y-1">
                      <p className="font-medium">{item.name}</p>
                      <div className="flex items-center gap-2">
                        <Badge className={item.stock < thresholds.critical ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"}>
                          {item.stock} in stock
                        </Badge>
                        <span className="text-xs text-slate-400">Target: {thresholds.max}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 mr-2">Add Stock:</label>
                      <Input 
                        type="number" 
                        className="w-24 bg-slate-800 border-slate-700 text-white text-center"
                        defaultValue={thresholds.max - item.stock}
                        id={`stock-up-${item.id}`}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter className="gap-2 pt-4">
            <Button variant="outline" className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800" onClick={() => setStockUpOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => {
              inventoryArray
                .filter(i => i.stock < thresholds.low)
                .forEach(item => {
                  const input = document.getElementById(`stock-up-${item.id}`) as HTMLInputElement;
                  if (input && input.value) {
                    setProductStock(item.id, item.stock + Number(input.value));
                  }
                });
              setStockUpOpen(false);
            }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
        <DialogContent className="bg-slate-900 text-white border-slate-700 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Category Name</label>
              <Input 
                className="h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500/20" 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                placeholder="e.g. Wellness" 
              />
            </div>
            <Button className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all" onClick={() => {
              if (newCategoryName.trim()) {
                addCategory(newCategoryName.trim());
                setNewCategoryName("");
                setAddCatOpen(false);
                toast.success("Category added successfully");
              }
            }}>
              Add Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteItemId !== null} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600">Are you sure you want to delete this product? This action cannot be undone and will remove all associated stock data.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteItemId(null)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => {
              if (deleteItemId !== null) deleteProduct(deleteItemId);
              setDeleteItemId(null);
            }}>Delete Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
