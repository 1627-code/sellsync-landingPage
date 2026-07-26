import { useMemo, useState } from "react";
import {
  Receipt,
  Calendar,
  CreditCard,
  Download,
  Filter,
  Search,
  ChevronRight,
  Banknote,
  Wallet,
  Calculator,
  ArrowRight,
  TrendingUp,
  MoreVertical,
  Printer,
  Mail,
  Undo2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Eye,
  Terminal,
  X,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Checkbox } from "../components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { useStore } from "../state/store";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import { generateReceiptPDF, downloadReceiptPDF } from "../../lib/receipt";
import { EmailShareModal } from "../components/EmailShareModal";

export function TransactionsPage() {
  const { transactions, inventory, refundTransaction, currency, currentStore, currentUser, formatCurrency } = useStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [dateOpen, setDateOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" }>({
    key: "datetime",
    direction: "desc",
  });

  // Modal states for actions
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [transactionToEmail, setTransactionToEmail] = useState<any>(null);
  const [isRefundConfirmOpen, setIsRefundConfirmOpen] = useState(false);
  const [transactionToRefund, setTransactionToRefund] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  const handleRefund = (id: string) => {
    setTransactionToRefund(id);
    setIsRefundConfirmOpen(true);
  };

  const confirmRefund = () => {
    if (transactionToRefund) {
      refundTransaction(transactionToRefund);
      toast.success("Sale refunded and stock restored", {
        description: `Transaction ${transactionToRefund} has been reversed.`
      });
      setIsRefundConfirmOpen(false);
      setTransactionToRefund(null);
    }
  };

  const handleReprint = (txn: any) => {
    if (!txn) {
      toast.error("Transaction data missing");
      return;
    }
    
    try {
      const items = (txn.items || []).map((it: any) => {
        const invItem = inventory[it.productId];
        return {
          name: invItem?.name ?? `#${it.productId}`,
          sku: invItem?.sku ?? "N/A",
          qty: it.qty,
          price: it.price,
          manufacturedDate: invItem?.manufacturedDate,
          expiryDate: invItem?.expiryDate
        };
      });

      const blob = generateReceiptPDF({
        store: currentStore,
        transactionId: txn.id,
        date: new Date(txn.datetime).toLocaleString("en-GB"),
        cashier: txn.cashier || "System",
        customer: txn.customer || "Guest Customer",
        items,
        subtotal: txn.subtotal,
        discount: txn.discount,
        total: txn.amount,
        paymentMethod: txn.payment,
        currency,
      });
      downloadReceiptPDF(blob, txn.id);
    } catch (err) {
      console.error("Reprint failed:", err);
      toast.error("Could not reprint receipt");
    }
  };

  const handleEmailReceipt = (txn: any) => {
    if (!txn) {
      toast.error("Transaction data missing");
      return;
    }

    try {
      const items = (txn.items || []).map((it: any) => {
        const invItem = inventory[it.productId];
        return {
          name: invItem?.name ?? `#${it.productId}`,
          sku: invItem?.sku ?? "N/A",
          qty: it.qty,
          price: it.price,
          manufacturedDate: invItem?.manufacturedDate,
          expiryDate: invItem?.expiryDate
        };
      });

      const blob = generateReceiptPDF({
        store: currentStore,
        transactionId: txn.id,
        date: new Date(txn.datetime).toLocaleString("en-GB"),
        cashier: txn.cashier || "System",
        customer: txn.customer || "Guest Customer",
        items,
        subtotal: txn.subtotal,
        discount: txn.discount,
        total: txn.amount,
        paymentMethod: txn.payment,
        currency,
      });

      setTransactionToEmail({ ...txn, blob });
      setIsEmailModalOpen(true);
    } catch (err) {
      console.error("Email preparation failed:", err);
      toast.error("Could not prepare receipt for email");
    }
  };

  const handleBulkRefund = () => {
    if (selectedRows.size === 0) return;
    if (window.confirm(`Are you sure you want to refund ${selectedRows.size} transactions?`)) {
      selectedRows.forEach(id => refundTransaction(id));
      setSelectedRows(new Set());
    }
  };

  const filteredTransactions = useMemo(() => {
    let list = transactions.filter((txn) => {
      const idMatch = txn.id.toLowerCase().includes(searchTerm.toLowerCase());
      const custMatch = (txn.customer ?? "").toLowerCase().includes(searchTerm.toLowerCase());
      const amountMatch = txn.amount.toString().includes(searchTerm);
      const matchesSearch = idMatch || custMatch || amountMatch;

      const normalizedPayment = txn.payment === "Linked Account" ? "Card" : txn.payment;
      const matchesPayment = paymentFilter === "all" || normalizedPayment === paymentFilter;
      const matchesStatus = statusFilter === "all" || txn.status === statusFilter;

      let matchesDate = true;
      if (dateFrom) {
        matchesDate = matchesDate && txn.datetime >= new Date(dateFrom).toISOString();
      }
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && txn.datetime <= end.toISOString();
      }
      return matchesSearch && matchesPayment && matchesStatus && matchesDate;
    });

    if (sortConfig.key) {
      list = [...list].sort((a: any, b: any) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (sortConfig.direction === "asc") return aVal > bVal ? 1 : -1;
        return aVal < bVal ? 1 : -1;
      });
    }

    return list;
  }, [transactions, searchTerm, paymentFilter, statusFilter, dateFrom, dateTo, sortConfig]);

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTx = transactions.filter((t) => t.datetime.startsWith(today));
    
    const cardTotal = transactions.filter((t) => t.payment === "Linked Account" || t.payment === "POS Terminal").reduce((s, t) => s + t.amount, 0);
    const cashTotal = transactions.filter((t) => t.payment === "Cash").reduce((s, t) => s + t.amount, 0);
    const transferTotal = transactions.filter((t) => t.payment === "Transfer").reduce((s, t) => s + t.amount, 0);
    const refundedCount = transactions.filter((t) => t.status === "Refunded").length;
    
    // Simple average over last 3 days with sales
    const last3Days = Array.from({ length: 3 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().slice(0, 10);
    });
    const last3DaysTotal = transactions
      .filter((t) => last3Days.includes(t.datetime.slice(0, 10)) && t.status !== "Refunded")
      .reduce((s, t) => s + t.amount, 0);
    const completedCount = transactions.filter(t => t.status === "Completed").length;
    const avgTransaction = last3DaysTotal / (completedCount || 1);

    return {
      todayCount: todayTx.filter(t => t.status === "Completed").length,
      cardTotal,
      cashTotal,
      transferTotal,
      avgTransaction,
      refundedCount,
    };
  }, [transactions]);

  const chartData = useMemo(() => [
    { name: "Cash", value: kpis.cashTotal, color: "#8b5cf6" },
    { name: "Card", value: kpis.cardTotal, color: "#3b82f6" },
    { name: "Transfer", value: kpis.transferTotal, color: "#f59e0b" },
  ].filter(d => d.value > 0), [kpis]);

  const details = useMemo(() => {
    if (!selectedTransaction) return null;
    const tx = transactions.find((t) => t.id === selectedTransaction);
    if (!tx) return null;
    const items = tx.items.map((it) => ({
      name: inventory[it.productId]?.name ?? `#${it.productId}`,
      qty: it.qty,
      price: it.price,
    }));
    const dt = new Date(tx.datetime);
    return {
      ...tx,
      items,
      date: dt.toISOString().slice(0, 10),
      time: dt.toTimeString().slice(0, 5),
    };
  }, [selectedTransaction, transactions, inventory]);

  const [closeDayOpen, setCloseDayOpen] = useState(false);
  const [newRefundOpen, setNewRefundOpen] = useState(false);
  const [refundSearch, setRefundSearch] = useState("");
  const [refundTx, setRefundTx] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const handleCloseDay = () => {
    toast.success("Day closed successfully", {
      description: "All transactions moved to history and KPIs reset."
    });
    setCloseDayOpen(false);
  };

  const handleProcessRefund = () => {
    if (!refundTx || !refundAmount) return;
    refundTransaction(refundTx.id);
    toast.success("Refund Processed", {
      description: `Refunded ${formatCurrency(Number(refundAmount))} for order ${refundTx.id}`
    });
    setNewRefundOpen(false);
    setRefundTx(null);
    setRefundAmount("");
    setRefundReason("");
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case "Cash": return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">Cash</Badge>;
      case "Linked Account": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Card (Account)</Badge>;
      case "POS Terminal": return <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100 border-cyan-200">Card (Terminal)</Badge>;
      case "Transfer": return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200">Transfer</Badge>;
      default: return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Completed</Badge>;
      case "Refunded": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Refunded</Badge>;
      case "Pending": return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">Pending</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor, reconcile, and manage your sales history</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="hidden sm:flex gap-2 border-gray-200" onClick={() => setCloseDayOpen(true)}>
            <Calculator className="w-4 h-4" />
            Close Day
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-100" onClick={() => setNewRefundOpen(true)}>
            <Undo2 className="w-4 h-4" />
            New Refund
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Today's Sales</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{kpis.todayCount}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs">
              <span className="text-green-600 font-medium flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> +12%
              </span>
              <span className="text-gray-400">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm" onClick={() => setPaymentFilter("Cash")}>
          <CardContent className="pt-6 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cash</p>
                <p className={`text-3xl font-bold mt-1 ${kpis.cashTotal > 0 ? "text-purple-600" : "text-gray-300"}`}>
                  {formatCurrency(kpis.cashTotal)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              {kpis.cashTotal > 0 ? "Highest volume" : "No payments"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm" onClick={() => setPaymentFilter("Card")}>
          <CardContent className="pt-6 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Card</p>
                <p className={`text-3xl font-bold mt-1 ${kpis.cardTotal > 0 ? "text-blue-600" : "text-gray-300"}`}>
                  {formatCurrency(kpis.cardTotal)}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              {kpis.cardTotal > 0 ? "Active" : "No payments"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Refunds</p>
                <p className={`text-3xl font-bold mt-1 ${kpis.refundedCount > 0 ? "text-red-600" : "text-gray-300"}`}>
                  {kpis.refundedCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <Undo2 className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              {kpis.refundedCount > 0 ? "Requires attention" : "All clear"}
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-dotted border-gray-300">
                      Avg Sale
                    </TooltipTrigger>
                    <TooltipContent>Average over last 3 days with sales</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.avgTransaction)}</p>
              </div>
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center">
                <Calculator className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Last updated: just now
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Visuals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-gray-200 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by ID, customer name/phone, amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                  <SelectTrigger className="w-40 h-10 bg-white">
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40 h-10 bg-white">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="h-10 bg-white gap-2" onClick={() => setDateOpen(true)}>
                  <Filter className="w-4 h-4" />
                  {(dateFrom || dateTo) ? <Badge className="bg-indigo-600 text-white p-0 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">1</Badge> : "Range"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm overflow-hidden">
          <CardHeader className="py-3 px-4 bg-gray-50/50 border-b border-gray-100">
            <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-widest">Payment Split</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex items-center justify-center h-24">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={25}
                    outerRadius={35}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-gray-400">No data to display</p>
            )}
            <div className="flex flex-col gap-1 pr-6">
              {chartData.map(d => (
                <div key={d.name} className="flex items-center gap-2 text-[10px] font-medium text-gray-600">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Section */}
      <Card className="border-gray-200 shadow-sm relative overflow-hidden">
        {selectedRows.size > 0 && (
          <div className="absolute top-0 left-0 right-0 h-14 bg-indigo-600 text-white flex items-center px-6 justify-between z-10 animate-in slide-in-from-top duration-200">
            <span className="font-medium">{selectedRows.size} transactions selected</span>
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-white hover:bg-white/10 gap-2" onClick={handleBulkRefund}>
                <Undo2 className="w-4 h-4" /> Refund Selected
              </Button>
              <Button variant="ghost" className="text-white hover:bg-white/10 gap-2">
                <Download className="w-4 h-4" /> Export
              </Button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <Button variant="ghost" className="text-white hover:bg-white/10" onClick={() => setSelectedRows(new Set())}>
                Cancel
              </Button>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedRows.size === filteredTransactions.length && filteredTransactions.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedRows(new Set(filteredTransactions.map(t => t.id)));
                        else setSelectedRows(new Set());
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-16">Item</TableHead>
                  <TableHead className="cursor-pointer hover:text-indigo-600" onClick={() => handleSort("id")}>
                    <div className="flex items-center gap-1">
                      ID {sortConfig.key === "id" && (sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-indigo-600" onClick={() => handleSort("datetime")}>
                    <div className="flex items-center gap-1">
                      Date & Time {sortConfig.key === "datetime" && (sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right cursor-pointer hover:text-indigo-600" onClick={() => handleSort("amount")}>
                    <div className="flex items-center gap-1 justify-end">
                      Amount {sortConfig.key === "amount" && (sortConfig.direction === "asc" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />)}
                    </div>
                  </TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <Receipt className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-lg font-medium text-gray-900">No transactions found</p>
                        <p className="text-sm max-w-xs mx-auto mt-1">Try adjusting your filters or head to the POS to record your first sale.</p>
                        <Button className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white gap-2" onClick={() => navigate("/pos")}>
                          Go to POS <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((txn) => {
                    const isExpanded = expandedRows.has(txn.id);
                    return (
                      <>
                        <TableRow key={txn.id} className={`group hover:bg-gray-50/80 transition-colors ${isExpanded ? "bg-gray-50/50" : ""}`}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRows.has(txn.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedRows);
                                if (checked) next.add(txn.id);
                                else next.delete(txn.id);
                                setSelectedRows(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleRow(txn.id)} title={isExpanded ? "Collapse" : "Expand"} aria-label={isExpanded ? "Collapse" : "Expand"}>
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                              <span className="text-gray-400 font-bold text-xs">
                                {inventory[txn.items[0]?.productId]?.name?.[0] || "?"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-indigo-600 font-medium">{txn.id}</TableCell>
                          <TableCell className="text-gray-600 text-xs">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900">{new Date(txn.datetime).toLocaleDateString()}</span>
                              <span className="text-[10px]">{new Date(txn.datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                                <User className="w-3 h-3 text-gray-400" />
                              </div>
                              <span className="text-sm text-gray-600">{txn.customer || "Guest / Cash"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {txn.items.reduce((s, i) => s + i.qty, 0)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-gray-900">
                            {formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell>{getPaymentBadge(txn.payment)}</TableCell>
                          <TableCell>{getStatusBadge(txn.status)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" title="Actions" aria-label="Actions">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => setSelectedTransaction(txn.id)} className="gap-2">
                                  <Eye className="w-4 h-4" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReprint(txn)} className="gap-2">
                                  <Printer className="w-4 h-4" /> Reprint Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEmailReceipt(txn)} className="gap-2">
                                  <Mail className="w-4 h-4" /> Email Receipt
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-600 gap-2" onClick={() => handleRefund(txn.id)} disabled={txn.status === "Refunded"}>
                                  <Undo2 className="w-4 h-4" /> Refund Sale
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow className="bg-gray-50/30 border-t-0">
                            <TableCell colSpan={11} className="py-4 px-12">
                              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    Order Breakdown
                                  </h4>
                                  <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                                    {txn.items.length} {txn.items.length === 1 ? "item" : "items"}
                                  </span>
                                </div>
                                <div className="space-y-3">
                                  {txn.items.map((it, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-gray-50 border border-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                          {inventory[it.productId]?.name?.[0] || "?"}
                                        </div>
                                        <div>
                                          <p className="font-medium text-gray-900">{inventory[it.productId]?.name || "Unknown Product"}</p>
                                          <p className="text-xs text-gray-500">Qty: {it.qty} × {formatCurrency(it.price)}</p>
                                        </div>
                                      </div>
                                      <span className="font-bold text-gray-900">{formatCurrency(it.qty * it.price)}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex justify-end pt-3 border-t border-gray-100">
                                  <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Total Amount</p>
                                    <p className="text-lg font-black text-indigo-600">{formatCurrency(txn.amount)}</p>
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
              {filteredTransactions.length > 0 && (
                <tfoot className="bg-gray-50/50 border-t border-gray-200">
                  <TableRow>
                    <TableCell colSpan={6} className="text-right text-xs font-bold text-gray-500 uppercase">Filtered Totals</TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {filteredTransactions.reduce((s, t) => s + t.items.reduce((si, i) => si + i.qty, 0), 0)}
                    </TableCell>
                    <TableCell className="text-right font-black text-indigo-600 text-lg">
                      {formatCurrency(filteredTransactions.reduce((s, t) => s + t.amount, 0))}
                    </TableCell>
                    <TableCell colSpan={3}></TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <Dialog
        open={selectedTransaction !== null}
        onOpenChange={(open) => !open && setSelectedTransaction(null)}
      >
        <DialogContent className="sm:max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <DialogHeader className="p-8 pb-4 bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-gray-900">Transaction Details</DialogTitle>
                <DialogDescription className="text-gray-500 font-medium">Full audit trail for order #{selectedTransaction}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          {details && (
            <div className="p-8 space-y-8">
              {/* Header Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Transaction ID</p>
                  <p className="text-sm font-mono font-bold text-indigo-600">{details.id}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Status</p>
                  {getStatusBadge(details.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Date & Time</p>
                  <p className="text-sm font-bold text-gray-900">{details.date} • {details.time}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Payment</p>
                  {getPaymentBadge(details.payment)}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Customer</p>
                  <p className="text-sm font-bold text-gray-900">{details.customer || "Guest Customer"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Store</p>
                  <p className="text-sm font-bold text-gray-900">{currentStore.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Cashier</p>
                  <p className="text-sm font-bold text-gray-900">{details.cashier || currentUser?.name || "System"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Total Amount</p>
                  <p className="text-sm font-black text-indigo-600">{formatCurrency(details.amount)}</p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Line Items</h3>
                  <Badge variant="outline" className="text-[10px] font-bold text-gray-400">{details.items.length} Items</Badge>
                </div>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-gray-100">
                        <TableHead className="text-[10px] font-black uppercase tracking-widest">Item</TableHead>
                        <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Qty</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Price</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.items.map((item, index) => (
                        <TableRow key={index} className="border-gray-100/50">
                          <TableCell className="py-3 font-medium text-gray-900">{item.name}</TableCell>
                          <TableCell className="py-3 text-center font-bold text-gray-600">{item.qty}</TableCell>
                          <TableCell className="py-3 text-right text-gray-600">{formatCurrency(item.price)}</TableCell>
                          <TableCell className="py-3 text-right font-black text-gray-900">{formatCurrency(item.price * item.qty)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="p-4 bg-indigo-50/30 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Grand Total</span>
                    <span className="text-xl font-black text-indigo-600">{formatCurrency(details.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full h-14 bg-gray-900 hover:bg-black text-white font-black rounded-2xl shadow-xl transition-all"
                  onClick={() => setSelectedTransaction(null)}
                >
                  Close Details
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Date Range Sheet */}
      <Sheet open={dateOpen} onOpenChange={setDateOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="border-b border-gray-100 pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Filter by Date
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => { setDateFrom(new Date().toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); }}>Today</Button>
              <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => { 
                const y = new Date(); y.setDate(y.getDate() - 1);
                setDateFrom(y.toISOString().slice(0, 10)); setDateTo(y.toISOString().slice(0, 10)); 
              }}>Yesterday</Button>
              <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => { 
                const l7 = new Date(); l7.setDate(l7.getDate() - 7);
                setDateFrom(l7.toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); 
              }}>Last 7 Days</Button>
              <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => { 
                const tm = new Date(); tm.setDate(1);
                setDateFrom(tm.toISOString().slice(0, 10)); setDateTo(new Date().toISOString().slice(0, 10)); 
              }}>This Month</Button>
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">From Date</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-11" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">To Date</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="pt-4 flex gap-3">
              <Button variant="ghost" className="flex-1 text-gray-500" onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</Button>
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold" onClick={() => setDateOpen(false)}>
                Apply Range
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Close Day Modal */}
      <Dialog open={closeDayOpen} onOpenChange={setCloseDayOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white">
            <DialogHeader className="p-8 pb-4 bg-gray-50/50 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-gray-900">Close Today's Sales?</DialogTitle>
                  <DialogDescription className="text-gray-500 font-medium">Review summary before finalizing</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
                  <p className="text-xl font-black text-gray-900">{formatCurrency(kpis.cashTotal + kpis.cardTotal + kpis.transferTotal)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Sale</p>
                  <p className="text-xl font-black text-indigo-600">{formatCurrency(kpis.avgTransaction)}</p>
                </div>
                <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100">
                  <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Cash</p>
                  <p className="text-xl font-black text-green-700">{formatCurrency(kpis.cashTotal)}</p>
                </div>
                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Card</p>
                  <p className="text-xl font-black text-blue-700">{formatCurrency(kpis.cardTotal)}</p>
                </div>
                <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Refunds</p>
                  <p className="text-xl font-black text-red-700">{kpis.refundedCount}</p>
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-100 transition-all" onClick={handleCloseDay}>
                  Yes, Close Day
                </Button>
                <Button variant="ghost" className="w-full h-12 text-gray-400 font-bold" onClick={() => setCloseDayOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Refund Modal */}
      <Dialog open={newRefundOpen} onOpenChange={setNewRefundOpen}>
        <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="bg-white">
            <DialogHeader className="p-8 pb-4 bg-indigo-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Undo2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Process New Refund</DialogTitle>
                    <DialogDescription className="text-indigo-100 font-medium">Find transaction to return items</DialogDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-white/60 hover:text-white" onClick={() => setNewRefundOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </DialogHeader>

            <div className="p-8 space-y-6">
              {!refundTx ? (
                <div className="space-y-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input 
                      placeholder="Search by ID or Customer..." 
                      className="h-14 pl-12 bg-gray-50 border-gray-100 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-100"
                      value={refundSearch}
                      onChange={e => setRefundSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest px-2">Search Results</p>
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {transactions.filter(t => 
                        (t.id.toLowerCase().includes(refundSearch.toLowerCase()) || 
                        (t.customer ?? "").toLowerCase().includes(refundSearch.toLowerCase())) &&
                        t.status === "Completed"
                      ).slice(0, 5).map(t => (
                        <div 
                          key={t.id} 
                          className="p-4 bg-gray-50 hover:bg-indigo-50 border border-gray-100 rounded-2xl cursor-pointer transition-all group"
                          onClick={() => {
                            setRefundTx(t);
                            setRefundAmount(t.amount.toString());
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-black text-gray-900 group-hover:text-indigo-600">Order #{t.id}</p>
                              <p className="text-[10px] text-gray-500 font-medium">{new Date(t.datetime).toLocaleDateString()} • {t.customer || "Guest"}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-gray-900">{formatCurrency(t.amount)}</p>
                              <ChevronRight className="w-4 h-4 text-gray-300 ml-auto mt-1" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <div className="p-5 bg-indigo-50 rounded-[1.5rem] border border-indigo-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Selected Order</p>
                      <p className="text-base font-black text-indigo-900">#{refundTx.id}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-indigo-600 font-bold" onClick={() => setRefundTx(null)}>Change</Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Refund Amount ({currency.symbol})</label>
                      <Input 
                        type="number" 
                        value={refundAmount} 
                        onChange={e => setRefundAmount(e.target.value)}
                        className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-black text-lg focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Reason for Refund</label>
                      <Select value={refundReason} onValueChange={setRefundReason}>
                        <SelectTrigger className="h-14 bg-gray-50 border-gray-100 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-100">
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-none shadow-2xl">
                          <SelectItem value="defective">Defective Item</SelectItem>
                          <SelectItem value="wrong_item">Wrong Item Sent</SelectItem>
                          <SelectItem value="customer_change">Customer Changed Mind</SelectItem>
                          <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                          <SelectItem value="other">Other Reason</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <Button variant="ghost" className="flex-1 h-14 font-bold text-gray-400" onClick={() => setRefundTx(null)}>Back</Button>
                    <Button 
                      className="flex-[2] h-14 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-2xl shadow-xl shadow-red-100 transition-all"
                      onClick={handleProcessRefund}
                    >
                      Process Refund
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Confirmation Modal */}
      <Dialog open={isRefundConfirmOpen} onOpenChange={setIsRefundConfirmOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <div className="p-8 space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <DialogTitle className="text-2xl font-black text-gray-900">Refund this sale?</DialogTitle>
              <DialogDescription className="text-gray-500 mt-2">
                This will reverse the transaction and restore stock levels for all items in order <span className="font-bold text-gray-900">#{transactionToRefund}</span>.
              </DialogDescription>
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 h-12 font-bold text-gray-400" onClick={() => setIsRefundConfirmOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1 h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-100" onClick={confirmRefund}>
                Confirm Refund
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Share Modal */}
      {transactionToEmail && (
        <EmailShareModal
          open={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          reportName={`Receipt for Order ${transactionToEmail.id}`}
          reportType="Receipt"
          file={{
            blob: transactionToEmail.blob,
            name: `receipt-${transactionToEmail.id}.pdf`,
            type: "application/pdf"
          }}
        />
      )}
    </div>
  );
}
