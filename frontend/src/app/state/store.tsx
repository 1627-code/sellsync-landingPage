import React, { useReducer, useEffect, useMemo, createContext, useContext } from "react";
import { toast } from "sonner";

type Role = "Admin" | "Manager" | "Staff";

type Currency = { id: string; name: string; symbol: string };

type InventoryItem = {
  id: number;
  name: string;
  sku: string;
  barcode?: string;
  category: string;
  price: number;
  stock: number;
  reorderPoint: number;
  costPrice?: number;
  supplier?: string;
  expiryDate?: string;
  manufacturedDate?: string;
  createdAt: string;
};

type Transaction = {
  id: string;
  items: Array<{ productId: number; qty: number; price: number; name: string }>;
  subtotal: number;
  discount: number;
  amount: number;
  payment: string;
  cashier?: string;
  datetime: string;
  status: "Completed" | "Pending" | "Refunded";
  customer?: string;
  terminalId?: string;
  reference?: string;
  notes?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  pin?: string;
  assignedStoreIds?: string[];
  status?: string;
};

type Store = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  category?: string;
};

export type SalesTrendPoint = { day: string; sales: number };
export type TopProduct = { id: number; name: string; unitsSold: number; revenue: number; stock: number; stockStatus: "healthy" | "low" | "critical" };
export type DynamicInsight = { id: number; type: "warning" | "success" | "info"; message: string };
export type AnalyticsData = { dailySales: Array<{ date: string; revenue: number }>; topProducts: Array<{ productName: string; unitsSold: number }>; salesByCategory: Array<{ category: string; revenue: number }> };

type KPIs = {
  totalRevenueToday: number;
  totalRevenueTodayChange: number;
  totalSalesToday: number;
  totalSalesTodayChange: number;
  lowStockCount: number;
  lowStockCountChange: number;
  productsSoldToday: number;
  productsSoldTodayChange: number;
};

type AppNotification = { id: string; type: string; title: string; message: string; timestamp: string; read: boolean; productId?: number; link?: string };

type PermissionMatrix = Record<string, Record<Role, { view: boolean; edit: boolean }>>;

const initialPermissions: PermissionMatrix = {
  Dashboard: { Admin: { view: true, edit: true }, Manager: { view: true, edit: true }, Staff: { view: true, edit: true } },
  Inventory: { Admin: { view: true, edit: true }, Manager: { view: true, edit: true }, Staff: { view: false, edit: false } },
  Products: { Admin: { view: true, edit: true }, Manager: { view: true, edit: true }, Staff: { view: false, edit: false } },
  Transactions: { Admin: { view: true, edit: true }, Manager: { view: true, edit: true }, Staff: { view: true, edit: false } },
  POS: { Admin: { view: true, edit: true }, Manager: { view: true, edit: true }, Staff: { view: true, edit: true } },
  Insights: { Admin: { view: true, edit: true }, Manager: { view: true, edit: false }, Staff: { view: false, edit: false } },
  Forecasts: { Admin: { view: true, edit: true }, Manager: { view: true, edit: false }, Staff: { view: false, edit: false } },
  Reports: { Admin: { view: true, edit: true }, Manager: { view: true, edit: false }, Staff: { view: false, edit: false } },
  Staff: { Admin: { view: true, edit: true }, Manager: { view: true, edit: false }, Staff: { view: true, edit: false } },
  Notifications: { Admin: { view: true, edit: true }, Manager: { view: true, edit: true }, Staff: { view: true, edit: true } },
  Settings: { Admin: { view: true, edit: true }, Manager: { view: true, edit: true }, Staff: { view: false, edit: false } },
};

const initialState = {
  inventory: {} as Record<number, InventoryItem>,
  transactions: [] as Transaction[],
  notifications: [] as AppNotification[],
  customers: [] as any[],
  terminals: [] as any[],
  categories: [] as string[],
  dailySales: {} as Record<number, number>,
  users: [] as User[],
  currentStore: null as Store | null,
  allStores: [] as Store[],
  permissions: initialPermissions,
  preferences: { dateFormat: "DD/MM/YYYY", timeFormat: "12h", numberFormatting: true, notifications: { email: true, sms: true, inApp: true, expiryAlerts: true }, receipts: { showLogo: true, showExpiry: true } },
  theme: "light" as "light" | "dark",
  currency: { id: "NGN", name: "Nigerian Naira", symbol: "₦" } as Currency,
  currentUser: null as User | null,
  bankAccounts: [] as any[],
  posTerminals: [] as any[],
  paymentSettings: { autoSettle: true, allowCash: true, allowTransfer: true, allowCard: true, enableReceiptSMS: true, enableReceiptEmail: true, enableExpiryNotifications: true },
  receiptDefaults: { email: "", phone: "" },
  attendance: [] as any[],
  payroll: [] as any[],
  storeSettings: {} as Record<string, any>,
  analytics: { dailySales: [], topProducts: [], salesByCategory: [] } as AnalyticsData,
  isLoading: false,
};

type Action =
  | { type: "SET_LOADING"; isLoading: boolean }
  | { type: "COMPLETE_SALE"; payload: any }
  | { type: "REFUND_TRANSACTION"; transactionId: string }
  | { type: "ADJUST_STOCK"; productId: number; delta: number }
  | { type: "SET_PRICE"; productId: number; price: number }
  | { type: "ADD_PRODUCT"; product: Omit<InventoryItem, "id"> }
  | { type: "SET_STOCK"; productId: number; stock: number }
  | { type: "UPDATE_PRODUCT"; product: InventoryItem }
  | { type: "DELETE_PRODUCT"; productId: number }
  | { type: "ADD_CATEGORY"; name: string }
  | { type: "SET_DAILY_SALES"; payload: Record<number, number> }
  | { type: "SET_ANALYTICS"; payload: AnalyticsData }
  | { type: "MARK_NOTIFICATION_READ"; id: string }
  | { type: "SET_NOTIFICATIONS"; notifications: AppNotification[] }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" }
  | { type: "CLEAR_ALL_NOTIFICATIONS" }
  | { type: "ADD_USER"; user: User }
  | { type: "DELETE_USER"; userId: string }
  | { type: "UPDATE_USER"; user: User }
  | { type: "ADD_STORE"; store: Store }
  | { type: "DELETE_STORE"; storeId: string }
  | { type: "SWITCH_STORE"; storeId: string }
  | { type: "LOGIN_USER"; user: User }
  | { type: "LOGOUT_USER" }
  | { type: "SET_CURRENCY"; currency: Currency }
  | { type: "UPDATE_STORE_PROFILE"; store: Store }
  | { type: "TOGGLE_THEME" }
  | { type: "RESET_UNREAD_NOTIFICATIONS" }
  | { type: "UPDATE_PERMISSIONS"; permissions: PermissionMatrix }
  | { type: "UPDATE_PREFERENCES"; preferences: any }
  | { type: "ADD_BANK_ACCOUNT"; account: any }
  | { type: "DELETE_BANK_ACCOUNT"; accountId: string }
  | { type: "ADD_POS_TERMINAL"; terminal: any }
  | { type: "DELETE_POS_TERMINAL"; terminalId: string }
  | { type: "UPDATE_PAYMENT_SETTINGS"; settings: any }
  | { type: "SET_RECEIPT_DEFAULTS"; defaults: any }
  | { type: "SET_INVENTORY"; items: InventoryItem[] }
  | { type: "SET_TRANSACTIONS"; transactions: Transaction[] }
  | { type: "SET_STORES"; stores: Store[] };

function reducer(state: typeof initialState, action: Action): typeof initialState {
  switch (action.type) {
    case "COMPLETE_SALE": {
      const { items } = action.payload;
      const newInventory = { ...state.inventory };
      for (const item of items) {
        const inv = newInventory[item.productId];
        if (inv) newInventory[item.productId] = { ...inv, stock: Math.max(0, inv.stock - item.qty) };
      }
      return { ...state, inventory: newInventory, transactions: [...state.transactions, { ...action.payload, id: `TX-${Date.now()}`, datetime: new Date().toISOString(), status: "Completed" }] };
    }
    case "SET_INVENTORY": return { ...state, inventory: Object.fromEntries(action.items.map(i => [i.id, i])) };
    case "SET_TRANSACTIONS": return { ...state, transactions: action.transactions };
    case "SET_STORES": return { ...state, allStores: action.stores, currentStore: action.stores[0] || null };
    case "LOGIN_USER": return { ...state, currentUser: action.user };
    case "LOGOUT_USER": return { ...initialState, theme: state.theme, currency: state.currency, preferences: state.preferences };
    case "SWITCH_STORE": {
      const store = state.allStores.find(s => s.id === action.storeId);
      return store ? { ...state, currentStore: store, inventory: {}, transactions: [], notifications: [] } : state;
    }
    case "TOGGLE_THEME": return { ...state, theme: state.theme === "light" ? "dark" : "light" };
    case "ADD_PRODUCT": {
      const nextId = Math.max(0, ...Object.keys(state.inventory).map(Number)) + 1;
      return { ...state, inventory: { ...state.inventory, [nextId]: { id: nextId, ...action.product } } };
    }
    case "UPDATE_PRODUCT": return { ...state, inventory: { ...state.inventory, [action.product.id]: action.product } };
    case "DELETE_PRODUCT": {
      const { [action.productId]: _, ...rest } = state.inventory;
      return { ...state, inventory: rest };
    }
    case "ADD_CATEGORY": return { ...state, categories: state.categories.includes(action.name) ? state.categories : [...state.categories, action.name] };
    case "SET_DAILY_SALES": return { ...state, dailySales: action.payload };
    case "SET_ANALYTICS": return { ...state, analytics: action.payload };
    case "MARK_NOTIFICATION_READ": return { ...state, notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n) };
    case "SET_NOTIFICATIONS": return { ...state, notifications: action.notifications };
    case "SET_LOADING": return { ...state, isLoading: action.isLoading };
    case "MARK_ALL_NOTIFICATIONS_READ": return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case "CLEAR_ALL_NOTIFICATIONS": return { ...state, notifications: [] };
    case "ADD_USER": return { ...state, users: [...state.users, action.user] };
    case "DELETE_USER": return { ...state, users: state.users.filter(u => u.id !== action.userId) };
    case "UPDATE_USER": return { ...state, users: state.users.map(u => u.id === action.user.id ? action.user : u) };
    case "ADD_STORE": return { ...state, allStores: [...state.allStores, action.store], currentStore: action.store };
    case "DELETE_STORE": return { ...state, allStores: state.allStores.filter(s => s.id !== action.storeId), currentStore: state.currentStore?.id === action.storeId ? null : state.currentStore };
    case "SET_CURRENCY": return { ...state, currency: action.currency };
    case "UPDATE_STORE_PROFILE": return { ...state, currentStore: action.store };
    case "RESET_UNREAD_NOTIFICATIONS": return { ...state, notifications: state.notifications.map(n => ({ ...n, read: false })) };
    case "UPDATE_PERMISSIONS": return { ...state, permissions: action.permissions };
    case "UPDATE_PREFERENCES": return { ...state, preferences: action.preferences };
    case "ADD_BANK_ACCOUNT": return { ...state, bankAccounts: [...state.bankAccounts, action.account] };
    case "DELETE_BANK_ACCOUNT": return { ...state, bankAccounts: state.bankAccounts.filter(a => a.id !== action.accountId) };
    case "ADD_POS_TERMINAL": return { ...state, posTerminals: [...state.posTerminals, action.terminal] };
    case "DELETE_POS_TERMINAL": return { ...state, posTerminals: state.posTerminals.filter(t => t.id !== action.terminalId) };
    case "UPDATE_PAYMENT_SETTINGS": return { ...state, paymentSettings: { ...state.paymentSettings, ...action.settings } };
    case "SET_RECEIPT_DEFAULTS": return { ...state, receiptDefaults: action.defaults };
    default: return state;
  }
}

function computeKPIs(state: typeof initialState): KPIs {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const txs = state.transactions || [];
  const todaysTx = txs.filter(t => t.datetime?.startsWith(today) && t.status === "Completed");
  const yesterdaysTx = txs.filter(t => t.datetime?.startsWith(yesterday) && t.status === "Completed");
  const totalRevenueToday = todaysTx.reduce((sum, t) => sum + t.amount, 0);
  const totalRevenueYesterday = yesterdaysTx.reduce((sum, t) => sum + t.amount, 0);
  const getChange = (now: number, prev: number) => prev === 0 ? 0 : Math.round(((now - prev) / prev) * 100);
  const lowStockCount = (Object.values(state.inventory) || []).filter(i => i.stock < i.reorderPoint).length;
  const productsSoldToday = todaysTx.reduce((sum, t) => sum + (t.items || []).reduce((s, i) => s + i.qty, 0), 0);
  return { totalRevenueToday, totalRevenueTodayChange: getChange(totalRevenueToday, totalRevenueYesterday), totalSalesToday: todaysTx.length, totalSalesTodayChange: getChange(todaysTx.length, yesterdaysTx.length), lowStockCount, lowStockCountChange: 0, productsSoldToday, productsSoldTodayChange: 0 };
}

function computeDynamicInsights(state: typeof initialState, kpis: KPIs): DynamicInsight[] {
  const insights: DynamicInsight[] = [];
  if (kpis.lowStockCount > 0) insights.push({ id: 1, type: "warning", message: `${kpis.lowStockCount} items are below critical stock levels.` });
  if (kpis.totalRevenueTodayChange > 0) insights.push({ id: 2, type: "success", message: `Revenue is up ${kpis.totalRevenueTodayChange}% vs yesterday.` });
  else if (kpis.totalRevenueTodayChange < 0) insights.push({ id: 2, type: "warning", message: `Revenue is down ${Math.abs(kpis.totalRevenueTodayChange)}% vs yesterday.` });
  if ((state.transactions || []).length > 0) {
    const hourCounts: Record<number, number> = {};
    state.transactions.forEach(t => { 
      if (t.datetime) {
        const h = new Date(t.datetime).getHours(); 
        hourCounts[h] = (hourCounts[h] || 0) + 1; 
      }
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    if (peakHour) {
      const h = parseInt(peakHour[0]);
      insights.push({ id: 3, type: "info", message: `Peak traffic around ${h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h-12} PM`}.` });
    }
  }
  return insights;
}

const StoreContext = createContext<any>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const storedUser = localStorage.getItem("sellsync_user");
    const token = localStorage.getItem("sellsync_token");
    const storedStore = localStorage.getItem("sellsync_current_store");
    if (storedUser && token) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({ type: "LOGIN_USER", user });
        if (storedStore) dispatch({ type: "SWITCH_STORE", storeId: JSON.parse(storedStore).id });
      } catch (e) { console.error("Failed to restore session:", e); }
    }
  }, []);

  useEffect(() => {
    if (!state.currentUser || !state.currentStore) return;
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const token = localStorage.getItem("sellsync_token");
    const storeId = state.currentStore?.id;
    if (!token || !storeId) return;
    
    const fetchData = async () => {
      console.log("[StoreProvider] Fetching data for store:", storeId);
      dispatch({ type: "SET_LOADING", isLoading: true });
      try {
        const [productsRes, transactionsRes, notificationsRes] = await Promise.all([
          fetch(`${API_URL}/api/products/${storeId}`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`${API_URL}/api/transactions/${storeId}`, { headers: { "Authorization": `Bearer ${token}` } }),
          fetch(`${API_URL}/api/notifications?storeId=${storeId}`, { headers: { "Authorization": `Bearer ${token}` } })
        ]);
        if (productsRes.ok) {
          const pdata = await productsRes.json();
          if (pdata.success && pdata.products) dispatch({ type: "SET_INVENTORY", items: pdata.products.map((p: any) => ({ id: p.id, name: p.name, sku: p.sku || "", barcode: p.barcode, category: p.category || "Uncategorized", price: p.price || 0, stock: p.inventory?.quantity || 0, reorderPoint: p.inventory?.lowThreshold || 10, createdAt: p.createdAt })) });
        }
        if (transactionsRes.ok) {
          const tdata = await transactionsRes.json();
          if (tdata.success && tdata.transactions) dispatch({ type: "SET_TRANSACTIONS", transactions: tdata.transactions });
        }
        if (notificationsRes.ok) {
          const ndata = await notificationsRes.json();
          if (ndata.success && ndata.notifications) dispatch({ type: "SET_NOTIFICATIONS", notifications: ndata.notifications.map((n: any) => ({ id: n.id, type: n.type, title: n.title, message: n.message, timestamp: n.createdAt, read: n.isRead })) });
        }
      } catch (e) { console.error("Failed to fetch data:", e); }
      finally { dispatch({ type: "SET_LOADING", isLoading: false }); }
    };
    fetchData();
  }, [state.currentUser?.id, state.currentStore?.id]);

  useEffect(() => {
    if (state.theme === "dark") document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [state.theme]);

  const kpis = useMemo(() => computeKPIs(state), [state.transactions, state.inventory]);
  const dynamicInsights = useMemo(() => computeDynamicInsights(state, kpis), [state.transactions, kpis]);
  const formatCurrency = (amount: number) => `${state.currency.symbol}${amount.toLocaleString()}`;
  const inventoryArray = Object.values(state.inventory);

  const value = {
    ...state, kpis, dynamicInsights, inventoryArray, formatCurrency,
    loginUser: (user: User) => dispatch({ type: "LOGIN_USER", user }),
    logoutUser: () => { localStorage.clear(); dispatch({ type: "LOGOUT_USER" }); },
    switchStore: (storeId: string) => dispatch({ type: "SWITCH_STORE", storeId }),
    toggleTheme: () => dispatch({ type: "TOGGLE_THEME" }),
    addProduct: (p: Omit<InventoryItem, "id">) => dispatch({ type: "ADD_PRODUCT", product: p }),
    updateProduct: (p: InventoryItem) => dispatch({ type: "UPDATE_PRODUCT", product: p }),
    deleteProduct: (id: number) => dispatch({ type: "DELETE_PRODUCT", productId: id }),
    completeSale: (payload: any) => dispatch({ type: "COMPLETE_SALE", payload }),
    setStores: (stores: Store[]) => dispatch({ type: "SET_STORES", stores }),
    setCurrentStore: (storeId: string) => dispatch({ type: "SWITCH_STORE", storeId }),
    setDailySales: (payload: Record<number, number>) => dispatch({ type: "SET_DAILY_SALES", payload }),
    addCategory: (name: string) => dispatch({ type: "ADD_CATEGORY", name }),
    markNotificationRead: (id: string) => dispatch({ type: "MARK_NOTIFICATION_READ", id }),
    resetUnreadNotifications: () => dispatch({ type: "RESET_UNREAD_NOTIFICATIONS" }),
    addStore: (store: Store) => dispatch({ type: "ADD_STORE", store }),
    addUser: (user: User) => dispatch({ type: "ADD_USER", user }),
    updateUser: (user: User) => dispatch({ type: "UPDATE_USER", user }),
    addBankAccount: (account: any) => dispatch({ type: "ADD_BANK_ACCOUNT", account }),
    deleteBankAccount: (id: string) => dispatch({ type: "DELETE_BANK_ACCOUNT", accountId: id }),
    updatePaymentSettings: (settings: any) => dispatch({ type: "UPDATE_PAYMENT_SETTINGS", settings }),
    setReceiptDefaults: (defaults: any) => dispatch({ type: "SET_RECEIPT_DEFAULTS", defaults }),
    updatePermissions: (p: any) => dispatch({ type: "UPDATE_PERMISSIONS", permissions: p }),
    updatePreferences: (p: any) => dispatch({ type: "UPDATE_PREFERENCES", preferences: p }),
  };

  return React.createElement(StoreContext.Provider, { value }, children);
}

export const useStore = () => { const ctx = useContext(StoreContext); if (!ctx) throw new Error("useStore must be used within StoreProvider"); return ctx; };