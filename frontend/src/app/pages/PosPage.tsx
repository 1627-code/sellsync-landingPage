/**
 * =============================================================================
 * POS PAGE - BACKEND INTEGRATION POINTS
 * =============================================================================
 * 
 * This page handles point-of-sale operations. Key areas to integrate:
 * 
 * 1. Product Scanning (handleScanSuccess) - Line ~202
 *    - Replace local inventory lookup with: api.products.getByBarcode()
 *    
 * 2. Sale Completion (handleCompleteSale) - Line ~255
 *    - POST to /link/transactions for recording sales
 *    - Integrate with payment providers (Paystack, Flutterwave, etc.)
 *    
 * 3. SMS/Email Receipts (handleSmsShare) - Line ~380
 *    - POST to /link/notifications/sms and /link/notifications/email
 * 
 * See src/lib/api.ts for complete API documentation.
 * =============================================================================
 */

import { useMemo, useState, useEffect, useRef } from "react";
import { useStore, InventoryItem } from "../state/store";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Wallet, 
  Terminal, 
  User, 
  Tag, 
  Receipt, 
  CheckCircle2, 
  X, 
  ShoppingCart, 
  ChevronRight, 
  History, 
  Star,
  Smartphone,
  Banknote,
  Percent,
  Calculator,
  Wifi,
  WifiOff,
  Printer,
  Mail,
  Send,
  Loader2,
  QrCode,
  RefreshCcw,
  Building2,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { Progress } from "../components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { ScrollArea } from "../components/ui/scroll-area";
import { Separator } from "../components/ui/separator";
import { QrScannerModal } from "../components/QrScannerModal";
import { QrGeneratorModal } from "../components/QrGeneratorModal";
import { toast } from "sonner";
import { ProductCard } from "../components/ProductCard";
import { motion } from "framer-motion";
import { staggerContainer, pulseGlow, slideInRight } from "../../animations/variants";
import { generateReceiptPDF, downloadReceiptPDF } from "../../lib/receipt";
import { POSVoiceButton } from "../components/POSVoiceButton";
import { EmailShareModal } from "../components/EmailShareModal";

type PaymentMethod = "Cash" | "Linked Account" | "Transfer" | "POS Terminal" | "Account Balance";

interface CartItemData {
  id: number;
  name: string;
  price: number;
  qty: number;
  stock: number;
  sku: string;
}

export function PosPage() {
  const { 
    inventoryArray, 
    completeSale, 
    terminals, 
    categories, 
    dailySales, 
    setDailySales, 
    customers, 
    kpis,
    bankAccounts,
    posTerminals,
    paymentSettings,
    currency,
    currentStore,
    currentUser,
    receiptDefaults,
    formatCurrency,
  } = useStore();
  
  // Search & Filter State
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cart State
  const [cart, setCart] = useState<Record<number, number>>({});
  const [discount, setDiscount] = useState<number>(0); // Fixed amount for now
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("C-001"); // Default to Guest
  const [orderNotes, setOrderNotes] = useState("");

  // Payment State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [payments, setPayments] = useState<{ method: PaymentMethod; amount: number }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastTxId, setLastTxId] = useState<string>("");
  const [completedOrderData, setCompletedOrderData] = useState<any>(null);

  // Receipt Sharing Modals
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState(receiptDefaults.email);
  const [sharePhone, setSharePhone] = useState(receiptDefaults.phone);
  const [isSendingShare, setIsSendingShare] = useState(false);

  // Sync share state with defaults when they change
  useEffect(() => {
    setShareEmail(receiptDefaults.email);
    setSharePhone(receiptDefaults.phone);
  }, [receiptDefaults]);

  // Payment Flow UI State
  const [paymentStep, setPaymentStep] = useState<"method" | "processing" | "success">("method");
  const [processingMessage, setProcessingMessage] = useState("Processing payment...");

  const activeBankAccount = bankAccounts.find(a => a.status === "Verified");
  const activeTerminal = posTerminals.find(t => t.status === "Connected");

  // UI State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [modalQty, setModalQty] = useState(1);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"products" | "order">("products");

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    searchInputRef.current?.focus();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const products = useMemo(() => {
    return inventoryArray.filter((p) => {
      const matchesQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.sku.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category === "all" || p.category === category;
      return matchesQuery && matchesCategory;
    }).sort((a, b) => (dailySales[b.id] || 0) - (dailySales[a.id] || 0));
  }, [inventoryArray, query, category, dailySales]);

  const popularProducts = useMemo(() => {
    return [...inventoryArray]
      .sort((a, b) => (dailySales[b.id] || 0) - (dailySales[a.id] || 0))
      .slice(0, 5);
  }, [inventoryArray, dailySales]);

  const cartItems: CartItemData[] = useMemo(() => {
    return Object.entries(cart).map(([productId, qty]) => {
      const p = inventoryArray.find((i) => i.id === Number(productId))!;
      return { 
        id: p.id,
        name: p.name,
        price: p.price,
        qty: qty as number,
        stock: p.stock,
        sku: p.sku
      };
    });
  }, [cart, inventoryArray]);

  const subtotal = cartItems.reduce((sum, ci) => sum + ci.price * ci.qty, 0);
  const calculatedDiscount = discountType === "percent" ? (subtotal * discount) / 100 : discount;
  const total = Math.max(0, subtotal - calculatedDiscount);
  
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0) + (Number(cashReceived) || 0);
  const remainingDue = Math.max(0, total - totalPaid);
  const changeDue = totalPaid > total ? totalPaid - total : 0;

  const addToCart = (id: number, qty: number = 1) => {
    const item = inventoryArray.find((i) => i.id === id);
    if (!item || item.stock === 0) return;
    const current = cart[id] || 0;
    const next = Math.min(current + qty, item.stock);
    setCart({ ...cart, [id]: next });
    setSelectedProduct(null);
    setModalQty(1);
    setActiveTab("order"); // Switch focus to current order
  };

  // =============================================================================
  // BACKEND_INTEGRATION: Barcode/QR Scanner
  // =============================================================================
  // To integrate with backend for product lookup:
  // 1. Replace local inventoryArray.find() with API call
  // 2. Example: const response = await fetch(`${VITE_API_BASE_URL}/link/products?barcode=${decodedText}`);
  // 3. See src/lib/api.ts for full API documentation
  // =============================================================================
  
  const handleScanSuccess = (decodedText: string) => {
    // Try to find product by SKU or Barcode
    // BACKEND_INTEGRATION: Replace with: const product = await api.products.getByBarcode(decodedText);
    const product = inventoryArray.find(p => p.sku === decodedText || p.barcode === decodedText);
    if (product) {
      if (product.stock > 0) {
        addToCart(product.id);
        toast.success(`Added ${product.name} to cart via scan`);
      } else {
        toast.error(`${product.name} is out of stock`);
      }
    } else {
      // Try to parse if it's JSON (for advanced QR codes)
      try {
        const data = JSON.parse(decodedText);
        const p = inventoryArray.find(prod => prod.sku === data.sku || prod.barcode === data.barcode);
        if (p) {
          addToCart(p.id);
          toast.success(`Added ${p.name} to cart via scan`);
        } else {
          toast.error("No product found for this QR data");
        }
      } catch (e) {
        toast.error(`No product matches barcode: ${decodedText}`);
      }
    }
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) {
      const { [id]: _, ...rest } = cart;
      setCart(rest);
      return;
    }
    const item = inventoryArray.find((i) => i.id === id);
    if (!item) return;
    const next = Math.min(qty, item.stock);
    setCart({ ...cart, [id]: next });
  };

  const handleNumpadClick = (val: string) => {
    if (val === "Clear") setCashReceived("");
    else if (val === "Exact") setCashReceived(remainingDue.toFixed(2));
    else if (val === "⌫") setCashReceived(prev => prev.slice(0, -1));
    else setCashReceived(prev => prev + val);
  };

  const addPartialPayment = () => {
    const amount = Number(cashReceived);
    if (amount <= 0) return;
    setPayments([...payments, { method: paymentMethod, amount }]);
    setCashReceived("");
  };

  // =============================================================================
  // BACKEND_INTEGRATION: Complete Sale
  // =============================================================================
  // Replace simulated payment processing with actual API calls:
  //
  // // Before processing, verify with backend
  // const verifyPayment = async () => {
  //   const response = await fetch(`${VITE_API_BASE_URL}/link/transactions/verify`, {
  //     method: "POST",
  //     body: JSON.stringify({ paymentMethod, amount: total }),
  //   });
  //   return response.json();
  // };
  //
  // // After successful sale, save to backend
  // const response = await fetch(`${VITE_API_BASE_URL}/link/transactions`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(orderData),
  // });
  //
  // See src/lib/api.ts for full endpoint documentation
  // =============================================================================
  
  const handleCompleteSale = async () => {
    setIsProcessing(true);
    setPaymentStep("processing");

    // Finalize current entry if any
    const finalPayments = [...payments];
    if (Number(cashReceived) > 0) {
      finalPayments.push({ method: paymentMethod, amount: Number(cashReceived) });
    }

    // Integrated Payment Flow Logic
    if (paymentMethod === "POS Terminal") {
      if (!activeTerminal) {
        toast.error("No POS terminal connected. Please use manual entry.");
        setIsProcessing(false);
        setPaymentStep("method");
        return;
      }
      setProcessingMessage("Waiting for POS terminal...");
      await new Promise(r => setTimeout(r, 2000));
      setProcessingMessage("Authorizing card...");
      await new Promise(r => setTimeout(r, 1500));
    } else if (paymentMethod === "Linked Account") {
      if (!activeBankAccount) {
        toast.error("No bank account linked. Please use manual entry.");
        setIsProcessing(false);
        setPaymentStep("method");
        return;
      }
      setProcessingMessage("Initiating transfer...");
      await new Promise(r => setTimeout(r, 2000));
    } else {
      await new Promise(r => setTimeout(r, 800)); // Standard simulation
    }

    const txId = `TXN-${Date.now()}`;
    const customerObj = customers.find(c => c.id === selectedCustomer);

    const orderData = {
      id: txId,
      items: cartItems.map(ci => {
        const product = inventoryArray.find(p => p.id === ci.id);
        return { 
          id: ci.id,
          name: ci.name,
          price: ci.price,
          qty: ci.qty,
          sku: ci.sku,
          manufacturedDate: product?.manufacturedDate,
          expiryDate: product?.expiryDate
        };
      }),
      subtotal,
      discount: calculatedDiscount,
      total,
      paymentMethod: finalPayments[0]?.method || paymentMethod,
      cashier: currentUser?.name || "John Doe",
      customer: customerObj?.name || "Guest Customer",
      date: new Date().toLocaleString("en-GB"), // Professional format
      store: currentStore,
      changeDue: changeDue > 0 ? changeDue : 0
    };

    completeSale({
      items: cartItems.map(ci => ({ productId: ci.id, qty: ci.qty, price: ci.price })),
      subtotal,
      discount: calculatedDiscount,
      amount: total,
      payment: finalPayments[0]?.method || paymentMethod,
      cashier: currentUser?.name || "John Doe",
      customer: orderData.customer,
      notes: orderNotes
    });

    setCompletedOrderData(orderData);
    setLastTxId(txId);
    setIsProcessing(false);
    setShowSuccess(true);
    setIsPaymentModalOpen(false);
    setPaymentStep("method");
    
    // Auto-download receipt - Professional version
    setTimeout(() => {
      const blob = generateReceiptPDF({
        store: currentStore,
        transactionId: txId,
        date: orderData.date,
        cashier: orderData.cashier,
        customer: orderData.customer,
        items: orderData.items,
        subtotal: orderData.subtotal,
        discount: orderData.discount,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod,
        currency,
        changeDue: orderData.changeDue
      });
      downloadReceiptPDF(blob, txId, true);
    }, 1000);
    
    if (paymentMethod === "POS Terminal" || paymentMethod === "Linked Account") {
      toast.success(`Payment confirmed • ${formatCurrency(total)} settled to ${activeBankAccount?.bankName || "linked account"}`);
    } else {
      toast.success(`Payment Successful! ${formatCurrency(total)} processed`);
    }

    setCart({});
    setCashReceived("");
    setPayments([]);
    setDiscount(0);
    setOrderNotes("");
  };

  // =============================================================================
  // BACKEND_INTEGRATION: SMS Receipt Sharing
  // =============================================================================
  // Replace simulated SMS sending with actual SMS API integration:
  //
  // const handleSmsShare = async () => {
  //   try {
  //     const response = await fetch(`${VITE_API_BASE_URL}/link/notifications/sms`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         phone: sharePhone,
  //         message: `Your SellSync receipt ${lastTxId}`,
  //         receiptUrl: `${VITE_API_BASE_URL}/receipts/${lastTxId}`,
  //       }),
  //     });
  //     if (!response.ok) throw new Error("SMS failed");
  //     toast.success(`Receipt SMS sent to ${sharePhone}`);
  //   } catch (error) {
  //     toast.error("Failed to send SMS");
  //   }
  // };
  // =============================================================================
  
  const handleSmsShare = async () => {
    if (!sharePhone || !sharePhone.startsWith("+234")) {
      toast.error("Please enter a valid Nigerian phone number starting with +234");
      return;
    }
    setIsSendingShare(true);
    // Simulate API call - replace with actual SMS API integration
    await new Promise(r => setTimeout(r, 1500));
    setIsSendingShare(false);
    setIsSmsModalOpen(false);
    toast.success(`Receipt SMS sent to ${sharePhone}`);
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Top Navigation / KPI Bar */}
      <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">SellSync POS</h1>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="hidden md:flex items-center gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 text-gray-500">
              <History className="w-4 h-4" />
              <span>Today: <span className="text-gray-900 font-bold">{formatCurrency(kpis.totalRevenueToday)}</span></span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Receipt className="w-4 h-4" />
              <span>Orders: <span className="text-gray-900 font-bold">{kpis.totalSalesToday}</span></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isOffline ? (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1.5 py-1">
              <WifiOff className="w-3.5 h-3.5" /> Offline Mode
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1.5 py-1">
              <Wifi className="w-3.5 h-3.5" /> System Online
            </Badge>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full" title="User Profile" aria-label="User Profile">
                  <User className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>John Doe (Cashier)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left: Product Grid Area */}
        <motion.div className="flex-1 flex flex-col min-w-0 bg-gray-50 p-6 space-y-6 overflow-y-auto" variants={staggerContainer} initial="hidden" animate="visible">
          {/* Search & Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <Input
                ref={searchInputRef}
                placeholder="Search products or scan barcode..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 h-11 bg-white border-gray-200 shadow-sm text-sm focus-visible:ring-indigo-600 rounded-xl"
              />
            </div>
            <motion.div {...pulseGlow}>
            <Button 
              className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-2 px-6 shadow-lg shadow-indigo-100"
              onClick={() => setIsScannerOpen(true)}
            >
              <QrCode className="w-4 h-4" />
              <span className="hidden sm:inline">Scan</span>
            </Button>
            </motion.div>
            <Button 
              variant="outline"
              className="h-11 bg-white border-gray-200 text-gray-600 rounded-xl font-bold gap-2 px-6 shadow-sm"
              onClick={() => setIsGeneratorOpen(true)}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Code</span>
            </Button>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48 h-11 bg-white border-gray-200 shadow-sm rounded-xl text-sm font-medium">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Popular Items */}
          {!query && category === "all" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wider px-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                Popular Items
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {popularProducts.map((p) => (
                  <Button
                    key={p.id}
                    variant="outline"
                    className="h-24 bg-white border-gray-200 shadow-sm hover:border-indigo-600 hover:bg-indigo-50/50 justify-start px-2.5 rounded-xl transition-all w-full"
                    onClick={() => addToCart(p.id)}
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0 mr-2.5">
                      <span className="text-indigo-600 font-black text-base">{p.name[0]}</span>
                    </div>
                    <div className="text-left overflow-hidden">
                      <p className="text-[11px] font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs font-black text-indigo-600">{formatCurrency(p.price)}</p>
                    </div>
                  </Button>
                ))}
              </div>
            </section>
          )}

          {/* Main Grid */}
          <motion.div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p as any}
                inCart={cart[p.id] || 0}
                onOpenQty={(id) => {
                  const prod = inventoryArray.find(i => i.id === id);
                  if (prod) {
                    setSelectedProduct(prod);
                    setModalQty(cart[id] || 1);
                  }
                }}
              />
            ))}
          </motion.div>
        </motion.div>

        {/* Right: Cart Area */}
        {((cartItems.length > 0 && activeTab === "order") || (cartItems.length > 0 && window.innerWidth >= 1024)) && (
        <motion.aside className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-full shrink-0 shadow-2xl z-10" variants={slideInRight} initial="hidden" animate="visible">
          {/* Cart Header */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                Current Order
              </h2>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg h-8 px-2 font-bold text-xs gap-1.5"
                onClick={() => setCart({})}
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </Button>
            </div>

            {/* Customer Lookup */}
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-600" />
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="pl-9 h-11 bg-gray-50 border-transparent focus:ring-indigo-600 rounded-xl">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-bold">{c.name}</span>
                        {c.phone && <span className="text-[10px] text-gray-400">{c.phone}</span>}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cart Items */}
          <ScrollArea className="flex-1 px-5">
            <div className="py-4 space-y-4 pb-24">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="w-10 h-10 text-gray-200" />
                  </div>
                  <p className="text-gray-900 font-bold">Your cart is empty</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Scan a barcode or search products to start a sale</p>
                </div>
              ) : (
                <>
                  {cartItems.map((item) => (
                    <div key={item.id} className="group flex gap-4 animate-in slide-in-from-right-4 duration-300">
                      <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                        <img src={`https://placehold.co/60x60/4f46e5/ffffff?text=${item.name[0]}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-sm font-bold text-gray-900 truncate leading-none mb-1">{item.name}</h4>
                          <Button 
                            variant="ghost"
                            size="icon"
                            className="text-gray-300 hover:text-red-500 transition-colors p-0.5 h-8 w-8"
                            onClick={() => updateQty(item.id, 0)}
                            title="Remove item"
                            aria-label="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-0.5 border border-gray-100">
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all shadow-sm"
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              title="Decrease quantity"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </Button>
                            <Input 
                              type="number" 
                              value={item.qty} 
                              onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 0)}
                              className="w-12 h-7 p-0 text-center text-sm font-black text-gray-900 bg-transparent border-none focus-visible:ring-0"
                            />
                            <Button 
                              variant="ghost"
                              size="icon"
                              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md transition-all shadow-sm"
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              disabled={item.qty >= item.stock}
                              title="Increase quantity"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <p className="font-black text-gray-900">{formatCurrency(item.price * item.qty)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Cart Footer / Totals */}
          <div className="sticky bottom-0 z-10 p-5 bg-gray-50/50 border-t border-gray-100 space-y-4 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.1)]">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium text-gray-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Discount {discount > 0 && `(${discount}${discountType === 'percent' ? '%' : ''})`}</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded hover:bg-indigo-100">Add</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Apply Discount</DialogTitle>
                        <DialogDescription>Apply a fixed amount or percentage discount to this order.</DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="flex gap-2">
                          <Button 
                            variant={discountType === "fixed" ? "default" : "outline"} 
                            className="flex-1 h-12 gap-2"
                            onClick={() => setDiscountType("fixed")}
                          >
                            <Banknote className="w-4 h-4" /> Fixed ({currency.symbol})
                          </Button>
                          <Button 
                            variant={discountType === "percent" ? "default" : "outline"} 
                            className="flex-1 h-12 gap-2"
                            onClick={() => setDiscountType("percent")}
                          >
                            <Percent className="w-4 h-4" /> Percent (%)
                          </Button>
                        </div>
                        <Input 
                          type="number" 
                          placeholder={discountType === "fixed" ? "0.00" : "0"} 
                          value={discount || ""}
                          onChange={(e) => setDiscount(Number(e.target.value))}
                          className="h-14 text-2xl font-black text-center"
                        />
                      </div>
                      <DialogFooter>
                        <Button className="w-full h-12 text-lg font-bold" onClick={() => setIsPaymentModalOpen(false)}>Apply Discount</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <span className="text-red-500 font-bold">-{formatCurrency(calculatedDiscount)}</span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-lg font-black text-gray-900">Total</span>
                <span className="text-3xl font-black text-indigo-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <Button 
              className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-100 rounded-2xl font-black text-xl gap-3 transition-all active:scale-[0.98]"
              disabled={cartItems.length === 0}
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Pay Now <ChevronRight className="w-6 h-6" />
            </Button>
          </div>
        </motion.aside>
        )}

      </main>

      {/* Product Detail Modal */}
      <Dialog open={selectedProduct !== null} onOpenChange={(o) => !o && setSelectedProduct(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          {selectedProduct && (
            <div className="flex flex-col">
              <div className="relative aspect-video bg-gray-100">
                <img 
                  src={`https://placehold.co/600x400/4f46e5/ffffff?text=${selectedProduct.name[0]}`} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <Badge className="mb-2 bg-indigo-600 text-white border-none">{selectedProduct.category}</Badge>
                  <h2 className="text-3xl font-black text-white">{selectedProduct.name}</h2>
                  <p className="text-indigo-200 font-bold tracking-widest text-xs uppercase">{selectedProduct.sku}</p>
                </div>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Unit Price</p>
                    <p className="text-4xl font-black text-indigo-600">{formatCurrency(selectedProduct.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">Stock Available</p>
                    <p className={`text-xl font-black ${selectedProduct.stock < 10 ? 'text-red-500' : 'text-green-600'}`}>
                      {selectedProduct.stock} units
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-center text-sm font-bold text-gray-400 uppercase tracking-widest">Select Quantity</p>
                  <div className="flex items-center justify-center gap-8">
                    <Button 
                      variant="outline" 
                      className="w-20 h-20 rounded-2xl border-2 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                      onClick={() => setModalQty(prev => Math.max(0, prev - 1))}
                      title="Decrease quantity"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-10 h-10 text-gray-600" />
                    </Button>
                    <Input 
                      type="number" 
                      value={modalQty} 
                      onChange={(e) => setModalQty(Math.min(selectedProduct.stock, parseInt(e.target.value) || 0))}
                      className="text-7xl font-black text-gray-900 w-48 h-20 text-center tabular-nums bg-transparent border-none focus-visible:ring-0"
                    />
                    <Button 
                      variant="outline" 
                      className="w-20 h-20 rounded-2xl border-2 hover:bg-gray-50 active:scale-95 transition-all shadow-sm"
                      onClick={() => setModalQty(prev => Math.min(selectedProduct.stock, prev + 1))}
                      title="Increase quantity"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-10 h-10 text-gray-600" />
                    </Button>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    className="w-full h-20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-4 transition-all active:scale-[0.98]"
                    onClick={() => addToCart(selectedProduct.id, modalQty)}
                    disabled={modalQty === 0}
                  >
                    <ShoppingCart className="w-8 h-8" />
                    Add to Order
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-3xl gap-0 border-none">
          <div className="flex h-[600px]">
            {/* Payment Method Selector */}
            <div className="w-1/3 bg-gray-50 border-r border-gray-100 p-6 flex flex-col gap-3">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-2">Payment Method</h3>
              {[
                { id: "Cash", icon: Banknote, color: "bg-green-50 text-green-600" },
                { id: "POS Terminal", icon: Smartphone, color: "bg-blue-50 text-blue-600" },
                { id: "Linked Account", icon: CreditCard, color: "bg-purple-50 text-purple-600" },
                { id: "Transfer", icon: Send, color: "bg-orange-50 text-orange-600" },
                { id: "Account Balance", icon: Wallet, color: "bg-cyan-50 text-cyan-600" },
              ].map((method) => (
                <Button
                  key={method.id}
                  variant="ghost"
                  className={`flex flex-col items-center justify-center h-auto p-4 rounded-2xl border-2 transition-all gap-2 ${paymentMethod === method.id ? 'bg-white border-indigo-600 shadow-lg scale-[1.02]' : 'bg-transparent border-transparent hover:bg-gray-100'}`}
                  onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                  title={`Pay via ${method.id}`}
                  aria-label={`Pay via ${method.id}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${method.color}`}>
                    <method.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-xs font-black ${paymentMethod === method.id ? 'text-gray-900' : 'text-gray-500'}`}>{method.id}</span>
                </Button>
              ))}
            </div>

            {/* Payment Details / Numpad */}
            <div className="flex-1 bg-white p-8 flex flex-col overflow-y-auto">
              {/* Linked Devices & Accounts Header */}
              <div className="mb-6 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Linked Devices & Accounts</h4>
                <div className="flex flex-wrap gap-2">
                  {activeBankAccount ? (
                    <Badge className="bg-green-50 text-green-700 border-green-100 py-1 px-3 rounded-lg gap-1.5 font-bold">
                      <Building2 className="w-3 h-3" />
                      {activeBankAccount.bankName} ••••{activeBankAccount.accountNumber.slice(-4)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400 border-gray-200 py-1 px-3 rounded-lg gap-1.5 font-bold">
                      No Bank Linked
                    </Badge>
                  )}
                  {activeTerminal ? (
                    <Badge className="bg-green-50 text-green-700 border-green-100 py-1 px-3 rounded-lg gap-1.5 font-bold">
                      <Smartphone className="w-3 h-3" />
                      {activeTerminal.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-400 border-gray-200 py-1 px-3 rounded-lg gap-1.5 font-bold">
                      No POS Linked
                    </Badge>
                  )}
                </div>
                {(!activeBankAccount || !activeTerminal) && (
                  <p className="text-[10px] text-orange-600 font-bold mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Payments will be manual only
                  </p>
                )}
              </div>

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 mb-1">Total Due</h2>
                  <p className="text-gray-500 font-medium">Remaining: <span className="text-indigo-600 font-black">{formatCurrency(remainingDue)}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-5xl font-black text-gray-900">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Partial Payments List */}
              {payments.length > 0 && (
                <div className="mb-6 space-y-2">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Partial Payments</h4>
                  <div className="flex flex-wrap gap-2">
                    {payments.map((p, i) => (
                      <Badge key={i} variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100 py-1.5 px-3 rounded-lg gap-2">
                        {p.method}: {formatCurrency(p.amount)}
                        <Button 
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 hover:bg-transparent"
                          onClick={() => setPayments(payments.filter((_, idx) => idx !== i))}
                          title="Remove payment"
                          aria-label="Remove payment"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {paymentStep === "processing" ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-12 animate-in fade-in zoom-in duration-500">
                  <div className="relative">
                    <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center">
                      <RefreshCcw className="w-12 h-12 text-indigo-600 animate-spin" />
                    </div>
                    {paymentMethod === "POS Terminal" && (
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-indigo-600" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-gray-900">{processingMessage}</h4>
                    <p className="text-gray-500 max-w-[240px]">Please do not close this window or refresh the page</p>
                  </div>
                </div>
              ) : paymentMethod === "Cash" ? (
                <div className="flex-1 flex flex-col gap-4">
                  <div className="relative">
                    <Input 
                      className="h-20 text-4xl font-black text-right pr-14 bg-gray-50 border-none rounded-2xl focus-visible:ring-indigo-600 shadow-inner"
                      value={cashReceived}
                      readOnly
                      placeholder="0.00"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-2xl font-black text-gray-300">{currency.symbol}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {["1", "2", "3", "5000", "4", "5", "6", "10000", "7", "8", "9", "Exact", ".", "0", "⌫", "Clear"].map((btn) => (
                      <Button
                        key={btn}
                        variant={btn === "Exact" || btn === "Clear" || btn === "⌫" ? "outline" : "ghost"}
                        className={`h-12 text-lg font-black rounded-xl border-2 ${btn === "Exact" ? "bg-indigo-50 border-indigo-200 text-indigo-600" : btn === "Clear" ? "border-red-100 text-red-600 hover:bg-red-50" : btn === "⌫" ? "border-gray-200 text-gray-600" : "bg-gray-50 border-transparent hover:bg-gray-100"}`}
                        onClick={() => handleNumpadClick(btn)}
                      >
                        {btn}
                      </Button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1 h-12 font-bold rounded-xl border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                      onClick={addPartialPayment}
                      disabled={!cashReceived || Number(cashReceived) <= 0}
                    >
                      Add Partial
                    </Button>
                  </div>

                  {totalPaid >= total && (
                    <div className="bg-green-50 border border-green-100 p-4 rounded-2xl flex justify-between items-center animate-in fade-in zoom-in duration-300">
                      <span className="text-green-700 font-bold uppercase tracking-wider">Change to give</span>
                      <span className="text-3xl font-black text-green-700">{formatCurrency(changeDue)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 py-12">
                  <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center animate-pulse">
                    {paymentMethod === "POS Terminal" ? <Terminal className="w-12 h-12 text-indigo-600" /> : <CreditCard className="w-12 h-12 text-indigo-600" />}
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-gray-900">
                      {paymentMethod === "POS Terminal" ? "Ready for Terminal" : "Ready for Transfer"}
                    </h4>
                    <p className="text-gray-500 max-w-[240px]">
                      {paymentMethod === "POS Terminal" 
                        ? `Present card on ${activeTerminal?.name || 'terminal'} for ${formatCurrency(remainingDue)}`
                        : `Confirm transfer of ${formatCurrency(remainingDue)} to ${activeBankAccount?.bankName || 'linked account'}`}
                    </p>
                  </div>
                  {((paymentMethod === "POS Terminal" && !activeTerminal) || (paymentMethod === "Linked Account" && !activeBankAccount)) && (
                    <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <p className="text-xs font-bold text-orange-800 text-left">
                        {paymentMethod === "POS Terminal" ? "No terminal connected" : "No bank account linked"}. 
                        Go to Settings to set this up.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button 
                className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xl mt-6 shadow-xl shadow-indigo-100 gap-3 shrink-0"
                disabled={isProcessing || totalPaid < total}
                onClick={handleCompleteSale}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-6 h-6" /> Complete Sale
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal - Upgraded to Premium POS Completion */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-[#0f1115]">
          {/* Purple Header Section */}
          <div className="bg-indigo-600 p-8 flex flex-col items-center text-center text-white relative overflow-hidden">
            {/* Abstract Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/5 rounded-full -ml-32 -mb-32 blur-3xl" />
            
            <motion.div 
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-2xl shadow-indigo-900/20"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              >
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </motion.div>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-[28px] font-black mb-2 tracking-tight"
            >
              Sale Completed!
            </motion.h2>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-xl border border-white/20 group cursor-pointer hover:bg-white/25 transition-all"
              onClick={() => {
                navigator.clipboard.writeText(lastTxId);
                toast.success("Transaction ID copied!");
              }}
            >
              <span className="text-lg font-black tracking-wider opacity-90">{lastTxId}</span>
              <RefreshCcw className="w-4 h-4 opacity-60 group-hover:rotate-180 transition-transform duration-500" />
            </motion.div>
          </div>

          <div className="p-8 space-y-6">
            {/* Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5">
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Customer</p>
                <p className="font-bold text-gray-900 dark:text-white text-base">{completedOrderData?.customer || "Guest Customer"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Payment Method</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <p className="font-bold text-gray-900 dark:text-white text-base">{completedOrderData?.paymentMethod}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Date & Time</p>
                <p className="font-bold text-gray-900 dark:text-white text-base">{completedOrderData?.date}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Store Location</p>
                <p className="font-bold text-gray-900 dark:text-white text-base">{completedOrderData?.store?.name || "Main Store - Downtown"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Served By</p>
                <p className="font-bold text-gray-900 dark:text-white text-base">{completedOrderData?.cashier}</p>
              </div>
            </div>

            {/* Total Amount Card */}
            <div className="bg-indigo-50/50 dark:bg-indigo-500/5 rounded-[1.5rem] p-6 flex flex-col items-center border border-indigo-100/50 dark:border-indigo-500/10 shadow-inner relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Receipt className="w-20 h-20 text-indigo-600" />
              </div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Total Amount Paid</p>
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="flex items-baseline gap-1"
              >
                <span className="text-5xl font-black text-indigo-600 tracking-tighter tabular-nums">
                  {formatCurrency(completedOrderData?.total || 0)}
                </span>
              </motion.div>
              <div className="mt-3 flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-500/10 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100 dark:border-green-500/20">
                <CheckCircle2 className="w-3 h-3" />
                Payment Successful
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="h-20 flex-col rounded-[1.5rem] gap-2 border-gray-100 dark:border-white/5 hover:border-indigo-200 dark:hover:border-indigo-500/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all group shadow-sm bg-white dark:bg-white/5"
                onClick={() => {
                  const blob = generateReceiptPDF({
                    store: currentStore,
                    transactionId: lastTxId,
                    date: completedOrderData.date,
                    cashier: completedOrderData.cashier,
                    customer: completedOrderData.customer,
                    items: completedOrderData.items,
                    subtotal: completedOrderData.subtotal,
                    discount: completedOrderData.discount,
                    total: completedOrderData.total,
                    paymentMethod: completedOrderData.paymentMethod,
                    currency,
                    changeDue: completedOrderData.changeDue
                  });
                  downloadReceiptPDF(blob, lastTxId);
                }}
              >
                <div className="w-9 h-9 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/10 transition-colors">
                  <Printer className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 group-hover:text-indigo-600">Print</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col rounded-[1.5rem] gap-2 border-gray-100 dark:border-white/5 hover:border-purple-200 dark:hover:border-purple-500/30 hover:bg-purple-50/50 dark:hover:bg-purple-500/5 transition-all group shadow-sm bg-white dark:bg-white/5"
                onClick={() => setIsEmailModalOpen(true)}
              >
                <div className="w-9 h-9 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/10 transition-colors">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-purple-600" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 group-hover:text-purple-600">Email</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-20 flex-col rounded-[1.5rem] gap-2 border-gray-100 dark:border-white/5 hover:border-green-200 dark:hover:border-green-500/30 hover:bg-green-50/50 dark:hover:bg-green-500/5 transition-all group shadow-sm bg-white dark:bg-white/5"
                onClick={() => setIsSmsModalOpen(true)}
              >
                <div className="w-9 h-9 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/10 transition-colors">
                  <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-green-600" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 group-hover:text-green-600">SMS</span>
              </Button>
            </div>

            <Button 
              className="w-full h-16 rounded-[1.5rem] bg-gray-900 hover:bg-black text-white font-black text-lg shadow-xl shadow-gray-200 transition-all active:scale-[0.98]" 
              onClick={() => setShowSuccess(false)}
            >
              Start New Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Share Modal */}
      {completedOrderData && (
        <EmailShareModal
          open={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          reportName={`Receipt for Order ${lastTxId}`}
          reportType="Receipt"
          file={{
            blob: generateReceiptPDF({
              store: currentStore,
              transactionId: lastTxId,
              date: completedOrderData.date,
              cashier: completedOrderData.cashier,
              customer: completedOrderData.customer,
              items: completedOrderData.items,
              subtotal: completedOrderData.subtotal,
              discount: completedOrderData.discount,
              total: completedOrderData.total,
              paymentMethod: completedOrderData.paymentMethod,
              currency,
              changeDue: completedOrderData.changeDue
            }),
            name: `receipt-${lastTxId}.pdf`,
            type: "application/pdf"
          }}
        />
      )}

      {/* SMS Share Modal - Premium Design */}
      <Dialog open={isSmsModalOpen} onOpenChange={setIsSmsModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-[#0f1115] text-white">
          <div>
            <DialogHeader className="p-8 pb-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                    <MessageSquare className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Share via SMS</DialogTitle>
                    <DialogDescription className="text-gray-400 font-medium">Send digital receipt link via mobile</DialogDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl text-gray-500 hover:text-white hover:bg-white/5" onClick={() => setIsSmsModalOpen(false)}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </DialogHeader>

            <div className="p-8 space-y-6">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <Input 
                      placeholder="+234 800 000 0000" 
                      value={sharePhone}
                      onChange={(e) => setSharePhone(e.target.value)}
                      className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl focus:ring-2 focus:ring-green-500/20 text-white placeholder:text-gray-600 font-bold transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Message Preview</Label>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 text-sm font-medium text-gray-300 leading-relaxed italic">
                    "Thank you! Your SellSync receipt {lastTxId} for {formatCurrency(total)} is ready. View full: sellsync.me/r/{lastTxId.split('-')[1]}"
                  </div>
                </div>

                <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 flex items-start gap-3">
                  <div className="w-5 h-5 bg-orange-500/10 rounded flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-3 h-3 text-orange-500" />
                  </div>
                  <p className="text-[10px] font-bold text-orange-400/80 leading-relaxed">
                    Full file attachments are not supported in SMS. A secure download link will be provided instead.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl border-white/5 bg-transparent text-gray-400 font-bold hover:bg-white/5 hover:text-white transition-all"
                onClick={() => setIsSmsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-[2] h-14 rounded-2xl bg-green-600 hover:bg-green-700 font-black text-lg gap-3 shadow-xl shadow-green-500/20 transition-all"
                onClick={handleSmsShare}
                disabled={isSendingShare}
              >
                {isSendingShare ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send SMS
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <QrScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleScanSuccess} 
      />

      <QrGeneratorModal 
        isOpen={isGeneratorOpen} 
        onClose={() => setIsGeneratorOpen(false)} 
        onSave={(data) => {
          // In a real app, this would call an API
          console.log("Saving new product with code:", data);
          toast.success(`Product ${data.name} saved!`);
        }}
      />

      <POSVoiceButton 
        onAddToCart={addToCart}
        onUpdateQty={updateQty}
        onClearCart={() => setCart({})}
        onSetPaymentMethod={(m) => setPaymentMethod(m)}
        onSetCashReceived={(a) => setCashReceived(a)}
        onCompleteSale={() => {
          if (!isPaymentModalOpen) {
            if (cartItems.length > 0) {
              setIsPaymentModalOpen(true);
              setPaymentStep("method");
              window.speechSynthesis.speak(new SpeechSynthesisUtterance("Opening payment screen. What payment method would you like?"));
            } else {
              toast.error("Cart is empty");
            }
          } else {
            handleCompleteSale();
          }
        }}
        cartItems={cartItems}
        inventory={inventoryArray}
        total={total}
      />
    </div>
    </ErrorBoundary>
  );
}
