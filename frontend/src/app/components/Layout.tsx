import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./ui/sonner";
import { ErrorBoundary } from "./ErrorBoundary";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  CreditCard,
  TrendingUp,
  LineChart,
  FileText,
  Bell,
  Settings,
  Search,
  ChevronDown,
  ChevronRight,
  Menu,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  Users,
  Building2,
  RefreshCcw,
} from "lucide-react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState, useMemo, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { useStore } from "../state/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { toast } from "sonner";
import { Card, CardContent } from "./ui/card";
import { AskAIModal } from "./AskAIModal";
import { Sparkles, Star, CheckCircle2 } from "lucide-react";

import { Skeleton } from "./ui/skeleton";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Inventory", path: "/inventory", icon: Package },
  { name: "Products", path: "/products", icon: ShoppingCart },
  { name: "Transactions", path: "/transactions", icon: Receipt },
  { name: "POS", path: "/pos", icon: CreditCard },
  { name: "Insights", path: "/insights", icon: TrendingUp },
  { name: "Forecasts", path: "/forecasts", icon: LineChart },
  { name: "Reports", path: "/reports", icon: FileText },
  { name: "Notifications", path: "/notifications", icon: Bell },
  { name: "Settings", path: "/settings", icon: Settings },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    currentStore, 
    allStores, 
    switchStore, 
    theme, 
    toggleTheme, 
    notifications,
    resetUnreadNotifications,
    users,
    permissions,
    currentUser,
    loginUser,
    logoutUser,
    currency,
    inventoryArray,
    formatCurrency
  } = useStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSelectStoreModalOpen, setIsSelectStoreModalOpen] = useState(false);
  const [isSwitchingStore, setIsSwitchingStore] = useState(false);
  const [isSwitchingLoading, setIsSwitchingLoading] = useState(false);
  const [pendingStore, setPendingStore] = useState<any>(null);
  const [switchEmail, setSwitchEmail] = useState("");
  const [switchPassword, setSwitchPassword] = useState("");
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  // Pre-fill email when switching store
  useEffect(() => {
    if (isSwitchingStore && currentUser) {
      setSwitchEmail(currentUser.email);
    }
  }, [isSwitchingStore, currentUser]);

  // Global Search State
  const [globalSearch, setGlobalSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Debounce logic
  useEffect(() => {
    if (!globalSearch.trim()) {
      setDebouncedSearch("");
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedSearch(globalSearch);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(handler);
  }, [globalSearch]);

  const searchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return [];
    return inventoryArray.filter(p => 
      p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.category.toLowerCase().includes(debouncedSearch.toLowerCase())
    ).slice(0, 5);
  }, [debouncedSearch, inventoryArray]);

  const getStockStatus = (stock: number, reorderPoint: number = 40) => {
    if (stock < 10) return { label: "Critical", color: "text-red-600 bg-red-50 border-red-100" };
    if (stock < reorderPoint) return { label: "Low Stock", color: "text-orange-600 bg-orange-50 border-orange-100" };
    return { label: "Healthy", color: "text-green-600 bg-green-50 border-green-100" };
  };

  const activeUser = currentUser || null; // Use current user from login
  const unreadCount = notifications.filter(n => !n.read).length;

  // Auto-open store selector for Admin/Manager only
  useEffect(() => {
    if (!currentStore && activeUser && (activeUser.role === 'ADMIN' || activeUser.role === 'MANAGER' || activeUser.role === 'Admin' || activeUser.role === 'Manager')) {
      setIsSelectStoreModalOpen(true);
    }
  }, [currentStore, activeUser]);

  // Normalize role: convert "MANAGER" to "Manager", "CASHIER" to "Staff"
  const normalizedRole = activeUser?.role
    ? (activeUser.role === 'MANAGER' ? 'Manager' : activeUser.role === 'CASHIER' ? 'Staff' : activeUser.role === 'ADMIN' ? 'Admin' : activeUser.role)
    : 'Admin';

  const isAdmin = activeUser?.role === 'ADMIN';
  const isManager = activeUser?.role === 'MANAGER';

  // RBAC: Filter nav items based on user role and permissions
  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => {
      const permission = permissions?.[item.name];
      return permission ? (permission[normalizedRole]?.view ?? true) : true;
    }).map(item => {
      // Dynamically rename "Settings" based on user role
      if (item.name === "Settings" && normalizedRole !== "Admin") {
        return { ...item, name: normalizedRole };
      }
      return item;
    });
  }, [normalizedRole, permissions]);

  // RBAC: Enforce access control
  useEffect(() => {
    const currentPath = location.pathname;
    const currentItem = navItems.find(item => item.path === currentPath || (item.path !== "/" && currentPath.startsWith(item.path)));
    
    if (currentItem) {
      const permission = permissions?.[currentItem.name];
      // Only show error for Admin/Manager - silently redirect Staff
      if (permission && !(permission[normalizedRole]?.view ?? true)) {
        if (normalizedRole === "Admin" || normalizedRole === "Manager") {
          toast.error("Access denied for your role");
        }
        navigate("/");
      }
    }
  }, [location.pathname, normalizedRole, permissions, navigate]);

  // Dark Mode Support
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleStoreSwitch = async () => {
    // Just switch the store directly - no password needed for now
    // Store switching is a simple context switch for the current user
    if (!pendingStore && !currentStore) {
      toast.error("No store selected");
      return;
    }

    setIsSwitchingLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    const storeId = pendingStore?.id || currentStore?.id;
    switchStore(storeId);

    // Wait for store to update before navigating
    await new Promise(resolve => setTimeout(resolve, 300));

    setIsSwitchingLoading(false);
    setIsSelectStoreModalOpen(false);
    setIsSwitchingStore(false);
    setPendingStore(null);
    toast.success(`Switched to ${pendingStore?.name || currentStore?.name}`);

    // Redirect to dashboard after switch
    navigate("/");
  };

  const handleLogout = () => {
    toast.promise(new Promise(resolve => setTimeout(resolve, 500)), {
      loading: "Logging out...",
      success: () => {
        logoutUser();
        navigate("/login"); // Redirect to login page
        return "Logged out successfully";
      },
      error: "Logout failed"
    });
  };

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:translate-x-0 lg:static inset-y-0 left-0 z-50 w-64 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-r transition-transform duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo */}
        <div className={`h-16 flex items-center px-6 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform duration-300">
              <span className="text-white font-black text-xs tracking-tighter">SS</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-xl font-black tracking-tight text-[#3B82F6]">SellSync</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-600 text-white"
                    : theme === 'dark' 
                      ? "text-gray-400 hover:bg-gray-800 hover:text-white"
                      : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Premium Upgrade Box at bottom - Hide for Staff */}
        {(!activeUser?.role || activeUser?.role === 'ADMIN' || activeUser?.role === 'MANAGER') && (
        <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-800' : 'border-gray-100'}`}>
          <div 
            onClick={() => setIsPremiumModalOpen(true)}
            className="p-4 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl shadow-indigo-100 cursor-pointer group hover:scale-[1.02] transition-all duration-300 overflow-hidden relative"
          >
            <div className="flex items-center gap-2 mb-1.5 relative z-10">
              <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
              <span className="text-[10px] font-black uppercase tracking-widest">Premium</span>
            </div>
            <p className="text-[10px] text-indigo-100 font-bold leading-tight mb-3 relative z-10">
              Unlock advanced AI insights & unlimited stores
            </p>
            <Button className="w-full h-7 bg-white text-indigo-700 hover:bg-indigo-50 text-[9px] font-black uppercase rounded-lg border-none relative z-10">
              Upgrade Now
            </Button>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl" />
          </div>
        </div>
        )}
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className={`h-16 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-b flex items-center px-4 lg:px-6 gap-4`}>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Search */}
          <div className="flex-1 max-w-md mx-auto relative">
            <div className="relative">
              {isSearching ? (
                <RefreshCcw className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 animate-spin" />
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
              <Input
                type="search"
                placeholder="Search inventory, SKUs, categories..."
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowSearchResults(false);
                }}
                className={`pl-9 border-none h-10 rounded-xl transition-all ${theme === 'dark' ? 'bg-gray-800 text-white focus:bg-gray-700' : 'bg-gray-50 text-gray-900 focus:bg-white focus:ring-2 focus:ring-indigo-100'}`}
              />
            </div>

            {/* Global Search Results Dropdown */}
            {showSearchResults && globalSearch.trim() && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowSearchResults(false)} 
                />
                <Card className={`absolute top-full left-0 right-0 mt-2 z-20 border-none shadow-2xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                  <CardContent className="p-2">
                    {searchResults.length > 0 ? (
                      <div className="space-y-1">
                        {searchResults.map((p) => {
                          const status = getStockStatus(p.stock, p.reorderPoint);
                          return (
                            <button
                              key={p.id}
                              className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                              onClick={() => {
                                navigate("/inventory", { state: { search: p.name, highlightId: p.id } });
                                setShowSearchResults(false);
                                setGlobalSearch("");
                              }}
                            >
                              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0 border border-indigo-100/50">
                                <span className="text-indigo-600 font-black text-lg">{p.name[0]}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-bold text-sm truncate text-gray-900 dark:text-white">{p.name}</p>
                                  <span className="text-xs font-black text-indigo-600 shrink-0">{formatCurrency(p.price)}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">SKU: {p.sku}</span>
                                  <span className="text-[10px] text-gray-300">•</span>
                                  <span className="text-[10px] font-bold text-gray-400">{p.category}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={`text-[9px] px-1.5 h-4 font-black uppercase tracking-tighter border-none ${status.color}`}>
                                    {status.label}
                                  </Badge>
                                  <span className="text-[10px] font-bold text-gray-500">{p.stock} units left</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        <div className="pt-1 mt-1 border-t border-gray-100 dark:border-gray-700">
                          <Button 
                            variant="ghost" 
                            className="w-full justify-center text-xs font-black uppercase tracking-widest text-indigo-600 h-10 hover:bg-indigo-50"
                            onClick={() => {
                              navigate("/inventory", { state: { search: globalSearch } });
                              setShowSearchResults(false);
                              setGlobalSearch("");
                            }}
                          >
                            View all results for "{globalSearch}"
                          </Button>
                        </div>
                      </div>
                    ) : !isSearching && (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <Search className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-bold text-gray-900">No products found</p>
                        <p className="text-xs text-gray-500 mt-1">Try a different search term or SKU</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative hover:bg-indigo-50 hover:text-indigo-600 rounded-xl"
              onClick={() => {
                if (resetUnreadNotifications) resetUnreadNotifications();
                navigate("/notifications");
              }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 bg-red-500 text-white border-2 border-white text-[10px] font-bold">
                  {unreadCount}
                </Badge>
              )}
            </Button>

            {/* User Avatar Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`flex items-center gap-3 px-3 h-10 rounded-xl transition-all ${theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}>
                  <Avatar className="w-8 h-8 border-2 border-indigo-50">
                    {activeUser?.profilePicture ? (
                      <img src={activeUser.profilePicture} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 font-black text-[10px]">
                        {activeUser?.name ? activeUser.name.split(' ').map(n => n[0]).join('') : 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start text-left mr-1">
                    <p className="text-xs font-black leading-none">{activeUser?.name || 'User'}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{currentStore?.name}</p>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-2xl border-none">
                <DropdownMenuLabel className="px-3 py-3 border-b border-gray-50 mb-1">
                  <p className="text-sm font-black">{activeUser?.name || 'User'}</p>
                  <p className="text-[10px] text-gray-500 font-medium truncate">{activeUser?.email || ''}</p>
                  <Badge variant="outline" className="mt-2 text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border-indigo-100 px-2 py-0.5">
                    {activeUser?.role || 'User'}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuItem 
                  className="rounded-xl px-3 py-2.5 cursor-pointer font-bold text-xs"
                  onClick={() => navigate("/settings")}
                >
                  <Settings className="w-4 h-4 mr-3 text-gray-400" />
                  {activeUser?.role === "Admin" ? "Settings" : activeUser?.role || "Settings"}
                </DropdownMenuItem>
                {(!activeUser?.role || activeUser?.role === 'ADMIN' || activeUser?.role === 'MANAGER' || activeUser?.role === 'Admin' || activeUser?.role === 'Manager') && (
                <DropdownMenuItem 
                  className="rounded-xl px-3 py-2.5 cursor-pointer font-bold text-xs"
                  onClick={() => setIsSelectStoreModalOpen(true)}
                >
                  <Building2 className="w-4 h-4 mr-3 text-indigo-600" />
                  Change Store
                </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  className="rounded-xl px-3 py-2.5 cursor-pointer font-bold text-xs"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4 mr-3 text-orange-400" /> : <Moon className="w-4 h-4 mr-3 text-indigo-600" />}
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 bg-gray-50" />
                <DropdownMenuItem 
                  className="rounded-xl px-3 py-2.5 cursor-pointer font-bold text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main View Area */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <ErrorBoundary>
            {isSwitchingLoading ? (
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-1/4 rounded-xl" />
                  <Skeleton className="h-4 w-1/3 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Skeleton className="h-32 rounded-3xl" />
                  <Skeleton className="h-32 rounded-3xl" />
                  <Skeleton className="h-32 rounded-3xl" />
                  <Skeleton className="h-32 rounded-3xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <Skeleton className="lg:col-span-2 h-[400px] rounded-[2rem]" />
                  <Skeleton className="h-[400px] rounded-[2rem]" />
                </div>
              </div>
            ) : (
              <Outlet />
            )}
          </ErrorBoundary>
          <Toaster />
        </main>

        {/* Mobile Bottom Navigation Tab Bar */}
        <nav className={`lg:hidden fixed bottom-0 left-0 right-0 h-16 ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} border-t flex items-center justify-around px-2 z-50 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]`}>
          {filteredNavItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path || (item.path !== "/" && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${isActive ? "text-indigo-600" : "text-gray-400"}`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? "bg-indigo-50" : "transparent"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Floating AI Button - Hidden in POS and Reports */}
      {location.pathname !== "/pos" && location.pathname !== "/reports" && (
        <Button
          onClick={() => setIsAIModalOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-200 z-[60] group transition-all active:scale-95 flex items-center justify-center p-0"
        >
          <Sparkles className="w-6 h-6 group-hover:scale-110 transition-transform" />
          <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            Ask SellSync AI
          </span>
        </Button>
      )}

      {/* AI Assistant Modal */}
      <AskAIModal open={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />

      {/* Premium Upgrade Modal */}
      <Dialog open={isPremiumModalOpen} onOpenChange={setIsPremiumModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-indigo-600 p-10 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                <Star className="w-6 h-6 text-yellow-300 fill-yellow-300" />
              </div>
              <h2 className="text-3xl font-black tracking-tight mb-2">Upgrade to Premium</h2>
              <p className="text-indigo-100 font-medium">Take your retail business to the next level with advanced intelligence.</p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
          </div>
          
          <div className="p-10 space-y-6">
            <div className="space-y-4">
              {[
                "Unlimited stores and warehouse locations",
                "Advanced AI predictive sales forecasting",
                "Multi-user RBAC with custom permissions",
                "Priority 24/7 expert support",
                "Bulk data exports and custom API access",
                "White-label receipt branding"
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
            
            <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 mt-4">
              Start 14-Day Free Trial
            </Button>
            <p className="text-center text-xs text-gray-400 font-medium">No credit card required for trial • Cancel anytime</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Selection Modal (Step 1) */}
      <Dialog open={isSelectStoreModalOpen} onOpenChange={setIsSelectStoreModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">Change Store Context</DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500 mt-1">Select the business location you want to manage.</DialogDescription>
          </div>
          
          <div className="p-6 max-h-[400px] overflow-y-auto">
            <div className="grid gap-3">
              {allStores.map((store) => {
                const isCurrent = store.id === currentStore?.id;
                const canAccess = isAdmin || isManager || (activeUser?.assignedStoreIds || []).includes(store.id);
                if (!canAccess) return null;
                return (
                  <button
                    key={store.id}
                    disabled={isCurrent}
                    onClick={() => {
                      setPendingStore(store);
                      setIsSelectStoreModalOpen(false);
                      setIsSwitchingStore(true);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                      isCurrent
                        ? "bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed"
                        : "bg-white border-gray-100 hover:border-indigo-600 hover:shadow-md hover:shadow-indigo-100/50 group"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-colors ${
                        isCurrent ? "bg-gray-200 text-gray-400" : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white"
                      }`}>
                        {store.name?.[0] || "S"}
                      </div>
                      <div>
                        <p className="font-black text-sm text-gray-900">{store.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{(store as any).city || (store as any).state || store.address || "N/A"}</p>
                      </div>
                    </div>
                    {isCurrent ? (
                      <Badge className="bg-green-50 text-green-700 border-green-100 font-black text-[9px] uppercase tracking-tighter">Active</Badge>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-6 bg-gray-50/50 border-t border-gray-50">
            <Button 
              variant="ghost" 
              className="w-full h-12 rounded-xl font-bold text-gray-500 hover:text-gray-700"
              onClick={() => setIsSelectStoreModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Store Switching Credentials (Step 2) */}
      <Dialog open={isSwitchingStore} onOpenChange={setIsSwitchingStore}>
        <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl bg-white">
          <div className="p-8 border-b border-gray-50 bg-gray-50/50">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-100">
              <RefreshCcw className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight">
              Switch to {pendingStore?.name || "Store"}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-gray-500 mt-1">
              Enter your credentials to confirm the store switch.
            </DialogDescription>
          </div>

          <div className="p-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@sellsync.com"
                className="h-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white transition-all font-medium"
                value={switchEmail}
                onChange={(e) => setSwitchEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Password</Label>
              <Input
                id="pass"
                type="password"
                placeholder="••••••••"
                className="h-12 rounded-2xl bg-gray-50 border-gray-100 focus:bg-white transition-all font-medium"
                value={switchPassword}
                onChange={(e) => setSwitchPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStoreSwitch()}
              />
              <p className="text-[9px] text-gray-400 font-bold ml-1 uppercase tracking-tighter">* Use your assigned password for this store</p>
            </div>
          </div>

          <div className="p-8 bg-gray-50 flex flex-row gap-4">
            <Button 
              className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
              onClick={handleStoreSwitch}
              disabled={isSwitchingLoading}
            >
              {isSwitchingLoading ? (
                <RefreshCcw className="w-6 h-6 animate-spin" />
              ) : (
                "Confirm Switch"
              )}
            </Button>
            <Button 
              variant="outline"
              className="flex-1 h-14 rounded-2xl font-black text-lg border-gray-200 text-gray-500 hover:bg-white hover:text-gray-700 transition-all active:scale-[0.98]"
              onClick={() => {
                setIsSwitchingStore(false);
                setIsSelectStoreModalOpen(true); // Go back to step 1
              }}
            >
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

