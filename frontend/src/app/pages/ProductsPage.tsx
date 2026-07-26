import {
  Calendar,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Package,
  TrendingUp,
  DollarSign,
  BarChart3,
  Plus,
  Download,
  Search,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  TrendingDown,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
import { Checkbox } from "../components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../state/store";
import { QrGeneratorModal } from "../components/QrGeneratorModal";
import { AddProductModal } from "../components/AddProductModal";
import { ProductDetailModal } from "../components/ProductDetailModal";
import { QrCode } from "lucide-react";

export function ProductsPage() {
  const { inventoryArray, transactions, categories, addProduct, updateProduct, deleteProduct, currency, formatCurrency } = useStore();
  const location = useLocation();
  const [rangeLine, setRangeLine] = useState<"day" | "week" | "month" | "year">("week");
  const [rangeBar, setRangeBar] = useState<"hour" | "day" | "week" | "month">("day");
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Handle incoming navigation (e.g. from Notifications or Dashboard)
  useEffect(() => {
    if (location.state?.productId) {
      const product = inventoryArray.find(p => p.id === location.state.productId);
      if (product) {
        setSearchTerm(product.name);
      }
    }
  }, [location.state, inventoryArray]);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | "none" }>({
    key: "none",
    direction: "none",
  });
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isAddModalOpen, setIsAddProductOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProductForQr, setSelectedProductForForQr] = useState<any>(null);
  const [selectedProductForEdit, setSelectedProductForEdit] = useState<any>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<any>(null);

  const totalProducts = inventoryArray.length;
  const categoriesCount = categories.length;

  const groupByDate = (tx: typeof transactions) => {
    const map: Record<string, number> = {};
    for (const t of tx || []) {
      if (!t.datetime) continue;
      const d = t.datetime.slice(0, 10);
      map[d] = (map[d] || 0) + t.amount;
    }
    return map;
  };

  const withinRange = (d: Date, unit: "day" | "week" | "month" | "year" | "hour") => {
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hour = 3600 * 1000;
    const day = 24 * hour;
    if (unit === "hour") return diff <= hour;
    if (unit === "day") return diff <= day;
    if (unit === "week") return diff <= 7 * day;
    if (unit === "month") return diff <= 30 * day;
    if (unit === "year") return diff <= 365 * day;
    return true;
  };

  const filteredForLine = useMemo(
    () => transactions.filter((t) => withinRange(new Date(t.datetime), rangeLine)),
    [transactions, rangeLine],
  );
  const filteredForBar = useMemo(
    () => (transactions || []).filter((t) => withinRange(new Date(t.datetime || new Date().toISOString()), rangeBar)),
    [transactions, rangeBar],
  );

  const highestDailySales = useMemo(() => {
    const grouped = groupByDate(transactions);
    return Object.values(grouped).reduce((m, v) => Math.max(m, v), 0) || 0;
  }, [transactions]);

  const totalRevenueToday = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return transactions.filter((t) => t.datetime.startsWith(today)).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const avgProductValue = useMemo(() => {
    if (totalProducts === 0) return 0;
    const totalVal = inventoryArray.reduce((s, p) => s + p.price, 0);
    return totalVal / totalProducts;
  }, [inventoryArray, totalProducts]);

  const salesHistoryData = useMemo(() => {
    const grouped = groupByDate(filteredForLine);
    const data = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, sales]) => ({ label: date, sales }));
    return data;
  }, [filteredForLine]);

  const topProductsByRevenue = useMemo(() => {
    const revenueByProduct: Record<number, number> = {};
    for (const t of filteredForBar) {
      for (const it of t.items) {
        revenueByProduct[it.productId] = (revenueByProduct[it.productId] || 0) + it.qty * it.price;
      }
    }
    const rows = Object.entries(revenueByProduct).map(([id, value]) => {
      const prod = inventoryArray.find((p) => p.id === Number(id));
      return { name: prod?.name ?? `#${id}`, value };
    });
    rows.sort((a, b) => b.value - a.value);
    return rows.slice(0, 5);
  }, [filteredForBar, inventoryArray]);

  const productList = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const soldTodayMap: Record<number, number> = {};
    const totalSoldMap: Record<number, number> = {};

    for (const t of transactions) {
      const isToday = t.datetime.startsWith(today);
      for (const it of t.items) {
        if (isToday) soldTodayMap[it.productId] = (soldTodayMap[it.productId] || 0) + it.qty;
        totalSoldMap[it.productId] = (totalSoldMap[it.productId] || 0) + it.qty;
      }
    }

    let arr = inventoryArray.map((p) => ({
      ...p,
      soldToday: soldTodayMap[p.id] || 0,
      totalSold: totalSoldMap[p.id] || 0,
    }));

    // Filtering
    arr = arr.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    // Sorting
    if (sortConfig.key !== "none") {
      arr.sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (typeof aVal === "string") {
          return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return arr;
  }, [inventoryArray, transactions, searchTerm, categoryFilter, sortConfig]);

  const getExpiryBadge = (p: any) => {
    const badges = [];
    
    // Low Stock Check
    if (p.stock <= (p.reorderPoint || 0)) {
      badges.push(
        <Badge key="low-stock" className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 gap-1 px-2 py-0.5">
          <AlertTriangle className="w-3 h-3" /> Low Stock ({p.stock})
        </Badge>
      );
    }

    if (p.expiryDate) {
      const expiryDate = new Date(p.expiryDate);
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      if (expiryDate < today) {
        badges.push(
          <Badge key="expired" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200 gap-1 px-2 py-0.5">
            <XCircle className="w-3 h-3" /> Expired
          </Badge>
        );
      } else if (expiryDate <= thirtyDaysFromNow) {
        badges.push(
          <Badge key="expiring" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200 gap-1 px-2 py-0.5">
            <AlertTriangle className="w-3 h-3" /> Expiring
          </Badge>
        );
      } else {
        badges.push(
          <Badge key="healthy" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 px-2 py-0.5">
            <CheckCircle2 className="w-3 h-3" /> Healthy
          </Badge>
        );
      }
    }
    
    return <div className="flex flex-col gap-1">{badges}</div>;
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">Product catalog and performance analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="gap-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
            onClick={() => {
              setSelectedProductForForQr(null);
              setIsGeneratorOpen(true);
            }}
          >
            <QrCode className="w-4 h-4" />
            Generate QR
          </Button>
          <Button 
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            onClick={() => {
              setSelectedProductForEdit(null);
              setIsAddProductOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalProducts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="text-green-600 font-medium flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +2
              </span>
              <span className="text-gray-500">this week</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Highest Daily Sales</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {highestDailySales > 0 ? formatCurrency(highestDailySales) : "—"}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              {highestDailySales > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600 font-medium">+5%</span>
                  <span>vs avg</span>
                </>
              ) : (
                "No sales data yet"
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Product Value</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {avgProductValue > 0 ? formatCurrency(avgProductValue) : "—"}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-red-600 font-medium">-2%</span>
              <span>vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{categoriesCount}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
              <span className="font-medium">6 active</span>
              <span className="text-gray-300">•</span>
              <span>2 unused</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-semibold text-gray-900">Sales History</CardTitle>
            <Select value={rangeLine} onValueChange={(v) => setRangeLine(v as any)}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-gray-50">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {salesHistoryData.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <BarChart3 className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">No sales recorded for this period</p>
              </div>
            ) : (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesHistoryData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                      dataKey="label"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#9ca3af" }}
                    />
                    <YAxis
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#9ca3af" }}
                      tickFormatter={(v) => formatCurrency(v)}
                    />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg font-semibold text-gray-900">Top Products (Revenue)</CardTitle>
            <Select value={rangeBar} onValueChange={(v) => setRangeBar(v as any)}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-gray-50">
                <SelectValue placeholder="Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hour">Last Hour</SelectItem>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {topProductsByRevenue.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <TrendingUp className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm font-medium">Start selling to unlock performance data</p>
              </div>
            ) : (
              <div className="h-[250px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsByRevenue} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                      tick={{ fill: "#4b5563", fontWeight: 500 }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "#f9fafb" }}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Product Table Section */}
      <Card className="border-gray-200 shadow-sm relative overflow-hidden">
        {selectedRows.length > 0 && (
          <div className="absolute top-0 left-0 right-0 h-14 bg-indigo-600 text-white flex items-center px-6 justify-between z-10 animate-in slide-in-from-top duration-200">
            <span className="font-medium">{selectedRows.length} items selected</span>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-white hover:bg-white/10 gap-2">
                <Edit className="w-4 h-4" />
                Bulk Price Edit
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10 gap-2 text-red-100">
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
        <CardHeader className="border-b border-gray-100 bg-gray-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-gray-900">Products Catalog</CardTitle>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search name, SKU, category..."
                  className="pl-9 h-9 bg-white"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-40 h-9 bg-white">
                  <Filter className="w-3.5 h-3.5 mr-2 opacity-50" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.length === productList.length && productList.length > 0}
                      onCheckedChange={(checked) => {
                        setSelectedRows(checked ? productList.map((p) => p.id) : []);
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-16">Image</TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-indigo-600 transition-colors group"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-1">
                      Product Name
                      {sortConfig.key === "name" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:text-indigo-600 transition-colors group"
                    onClick={() => handleSort("sku")}
                  >
                    <div className="flex items-center gap-1">
                      SKU
                      {sortConfig.key === "sku" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-indigo-600 transition-colors group"
                    onClick={() => handleSort("price")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Price
                      {sortConfig.key === "price" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:text-indigo-600 transition-colors group"
                    onClick={() => handleSort("soldToday")}
                  >
                    <div className="flex items-center gap-1 justify-end">
                      Sold Today
                      {sortConfig.key === "soldToday" ? (
                        sortConfig.direction === "asc" ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )
                      ) : (
                        <ChevronDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Total Sold</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <Package className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm">Try adjusting your filters or add your first product</p>
                        <Button className="mt-4 bg-indigo-600 text-white hover:bg-indigo-700">
                          + Add Product
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  productList.map((p) => (
                    <TableRow key={p.id} className="group hover:bg-gray-50/80 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedRows.includes(p.id)}
                          onCheckedChange={(checked) => {
                            setSelectedRows((prev) =>
                              checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                          {p.name[0]}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">{p.name}</TableCell>
                      <TableCell className="text-gray-500 font-mono text-xs">{p.sku}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal border-gray-200">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-900">
                        {formatCurrency(p.price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-gray-600">
                            {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "—"}
                          </span>
                          {getExpiryBadge(p)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="font-medium">{p.soldToday}</span>
                          {p.soldToday > 0 && <TrendingUp className="w-3 h-3 text-green-500" />}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-gray-600">
                        {p.totalSold}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2" onClick={() => {
                              setSelectedProductForDetail(p);
                              setIsDetailModalOpen(true);
                            }}>
                              <Eye className="w-4 h-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => {
                              setSelectedProductForForQr(p);
                              setIsGeneratorOpen(true);
                            }}>
                              <QrCode className="w-4 h-4" /> Generate QR
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2" onClick={() => {
                              setSelectedProductForEdit(p);
                              setIsAddProductOpen(true);
                            }}>
                              <Edit className="w-4 h-4" /> Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 gap-2" onClick={() => deleteProduct(p.id)}>
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Intelligent Insights Layer */}
      {productList.length > 0 && (
        <Card className="bg-indigo-50 border-indigo-100 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-indigo-900">Opportunity Identified</p>
                <p className="text-xs text-indigo-700">
                  {productList[0].name} has seen a 15% sales increase today. Consider promoting it on
                  your storefront or adding it to a featured collection.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 gap-2"
            >
              Promote Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddProductOpen(false)}
        product={selectedProductForEdit}
        onSave={(data) => {
          if (selectedProductForEdit) {
            updateProduct({ ...selectedProductForEdit, ...data });
          } else {
            addProduct({
              name: data.name,
              sku: data.sku,
              price: data.price,
              category: data.category,
              stock: data.stock,
              reorderPoint: data.reorderPoint,
              createdAt: new Date().toISOString(),
              manufacturedDate: data.manufacturedDate,
              expiryDate: data.expiryDate,
              costPrice: data.costPrice,
              supplier: data.supplier,
              barcode: data.barcode,
            });
          }
        }}
      />

      <QrGeneratorModal 
        isOpen={isGeneratorOpen} 
        onClose={() => setIsGeneratorOpen(false)} 
        product={selectedProductForQr}
      />

      <ProductDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        product={selectedProductForDetail}
      />
    </div>
  );
}
