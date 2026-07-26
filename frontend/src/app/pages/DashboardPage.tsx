import { useMemo, useState, useEffect, useRef } from "react";
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ChevronRight,
  RefreshCcw,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { staggerContainer, fadeInUp } from "../../animations/variants";
import { useNavigate } from "react-router-dom";

import { useStore, TopProduct } from "../state/store";

// Animated Counter Component
function AnimatedNumber({ value, formatter }: { value: number, formatter: (v: number) => string }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const [displayValue, setDisplayValue] = useState("");

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return spring.on("change", (latest: number) => {
      setDisplayValue(formatter(Math.floor(latest)));
    });
  }, [spring, formatter]);

  // Initial value
  useEffect(() => {
    setDisplayValue(formatter(value));
  }, [formatter, value]);

  return <motion.span>{displayValue}</motion.span>;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { theme, kpis, inventoryArray, currency, salesTrend, topProducts, dynamicInsights, formatCurrency, analytics, inventory } = useStore();
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const chartData = useMemo(() => {
    if (analytics.dailySales && analytics.dailySales.length > 0) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return analytics.dailySales.slice(-7).map(item => ({
        day: days[new Date(item.date).getDay()],
        sales: item.revenue
      }));
    }
    if (salesTrend && salesTrend.length > 0) return salesTrend;
    return [
      { day: "Sun", sales: 0 }, { day: "Mon", sales: 0 }, { day: "Tue", sales: 0 },
      { day: "Wed", sales: 0 }, { day: "Thu", sales: 0 }, { day: "Fri", sales: 0 }, { day: "Sat", sales: 0 }
    ];
  }, [analytics.dailySales, salesTrend]);

  const displayTopProducts = useMemo(() => {
    if (analytics.topProducts && analytics.topProducts.length > 0) {
      return analytics.topProducts.slice(0, 5).map((item, idx) => {
        const invItem = Object.values(inventory).find(p => p.name === item.productName);
        return {
          id: invItem?.id || idx,
          name: item.productName,
          unitsSold: item.unitsSold,
          revenue: invItem ? item.unitsSold * invItem.price : 0,
          stock: invItem?.stock || 0,
          stockStatus: (invItem?.stock || 0) < ((invItem?.reorderPoint || 0) / 2) ? "critical" : (invItem?.stock || 0) < (invItem?.reorderPoint || 0) ? "low" : "healthy"
        } as TopProduct;
      });
    }
    return topProducts || [];
  }, [analytics.topProducts, topProducts, inventory]);

  const lowStockItems = useMemo(() => {
    return inventoryArray
      .filter(item => item.stock < item.reorderPoint)
      .slice(0, 3);
  }, [inventoryArray]);

  const expiringSoonItems = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return inventoryArray
      .filter(item => item.expiryDate && new Date(item.expiryDate) <= thirtyDaysFromNow)
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
  }, [inventoryArray]);

  return (
    <div className={`p-8 space-y-8 min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-gray-50/50 text-gray-900'}`}>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
            <Badge className={`${theme === 'dark' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-100'} flex items-center gap-1.5 py-1 px-3`}>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Live Updates Active
            </Badge>
          </div>
          <p className="text-gray-500 font-medium">
            Welcome back! Here's what's happening in your store.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className={`h-10 w-10 rounded-xl transition-all shadow-sm ${theme === 'dark' ? 'bg-gray-900 border-gray-800 text-gray-400 hover:text-indigo-400' : 'bg-white border-gray-200 text-gray-400 hover:text-indigo-600'}`}
          onClick={() => setLastUpdated(new Date())}
        >
          <RefreshCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Expiry Alerts Card */}
      {expiringSoonItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={`${theme === 'dark' ? 'bg-red-950/20 border-red-900/30' : 'bg-red-50 border-red-100'} shadow-sm overflow-hidden`}>
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${theme === 'dark' ? 'text-red-400' : 'text-red-900'}`}>{expiringSoonItems.length} products expiring soon</p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-red-500/70' : 'text-red-700'}`}>Items expiring within 30 days require immediate review or markdown.</p>
                </div>
              </div>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white shrink-0 gap-2" onClick={() => navigate("/products")}>
                View Details
                <ArrowUpRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { 
            label: "Total Revenue Today", 
            value: kpis.totalRevenueToday, 
            change: `${kpis.totalRevenueTodayChange > 0 ? "+" : ""}${kpis.totalRevenueTodayChange}%`, 
            icon: DollarSign, 
            color: "text-green-600", 
            bg: "bg-green-50", 
            trend: kpis.totalRevenueTodayChange >= 0 ? "up" : "down",
            isCurrency: true
          },
          { 
            label: "Total Sales", 
            value: kpis.totalSalesToday, 
            change: `${kpis.totalSalesTodayChange > 0 ? "+" : ""}${kpis.totalSalesTodayChange}%`, 
            icon: ShoppingCart, 
            color: "text-blue-600", 
            bg: "bg-blue-50", 
            trend: kpis.totalSalesTodayChange >= 0 ? "up" : "down" 
          },
          { 
            label: "Low Stock Items", 
            value: kpis.lowStockCount, 
            change: `${kpis.lowStockCountChange} critical`, 
            icon: AlertTriangle, 
            color: "text-orange-600", 
            bg: "bg-orange-50", 
            trend: "down" 
          },
          { 
            label: "Products Sold", 
            value: kpis.productsSoldToday, 
            change: `${kpis.productsSoldTodayChange > 0 ? "+" : ""}${kpis.productsSoldTodayChange}%`, 
            icon: Package, 
            color: "text-purple-600", 
            bg: "bg-purple-50", 
            trend: kpis.productsSoldTodayChange >= 0 ? "up" : "down" 
          },
        ].map((kpi, i) => (
          <motion.div key={i} variants={fadeInUp}>
            <Card className={`border-none shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${kpi.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold border-gray-100 flex items-center gap-1 ${theme === 'dark' ? 'text-gray-500 border-gray-800' : 'text-gray-400 border-gray-100'}`}>
                    <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                    LIVE
                  </Badge>
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black tracking-tight">
                      <AnimatedNumber 
                        value={kpi.value} 
                        formatter={kpi.isCurrency ? formatCurrency : (v) => v.toLocaleString()} 
                      />
                    </h3>
                    <div className={`flex items-center gap-0.5 text-xs font-bold ${kpi.trend === "up" ? "text-green-600" : "text-orange-600"}`}>
                      {kpi.trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {kpi.change}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Charts and Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <Card className={`lg:col-span-2 border-none shadow-sm rounded-[2rem] overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
          <CardHeader className="p-8 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Sales Trend</CardTitle>
                <p className="text-sm text-gray-500 font-medium">Last 7 days performance ({currency.symbol})</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-6 min-w-0 min-h-0">
            <div className="h-[300px] w-full min-w-0 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1f2937' : '#f3f4f6'} />
                  <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} dy={10} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${currency.symbol}${v >= 1000 ? (v / 1000) + 'k' : v}`} stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      backgroundColor: theme === 'dark' ? '#111827' : '#fff',
                      color: theme === 'dark' ? '#fff' : '#000'
                    }}
                    itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                    formatter={(v) => [formatCurrency(v as number), "Revenue"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#6366F1" 
                    strokeWidth={4} 
                    dot={{ fill: "#6366F1", r: 4, strokeWidth: 2, stroke: theme === 'dark' ? '#111827' : 'white' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights Panel */}
        <Card className={`border-none shadow-sm rounded-[2rem] overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              AI Insights
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 py-0 px-2 flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                New
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-4">
            <AnimatePresence mode="popLayout">
              {dynamicInsights.map((insight) => {
                const Icon = insight.type === "warning" ? AlertTriangle : insight.type === "success" ? TrendingUp : ShoppingCart;
                return (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    layout
                    className={`p-4 rounded-2xl border flex gap-3 group cursor-default transition-all ${
                      insight.type === "warning"
                        ? `${theme === 'dark' ? 'bg-orange-950/20 border-orange-900/30' : 'bg-orange-50/50 border-orange-100'} hover:bg-orange-50`
                        : insight.type === "success"
                        ? `${theme === 'dark' ? 'bg-green-950/20 border-green-900/30' : 'bg-green-50/50 border-green-100'} hover:bg-green-50`
                        : `${theme === 'dark' ? 'bg-blue-950/20 border-blue-900/30' : 'bg-blue-50/50 border-blue-100'} hover:bg-blue-50`
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-12 ${
                      insight.type === "warning" ? "bg-orange-100" : insight.type === "success" ? "bg-green-100" : "bg-blue-100"
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        insight.type === "warning" ? "text-orange-600" : insight.type === "success" ? "text-green-600" : "text-blue-600"
                      }`} />
                    </div>
                    <p className={`text-sm font-semibold leading-snug ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{insight.message}</p>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <Button 
              variant="outline" 
              className={`w-full h-12 rounded-xl font-bold gap-2 transition-all mt-4 ${theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white' : 'border-gray-200 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200'}`}
              onClick={() => navigate("/insights")}
            >
              <ArrowUpRight className="w-4 h-4" />
              View All Insights
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products Table */}
        <Card className={`border-none shadow-sm rounded-[2rem] overflow-hidden ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-black">Top Products</CardTitle>
            <p className="text-sm text-gray-500 font-medium">Top five best selling products</p>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className={`hover:bg-transparent border-gray-50 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-800' : 'bg-gray-50/50'}`}>
                  <TableHead className="px-8 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px]">Product</TableHead>
                  <TableHead className="py-4 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">Units</TableHead>
                  <TableHead className="py-4 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">Revenue</TableHead>
                  <TableHead className="px-8 py-4 font-black text-gray-400 uppercase tracking-widest text-[10px] text-right">Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {displayTopProducts.map((product) => (
                    <motion.tr 
                      key={product.id} 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`group transition-colors border-b cursor-pointer ${theme === 'dark' ? 'hover:bg-gray-800/50 border-gray-800' : 'hover:bg-gray-50/50 border-gray-50'}`}
                      onClick={() => navigate("/products", { state: { productId: product.id } })}
                    >
                      <TableCell className="px-8 py-4">
                        <span className={`font-bold transition-colors ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'} group-hover:text-indigo-600`}>
                          {product.name}
                        </span>
                      </TableCell>
                      <TableCell className={`py-4 text-right font-black ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>{product.unitsSold}</TableCell>
                      <TableCell className="py-4 text-right font-black text-indigo-600">{formatCurrency(product.revenue)}</TableCell>
                      <TableCell className="px-8 py-4 text-right">
                        <Badge
                          className={`font-black px-3 py-1 rounded-lg ${
                            product.stockStatus === "critical"
                              ? "bg-red-50 text-red-700 border-red-100"
                              : product.stockStatus === "low"
                              ? "bg-orange-50 text-orange-700 border-orange-100"
                              : "bg-green-50 text-green-700 border-green-100"
                          }`}
                        >
                          {product.stock}
                        </Badge>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className={`border-none shadow-sm rounded-[2rem] overflow-hidden flex flex-col ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'}`}>
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Low Stock Alert</CardTitle>
                <p className="text-sm text-gray-500 font-medium">Items need restocking soon</p>
              </div>
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 flex-1 space-y-3">
            <AnimatePresence mode="popLayout">
              {lowStockItems.length > 0 ? (
                lowStockItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${theme === 'dark' ? 'bg-gray-900 border-gray-800 hover:border-indigo-500/50' : 'bg-gray-50 border-gray-100 hover:border-indigo-200'}`}
                    onClick={() => navigate("/inventory", { state: { filter: "low-stock", productId: item.id } })}
                  >
                    <div className="flex-1">
                      <p className={`font-bold group-hover:text-indigo-600 transition-colors ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                        Reorder point: {item.reorderPoint}
                      </p>
                    </div>
                    <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 font-black px-4 h-8 rounded-xl shadow-lg shadow-red-100">
                      {item.stock} left
                    </Badge>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="font-bold text-gray-500">All stock levels healthy!</p>
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


//  Continue  opencode -s ses_2a128c69bffeRUTDTnpMEhbxjs