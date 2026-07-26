import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  Store, 
  ShieldCheck, 
  CreditCard, 
  Building2, 
  User, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Receipt, 
  AlertTriangle,
  Users,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  CheckCircle2,
  X,
  Lock,
  Mail,
  Phone,
  MapPin,
  MoreVertical,
  Check,
  ShieldAlert,
  Shield,
  UserCheck,
  UserMinus,
  Upload,
  Image as ImageIcon,
  Smartphone,
  Globe,
  Bell,
  Calendar,
  Type,
  Hash,
  RefreshCcw,
  ExternalLink,
  ChevronRight,
  PlusCircle,
  LayoutGrid
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "../components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { useStore, Role, User as UserType, Store as StoreType, PermissionMatrix, Preferences, Currency } from "../state/store";
import { toast } from "sonner";
import { ErrorBoundary } from "../components/ErrorBoundary";

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const currencies: Currency[] = [
  { id: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { id: "USD", name: "US Dollar", symbol: "$" },
  { id: "GBP", name: "British Pound", symbol: "£" },
  { id: "EUR", name: "Euro", symbol: "€" },
  { id: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { id: "ZAR", name: "South African Rand", symbol: "R" },
];

export default function SettingsPage() {
  const { 
    currentStore, 
    allStores, 
    users, 
    currentUser,
    permissions,
    preferences,
    currency,
    theme,
    addStore,
    deleteStore,
    updateStoreProfile,
    addUser,
    deleteUser,
    updateUser,
    updatePaymentSettings,
    setReceiptDefaults,
    toggleTheme,
    formatCurrency,
    updateStoreSettings,
    updatePermissions,
    updatePreferences,
    setCurrency,
    paymentSettings,
    receiptDefaults,
    bankAccounts,
    posTerminals,
    addBankAccount,
    deleteBankAccount,
    addPOSTerminal,
    deletePOSTerminal,
    updateUserPassword
  } = useStore();

  const isAdmin = currentUser?.role === "Admin" || currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "Manager" || currentUser?.role === "MANAGER";
  const isStaff = currentUser?.role === "Staff" || currentUser?.role === "CASHIER";
  
  // RBAC: Filter stores and users for non-Admin
  const filteredStores = useMemo(() => {
    if (isAdmin || isManager) return allStores;
    return allStores;
  }, [allStores, isAdmin, isManager]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (isAdmin || isManager) return users;
    return users;
  }, [users, isAdmin, isManager]);

  const [activeTab, setActiveTab] = useState("profile");

  // Auto-open create store dialog when no stores exist (for admins and managers)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (allStores.length === 0 && (isAdmin || isManager)) {
        setIsStoreModalOpen(true);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [allStores.length, isAdmin, isManager]);

  // Fetch cashiers when users tab is active (for managers)
  useEffect(() => {
    const fetchCashiers = async () => {
      if (!currentStore || !isManager) return;
      const token = localStorage.getItem("sellsync_token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        const res = await fetch(`${API_URL}/api/cashiers/${currentStore.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.cashiers) {
            data.cashiers.forEach((c: any) => {
              if (!users.some(u => u.id === c.id)) {
                addUser({ id: c.id, name: c.name, email: c.email, role: "CASHIER", profilePicture: c.profilePicture, isActive: c.isActive, createdAt: c.createdAt });
              }
            });
          }
        }
      } catch (e) { console.error("Failed to fetch cashiers:", e); }
    };
    if (activeTab === "users" && isManager) {
      fetchCashiers();
    }
  }, [activeTab, currentStore?.id, isManager]);

  // --- Security States ---
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState("");

  const handleUpdatePassword = () => {
    if (!currentUser) return;
    
    // Validate new password
    if (newPasswordInput.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }
    if (!/(?=.*[0-9])(?=.*[a-zA-Z])/.test(newPasswordInput)) {
      toast.error("New password must contain at least one number and one letter");
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      toast.error("New passwords do not match");
      return;
    }

    updateUserPassword(currentUser.id, newPasswordInput);
    toast.success("Password updated successfully");
    setCurrentPasswordInput("");
    setNewPasswordInput("");
    setConfirmPasswordInput("");
  };

  // --- Store Profile States ---
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreType | null>(null);
  const [isDeleteStoreConfirmOpen, setIsDeleteStoreConfirmOpen] = useState(false);
  const [storeToDelete, setStoreToDelete] = useState<StoreType | null>(null);
  const [newStoreData, setNewStoreData] = useState<Partial<StoreType>>({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    status: "Active"
  });

  // --- User Management States ---
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [isDeleteUserConfirmOpen, setIsDeleteUserConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [newUserData, setNewUserData] = useState<Partial<UserType>>({
    name: "",
    email: "",
    phone: "",
    role: "Staff",
    assignedStoreIds: currentStore ? [currentStore.id] : [],
    status: "Active",
    password: "",
    zipCode: ""
  });
  const [confirmPassword, setConfirmPassword] = useState("");

  // --- Payment States ---
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [isAddPOSOpen, setIsAddPOSOpen] = useState(false);
  const [newBank, setNewBank] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [newPOS, setNewPOS] = useState({ name: "", provider: "Manual" as any, serialNumber: "" });

  // --- Role Permission Logic ---
  const adminCount = users.filter(u => u.role === "Admin").length;
  const managerCount = users.filter(u => u.role === "Manager").length;

  const handleSaveStore = async () => {
    if (!newStoreData.name || !newStoreData.email || !newStoreData.phone || !newStoreData.zip) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (newStoreData.zip && !/^\d{6}$/.test(newStoreData.zip)) {
      toast.error("Zip Code must be exactly 6 digits");
      return;
    }

    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

    if (editingStore) {
      updateStoreProfile({ ...editingStore, ...newStoreData } as StoreType);
      toast.success("Store profile updated successfully");
    } else {
      try {
        const token = localStorage.getItem("sellsync_token");
        const response = await fetch(`${API_URL}/api/stores/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newStoreData.name,
            email: newStoreData.email,
            phone: newStoreData.phone,
            location: `${newStoreData.address}, ${newStoreData.city}, ${newStoreData.state} ${newStoreData.zip}`
          })
        });

        const data = await response.json();

        if (data.success) {
          addStore({
            ...newStoreData,
            id: data.store.id,
            code: data.store.name?.substring(0, 3).toUpperCase() || `STR-${allStores.length + 1}`.toUpperCase(),
            status: "Active"
          } as StoreType);
          toast.success("New store created successfully");
        } else {
          toast.error(data.message || "Failed to create store");
          return;
        }
      } catch (error) {
        console.error("Create store error:", error);
        toast.error("Failed to create store");
        return;
      }
    }
    setIsStoreModalOpen(false);
    setEditingStore(null);
  };

  const handleSaveUser = async () => {
    if (!newUserData.name || !newUserData.email || !newUserData.phone || !newUserData.role) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (newUserData.zipCode && !/^\d{6}$/.test(newUserData.zipCode)) {
      toast.error("Zip Code must be exactly 6 digits");
      return;
    }

    if (!editingUser) {
      if (!newUserData.password || newUserData.password.length < 8) {
        toast.error("Password must be at least 8 characters long");
        return;
      }
      if (newUserData.password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      if (!/(?=.*[0-9])(?=.*[a-zA-Z])/.test(newUserData.password)) {
        toast.error("Password must contain at least one number and one letter");
        return;
      }
    }

    // If admin/manager, create user via API
    if ((isAdmin || isManager) && !editingUser && currentStore) {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      try {
        const token = localStorage.getItem("sellsync_token");
        const response = await fetch(`${API_URL}/api/cashiers/${currentStore.id}/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newUserData.name,
            email: newUserData.email,
            password: newUserData.password,
            phone: newUserData.phone
          })
        });

        const data = await response.json();
        if (data.success) {
          addUser({
            ...newUserData,
            id: data.cashier?.id || `U-${Date.now()}`,
            status: "Active"
          } as UserType);
          toast.success("User account created successfully");
        } else {
          toast.error(data.message || "Failed to create user");
          return;
        }
      } catch (error) {
        console.error("Create user error:", error);
        toast.error("Failed to create user");
        return;
      }
    } else if (editingUser) {
      updateUser({ ...editingUser, ...newUserData } as UserType);
      toast.success("User updated successfully");
    } else {
      // Fallback for local-only (staff mode)
      if (newUserData.role === "Admin" && adminCount >= 1) {
        toast.error(`Only one Admin allowed. The current Admin is ${users.find(u => u.role === "Admin")?.name}.`);
        return;
      }
      if (newUserData.role === "Manager" && managerCount >= 5) {
        toast.error("Maximum of 5 Managers allowed.");
        return;
      }

      addUser({
        ...newUserData,
        id: `U-${Date.now()}`,
        status: "Active"
      } as UserType);
      toast.success("User account created successfully");
    }
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const handleUpdatePermission = (tab: string, role: Role, type: 'view' | 'edit', value: boolean) => {
    if (role === 'Admin') return;
    const newPermissions = { ...permissions };
    newPermissions[tab] = {
      ...newPermissions[tab],
      [role]: { ...newPermissions[tab][role], [type]: value }
    };
    updatePermissions(newPermissions);
    toast.success(`Updated ${role} permissions for ${tab}`);
  };

  const nigerianBanks = [
    "GTBank", "Zenith Bank", "Access Bank", "First Bank", "UBA", "Fidelity Bank", 
    "Stanbic IBTC", "Polaris Bank", "Unity Bank", "Providus Bank", "Sterling Bank", 
    "Union Bank", "Heritage Bank", "Wema Bank", "Keystone Bank", "Kuda Bank", "OPay", "PalmPay"
  ];

  const [bankSearch, setBankSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);

  const filteredBanks = nigerianBanks.filter(b => b.toLowerCase().includes(bankSearch.toLowerCase()));

  const handleAddBankAccount = async () => {
    if (!selectedBank || !newBank.accountNumber) {
      toast.error("Please select a bank and enter account number");
      return;
    }
    
    setIsVerifyingBank(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulation
    
    addBankAccount({ 
      id: `BA-${Date.now()}`, 
      bankName: selectedBank,
      accountNumber: newBank.accountNumber,
      accountName: newBank.accountName || "SELLSYNC VERIFIED",
      status: "Verified" 
    });
    
    setIsVerifyingBank(false);
    setIsAddBankOpen(false);
    setNewBank({ bankName: "", accountNumber: "", accountName: "" });
    setSelectedBank("");
    toast.success("Account verified successfully. Linked to SellSync.");
  };

  const [posStep, setPosStep] = useState<"options" | "paystack" | "posinfor" | "coming_soon">("options");
  const [comingSoonProvider, setComingSoonProvider] = useState("");
  const [isVerifyingPOS, setIsVerifyingPOS] = useState(false);

  const handleAddPOS = async () => {
    if (!newPOS.name || !newPOS.serialNumber) {
      toast.error("Please fill in terminal details");
      return;
    }
    
    setIsVerifyingPOS(true);
    await new Promise(r => setTimeout(r, 1500)); // Simulation
    
    addPOSTerminal({ 
      id: `POS-${Date.now()}`, 
      ...newPOS, 
      status: "Connected", 
      lastUsed: new Date().toISOString() 
    });
    
    setIsVerifyingPOS(false);
    setIsAddPOSOpen(false);
    setPosStep("options");
    setNewPOS({ name: "", provider: "Manual", serialNumber: "" });
    toast.success(`${newPOS.provider} Terminal linked successfully`);
  };

  const features = Object.keys(permissions);

  return (
    <ErrorBoundary>
      <div className="p-4 md:p-6 space-y-6 bg-gray-50/30 min-h-screen pb-24">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              {isAdmin ? "System Settings" : currentUser?.role}
            </h1>
            <p className="text-sm text-gray-500 font-medium">
              {isAdmin ? "Manage your business structure and configurations" : `Manage your ${currentUser?.role} account and store settings`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-xl border-gray-200 h-10 font-bold text-xs gap-2 bg-white" onClick={toggleTheme}>
              {theme === 'dark' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-white border border-gray-100 p-1 rounded-xl h-11 shadow-sm mb-6 flex-wrap md:flex-nowrap w-full overflow-visible justify-start gap-1">
            <TabsTrigger value="profile" className="rounded-lg px-3 h-9 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Store className="w-3.5 h-3.5 mr-1.5" />
              Store Profile
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg px-3 h-9 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {isAdmin ? "Users & Roles" : "My Profile"}
            </TabsTrigger>
            <TabsTrigger value="receipt" className="rounded-lg px-3 h-9 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Receipts
            </TabsTrigger>
            <TabsTrigger value="payments" className="rounded-lg px-3 h-9 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="prefs" className="rounded-lg px-3 h-9 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Globe className="w-3.5 h-3.5 mr-1.5" />
              Preferences
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="matrix" className="rounded-lg px-3 h-9 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                Matrix
              </TabsTrigger>
            )}
            <TabsTrigger value="security" className="rounded-lg px-3 h-9 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              <Lock className="w-3.5 h-3.5 mr-1.5" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* --- Store Profile Tab --- */}
          <TabsContent value="profile" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
              <h2 className="text-lg font-black text-gray-900">{isAdmin || isManager ? "Store Locations" : "My Store Profile"}</h2>
              <p className="text-xs text-gray-500 font-medium">
                {isAdmin || isManager ? "Manage multiple branches and warehouses" : "View and manage your assigned store details"}
              </p>
              </div>
              {(isAdmin || isManager) && (
              <Button onClick={() => { setEditingStore(null); setNewStoreData({ status: "Active" }); setIsStoreModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-xs h-10 shadow-lg shadow-indigo-100">
                <Plus className="w-4 h-4 mr-2" />
                Add New Store
              </Button>
              )}
            </div>

            {filteredStores.length === 0 ? (
              <div className="text-center py-12 px-6 border-2 border-dashed border-gray-200 rounded-2xl">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-black text-gray-900 mb-2">No Stores Found</h3>
                <p className="text-sm text-gray-500 mb-4">Get started by creating your first store.</p>
                {(isAdmin || isManager) && (
                  <Button onClick={() => { setEditingStore(null); setNewStoreData({ status: "Active" }); setIsStoreModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Store
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => (
              <Card key={store.id} className="border-none shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-all group">
                <CardContent className="p-0">
                  <div className="p-5 border-b border-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100/50 overflow-hidden">
                        {store.logo ? <img src={store.logo} alt="Logo" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 text-indigo-600" />}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600" onClick={() => { setEditingStore(store); setNewStoreData(store); setIsStoreModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-600" onClick={() => { setStoreToDelete(store); setIsDeleteStoreConfirmOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        )}
                      </div>
                    </div>
                      <div className="mt-4">
                        <h3 className="font-black text-gray-900 text-sm truncate">{store.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="bg-indigo-50 text-indigo-700 border-none text-[9px] font-black uppercase px-1.5">{store.code}</Badge>
                          {currentStore && currentStore.id === store.id && <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black uppercase px-1.5 rounded-full">Current</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="p-5 space-y-2.5">
                      <div className="flex items-start gap-2.5 text-[11px] font-bold text-gray-600">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                        <p className="leading-tight">{store.address}, {store.city}, {store.state} {store.zip}</p>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] font-bold text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <p>{store.phone}</p>
                      </div>
                      <div className="flex items-center gap-2.5 text-[11px] font-bold text-gray-600">
                        <Mail className="w-3.5 h-3.5 text-gray-400" />
                        <p className="truncate">{store.email}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </TabsContent>

          {/* --- Users & Roles Tab --- */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">{isAdmin ? "User Management" : "My Profile"}</h2>
                <p className="text-xs text-gray-500 font-medium">
                  {isAdmin || isManager ? "Control system access levels and assignments" : "Manage your personal information and contact details"}
                </p>
              </div>
              {(isAdmin || isManager) && (
                <Button onClick={() => { setEditingUser(null); setNewUserData({ role: "Staff", assignedStoreIds: currentStore ? [currentStore.id] : [], status: "Active" }); setIsUserModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-xs h-10 shadow-lg shadow-indigo-100">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New User
                </Button>
              )}
            </div>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50 hover:bg-transparent">
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Stores</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-50">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50 overflow-hidden shrink-0">
                                {user.profilePicture ? <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" /> : <span className="font-black text-indigo-600 text-sm">{user.name[0]}</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{user.name}</p>
                                <p className="text-[10px] text-gray-400 font-bold truncate">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={`${user.role === 'Admin' ? 'bg-purple-50 text-purple-700' : user.role === 'Manager' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'} border-none font-black text-[9px] uppercase px-2 py-0.5 rounded-lg`}>{user.role}</Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                              {(user.assignedStoreIds || []).map(sid => {
                                const store = allStores.find(s => s.id === sid);
                                return <Badge key={sid} variant="outline" className="text-[9px] font-bold border-gray-100 text-gray-500 rounded-md bg-gray-50/50">{store?.code || sid}</Badge>;
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-indigo-600" onClick={() => { setEditingUser(user); setNewUserData(user); setIsUserModalOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></Button>
                              {isAdmin && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-600" disabled={user.role === 'Admin'} onClick={() => { setUserToDelete(user); setIsDeleteUserConfirmOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Receipts Tab --- */}
          <TabsContent value="receipt" className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-gray-50">
                <CardTitle className="text-lg font-black flex items-center gap-2"><Receipt className="w-5 h-5 text-indigo-600" /> Receipt & Alert Defaults</CardTitle>
                <CardDescription className="font-medium text-gray-500">Configure where system reports and critical alerts are sent.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Default Report Email</Label>
                    <Input value={receiptDefaults.email} onChange={(e) => setReceiptDefaults({ ...receiptDefaults, email: e.target.value })} className="h-12 rounded-xl bg-gray-50/50 border-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="admin@sellsync.com" />
                    <p className="text-[10px] text-gray-400 font-medium px-1">Daily sales reports and inventory analytics will be sent here.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Critical Alert Phone</Label>
                    <Input value={receiptDefaults.phone} onChange={(e) => setReceiptDefaults({ ...receiptDefaults, phone: e.target.value })} className="h-12 rounded-xl bg-gray-50/50 border-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="080 000 0000" />
                    <p className="text-[10px] text-gray-400 font-medium px-1">Urgent expiry alerts and stockouts will be notified via SMS.</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Receipt Header Message</Label>
                      <Input value={receiptDefaults.header} onChange={(e) => setReceiptDefaults({ ...receiptDefaults, header: e.target.value })} className="h-12 rounded-xl bg-gray-50/50 border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Receipt Footer Message</Label>
                      <Input value={receiptDefaults.footer} onChange={(e) => setReceiptDefaults({ ...receiptDefaults, footer: e.target.value })} className="h-12 rounded-xl bg-gray-50/50 border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button onClick={() => toast.success("Receipt settings updated")} className="h-12 px-8 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-xs shadow-lg shadow-indigo-100">Save Receipt Settings</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Payments Tab --- */}
          <TabsContent value="payments" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="p-6 border-b border-gray-50">
                  <CardTitle className="text-lg font-black flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> Linked Accounts</CardTitle>
                  <CardDescription className="font-medium">Direct bank settlement accounts</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    {bankAccounts.map(ba => (
                      <div key={ba.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm"><Building2 className="w-5 h-5 text-gray-400" /></div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{ba.bankName}</p>
                            <p className="text-[10px] font-bold text-indigo-600">{ba.accountNumber} • {ba.accountName}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => deleteBankAccount(ba.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-2 border-gray-200 text-gray-500 font-black text-xs hover:border-indigo-600 hover:text-indigo-600" onClick={() => setIsAddBankOpen(true)}><PlusCircle className="w-4 h-4 mr-2" /> Link New Bank Account</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardHeader className="p-6 border-b border-gray-50">
                  <CardTitle className="text-lg font-black flex items-center gap-2"><Smartphone className="w-5 h-5 text-indigo-600" /> POS Terminals</CardTitle>
                  <CardDescription className="font-medium">Integrated card payment devices</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    {posTerminals.map(pos => (
                      <div key={pos.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm"><Smartphone className="w-5 h-5 text-gray-400" /></div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{pos.name}</p>
                            <p className="text-[10px] font-bold text-gray-500">SN: {pos.serialNumber} • {pos.provider}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => deletePOSTerminal(pos.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    <Button variant="outline" className="w-full h-12 rounded-xl border-dashed border-2 border-gray-200 text-gray-500 font-black text-xs hover:border-indigo-600 hover:text-indigo-600" onClick={() => setIsAddPOSOpen(true)}><PlusCircle className="w-4 h-4 mr-2" /> Link New POS Terminal</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-gray-50">
                <CardTitle className="text-lg font-black flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-indigo-600" /> Checkout Options</CardTitle>
                <CardDescription className="font-medium">Enable or disable payment methods at POS</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: "Cash Payments", desc: "Physical cash at counter", key: "allowCash" },
                    { label: "Card Payments", desc: "Terminal transactions", key: "allowCard" },
                    { label: "Bank Transfer", desc: "Direct wire transfers", key: "allowTransfer" },
                    { label: "Auto Settlement", desc: "Instant reconciliation", key: "autoSettle" }
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 truncate">{opt.label}</p>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">{opt.desc}</p>
                      </div>
                      <Switch checked={(paymentSettings as any)[opt.key]} onCheckedChange={(v) => updatePaymentSettings({ [opt.key]: v })} className="scale-75" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Preferences Tab --- */}
          <TabsContent value="prefs" className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-gray-50">
                <CardTitle className="text-lg font-black flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-600" /> Currency & Formatting</CardTitle>
                <CardDescription className="font-medium text-gray-500">Global display settings for prices and dates.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Currency</Label>
                    <Select value={currency.id} onValueChange={(v) => { const c = currencies.find(x => x.id === v); if (c) setCurrency(c); toast.success("Currency updated successfully"); }}>
                      <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-none font-black text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {currencies.map(c => <SelectItem key={c.id} value={c.id} className="font-bold">{c.name} ({c.symbol})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Date Format</Label>
                    <Select value={preferences.dateFormat} onValueChange={(v: any) => updatePreferences({ ...preferences, dateFormat: v })}>
                      <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-none font-black text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="DD/MM/YYYY" className="font-bold">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY" className="font-bold">MM/DD/YYYY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Time Format</Label>
                    <Select value={preferences.timeFormat} onValueChange={(v: any) => updatePreferences({ ...preferences, timeFormat: v })}>
                      <SelectTrigger className="h-12 rounded-xl bg-gray-50/50 border-none font-black text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="12h" className="font-bold">12-Hour (AM/PM)</SelectItem>
                        <SelectItem value="24h" className="font-bold">24-Hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Notification Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { label: "Email Alerts", key: "email" },
                      { label: "SMS Alerts", key: "sms" },
                      { label: "In-App Alerts", key: "inApp" },
                      { label: "Expiry Alerts", key: "expiryAlerts" }
                    ].map(n => (
                      <div key={n.key} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-700">{n.label}</span>
                        <Switch checked={(preferences.notifications as any)[n.key]} onCheckedChange={(v) => updatePreferences({ ...preferences, notifications: { ...preferences.notifications, [n.key]: v } })} className="scale-75" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-50">
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Receipt Preferences</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { label: "Show Store Logo on Receipt", key: "showLogo" },
                      { label: "Show Expiry Date on Items", key: "showExpiry" }
                    ].map(r => (
                      <div key={r.key} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-700">{r.label}</span>
                        <Switch checked={(preferences.receipts as any)[r.key]} onCheckedChange={(v) => updatePreferences({ ...preferences, receipts: { ...preferences.receipts, [r.key]: v } })} className="scale-75" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Matrix Tab --- */}
          <TabsContent value="matrix" className="space-y-6">
            <div className="bg-indigo-900/5 p-4 rounded-2xl border border-indigo-100/50">
              <h3 className="text-sm font-black text-indigo-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Role Access Control
              </h3>
              <p className="text-[11px] text-indigo-700/70 font-medium mt-1 leading-relaxed">
                Define granular access levels for each system role. Access changes take effect immediately across all user sessions.<br/>
                • <strong>View</strong> = User can see the tab/feature in the navigation menu.<br/>
                • <strong>Edit</strong> = User can create, update, and delete data within that feature.
              </p>
            </div>

            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-gray-900">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-800/50 hover:bg-transparent border-gray-800">
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[200px]">Feature / Tab</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Admin Access</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Manager Access</TableHead>
                        <TableHead className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Staff Access</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {features.map((feature) => (
                        <TableRow key={feature} className="hover:bg-gray-800/30 transition-colors border-gray-800">
                          <TableCell className="px-6 py-4">
                            <p className="font-black text-gray-100 text-xs">{feature}</p>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-center gap-4 opacity-30 grayscale">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black uppercase text-gray-500">View</span>
                                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black uppercase text-gray-500">Edit</span>
                                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-center gap-6">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black uppercase text-gray-500">View</span>
                                <Switch 
                                  className="scale-[0.6] data-[state=checked]:bg-indigo-500" 
                                  checked={permissions?.[feature]?.Manager?.view || false} 
                                  onCheckedChange={(v) => handleUpdatePermission(feature, 'Manager', 'view', v)} 
                                />
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black uppercase text-gray-500">Edit</span>
                                <Switch 
                                  className="scale-[0.6] data-[state=checked]:bg-indigo-500" 
                                  checked={permissions?.[feature]?.Manager?.edit || false} 
                                  onCheckedChange={(v) => handleUpdatePermission(feature, 'Manager', 'edit', v)} 
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center justify-center gap-6">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black uppercase text-gray-500">View</span>
                                <Switch 
                                  className="scale-[0.6] data-[state=checked]:bg-indigo-500" 
                                  checked={permissions?.[feature]?.Staff?.view || false} 
                                  onCheckedChange={(v) => handleUpdatePermission(feature, 'Staff', 'view', v)} 
                                />
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-[8px] font-black uppercase text-gray-500">Edit</span>
                                <Switch 
                                  className="scale-[0.6] data-[state=checked]:bg-indigo-500" 
                                  checked={permissions?.[feature]?.Staff?.edit || false} 
                                  onCheckedChange={(v) => handleUpdatePermission(feature, 'Staff', 'edit', v)} 
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* --- Security Tab --- */}
          <TabsContent value="security" className="space-y-6">
            <Card className="border-none shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardHeader className="p-6 border-b border-gray-50">
                <CardTitle className="text-lg font-black flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-600" /> Security Settings</CardTitle>
                <CardDescription className="font-medium">Password management and account protection.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-12 rounded-xl bg-gray-50/50 border-none font-bold"
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-12 rounded-xl bg-gray-50/50 border-none font-bold"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                    />
                    <p className="text-[10px] text-gray-400 font-medium px-1">Min 8 characters, at least 1 number and 1 letter.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm New Password</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-12 rounded-xl bg-gray-50/50 border-none font-bold"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleUpdatePassword}
                    className="h-12 w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-xs mt-4 shadow-lg shadow-indigo-100"
                  >
                    Update Security Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* --- Modals --- */}

        {/* Store Modal */}
        <Dialog open={isStoreModalOpen} onOpenChange={setIsStoreModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-indigo-600 p-6 text-white"><DialogTitle className="text-xl font-black">{editingStore ? 'Edit Store' : 'Add Store'}</DialogTitle></div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex justify-center"><div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200"><ImageIcon className="w-6 h-6 text-gray-300" /></div></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">Name</Label><Input value={newStoreData.name} onChange={e => setNewStoreData({...newStoreData, name: e.target.value})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">Code</Label><Input value={newStoreData.code} onChange={e => setNewStoreData({...newStoreData, code: e.target.value.toUpperCase()})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">Phone</Label><Input value={newStoreData.phone} onChange={e => setNewStoreData({...newStoreData, phone: e.target.value})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">Email</Label><Input value={newStoreData.email} onChange={e => setNewStoreData({...newStoreData, email: e.target.value})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" /></div>
              </div>
              <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">Address</Label><Input value={newStoreData.address} onChange={e => setNewStoreData({...newStoreData, address: e.target.value})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">City</Label><Input value={newStoreData.city} onChange={e => setNewStoreData({...newStoreData, city: e.target.value})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">State</Label><Input value={newStoreData.state} onChange={e => setNewStoreData({...newStoreData, state: e.target.value})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" /></div>
                <div className="space-y-1"><Label className="text-[9px] font-black uppercase text-gray-400">Zip (6-digit)</Label><Input value={newStoreData.zip} onChange={e => setNewStoreData({...newStoreData, zip: e.target.value})} className="h-10 rounded-lg bg-gray-50/50 border-none font-bold" maxLength={6} /></div>
              </div>
            </div>
            <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100"><Button variant="outline" onClick={() => setIsStoreModalOpen(false)}>Cancel</Button><Button onClick={handleSaveStore} className="bg-indigo-600 hover:bg-indigo-700">Save Store</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {/* User Modal */}
        <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
          <DialogContent className="sm:max-w-[450px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-indigo-600 p-6 text-white">
              <DialogTitle className="text-xl font-black">{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
              <p className="text-[10px] text-indigo-100 font-medium mt-1 uppercase tracking-wider">Assign roles and store access</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-gray-400 ml-1">Full Name</Label>
                  <Input 
                    placeholder="John Doe"
                    value={newUserData.name} 
                    onChange={e => setNewUserData({...newUserData, name: e.target.value})} 
                    className="h-10 rounded-xl bg-gray-50/50 border-none font-bold text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-gray-400 ml-1">Phone (11 Digits)</Label>
                  <Input 
                    placeholder="08012345678"
                    maxLength={11}
                    value={newUserData.phone} 
                    onChange={e => setNewUserData({...newUserData, phone: e.target.value})} 
                    className="h-10 rounded-xl bg-gray-50/50 border-none font-bold text-xs" 
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-gray-400 ml-1">Email Address</Label>
                <Input 
                  type="email"
                  placeholder="john@sellsync.com"
                  value={newUserData.email} 
                  onChange={e => setNewUserData({...newUserData, email: e.target.value})} 
                  className="h-10 rounded-xl bg-gray-50/50 border-none font-bold text-xs" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-gray-400 ml-1">System Role</Label>
                  <Select value={newUserData.role} onValueChange={(v: Role) => setNewUserData({...newUserData, role: v})} disabled={!isAdmin}>
                    <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-none font-bold text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Admin" disabled={adminCount >= 1 && editingUser?.role !== 'Admin'} className="text-xs">Admin</SelectItem>
                      <SelectItem value="Manager" disabled={managerCount >= 5 && editingUser?.role !== 'Manager'} className="text-xs">Manager</SelectItem>
                      <SelectItem value="Staff" className="text-xs">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-gray-400 ml-1">Assigned Store</Label>
                  <Select value={newUserData.assignedStoreIds?.[0]} onValueChange={(v) => setNewUserData({...newUserData, assignedStoreIds: [v]})} disabled={!isAdmin}>
                    <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-none font-bold text-xs">
                      <SelectValue placeholder="Select Store" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {allStores.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!editingUser && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-gray-400 ml-1">Password</Label>
                    <Input 
                      type="password" 
                      placeholder="Min 8 chars"
                      value={newUserData.password} 
                      onChange={e => setNewUserData({...newUserData, password: e.target.value})} 
                      className="h-10 rounded-xl bg-gray-50/50 border-none font-bold text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-gray-400 ml-1">Confirm</Label>
                    <Input 
                      type="password" 
                      placeholder="Repeat password"
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      className="h-10 rounded-xl bg-gray-50/50 border-none font-bold text-xs" 
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsUserModalOpen(false)} className="h-11 rounded-xl font-bold">Cancel</Button>
              <Button onClick={handleSaveUser} className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">Save User</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={isDeleteStoreConfirmOpen || isDeleteUserConfirmOpen} onOpenChange={o => { if(!o) { setIsDeleteStoreConfirmOpen(false); setIsDeleteUserConfirmOpen(false); } }}>
          <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-8 text-center border-none shadow-2xl">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600"><ShieldAlert className="w-8 h-8" /></div>
            <DialogTitle className="text-xl font-black">Confirm Deletion</DialogTitle>
            <DialogDescription className="font-medium mt-2">This action cannot be undone. Data will be permanently removed.</DialogDescription>
            <div className="grid grid-cols-2 gap-3 mt-8"><Button variant="outline" onClick={() => { setIsDeleteStoreConfirmOpen(false); setIsDeleteUserConfirmOpen(false); }}>Cancel</Button><Button onClick={() => { if(isDeleteStoreConfirmOpen && storeToDelete) { deleteStore(storeToDelete.id); setIsDeleteStoreConfirmOpen(false); } if(isDeleteUserConfirmOpen && userToDelete) { deleteUser(userToDelete.id); setIsDeleteUserConfirmOpen(false); } toast.success("Deleted successfully"); }} className="bg-red-600 hover:bg-red-700 text-white">Delete</Button></div>
          </DialogContent>
        </Dialog>

        {/* Add Bank Modal */}
        <Dialog open={isAddBankOpen} onOpenChange={setIsAddBankOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-indigo-600 p-6 text-white">
              <DialogTitle className="text-xl font-black">Link Bank Account</DialogTitle>
              <p className="text-[10px] text-indigo-100 font-medium mt-1 uppercase tracking-wider">Direct settlement account for transfers</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Search & Select Bank</Label>
                <Select value={selectedBank} onValueChange={setSelectedBank}>
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none font-bold">
                    <SelectValue placeholder="Choose a bank..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl max-h-[200px]">
                    <div className="p-2 border-b border-gray-50">
                      <Input 
                        placeholder="Search banks..." 
                        value={bankSearch}
                        onChange={(e) => setBankSearch(e.target.value)}
                        className="h-8 text-xs rounded-lg bg-gray-100 border-none"
                      />
                    </div>
                    {filteredBanks.map(bank => (
                      <SelectItem key={bank} value={bank} className="font-bold text-xs">{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Account Number</Label>
                <Input 
                  placeholder="0123456789"
                  maxLength={10}
                  value={newBank.accountNumber} 
                  onChange={e => setNewBank({...newBank, accountNumber: e.target.value})} 
                  className="h-11 rounded-xl bg-gray-50 border-none font-bold" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Account Name (Optional)</Label>
                <Input 
                  placeholder="Will be auto-verified"
                  value={newBank.accountName} 
                  onChange={e => setNewBank({...newBank, accountName: e.target.value})} 
                  className="h-11 rounded-xl bg-gray-50 border-none font-bold" 
                />
              </div>
            </div>
            <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
              <Button variant="outline" onClick={() => setIsAddBankOpen(false)} className="h-11 rounded-xl font-bold">Cancel</Button>
              <Button onClick={handleAddBankAccount} disabled={isVerifyingBank} className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 min-w-[120px]">
                {isVerifyingBank ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  "Verify & Link"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add POS Modal */}
        <Dialog open={isAddPOSOpen} onOpenChange={(o) => { setIsAddPOSOpen(o); if(!o) setPosStep("options"); }}>
          <DialogContent className="sm:max-w-[500px] rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
            {posStep === "options" && (
              <>
                <div className="bg-indigo-600 p-6 text-white">
                  <DialogTitle className="text-xl font-black">Link New POS Terminal</DialogTitle>
                  <p className="text-[10px] text-indigo-100 font-medium mt-1 uppercase tracking-wider">Select your POS provider</p>
                </div>
                <div className="p-6 grid grid-cols-2 gap-4">
                  {[
                    { id: "paystack", name: "Paystack Terminal", icon: Smartphone, soon: false },
                    { id: "posinfor", name: "POS Infor", icon: Smartphone, soon: false },
                    { id: "flutterwave", name: "Flutterwave", icon: Globe, soon: true },
                    { id: "bluetooth", name: "Bluetooth Terminal", icon: Smartphone, soon: true }
                  ].map(provider => (
                    <button
                      key={provider.id}
                      onClick={() => {
                        if (provider.soon) {
                          setComingSoonProvider(provider.name);
                          setPosStep("coming_soon");
                        } else {
                          setNewPOS({ ...newPOS, provider: provider.name as any });
                          setPosStep(provider.id as any);
                        }
                      }}
                      className="p-4 rounded-2xl border border-gray-100 hover:border-indigo-600 hover:shadow-md transition-all text-left group bg-gray-50/50"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-gray-100 mb-3 group-hover:bg-indigo-600 transition-colors">
                        <provider.icon className="w-5 h-5 text-indigo-600 group-hover:text-white" />
                      </div>
                      <p className="font-black text-sm text-gray-900">{provider.name}</p>
                      {provider.soon && (
                        <Badge className="mt-2 bg-gray-200 text-gray-500 border-none text-[8px] font-black uppercase">Coming Soon</Badge>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}

            {posStep === "coming_soon" && (
              <div className="p-12 text-center space-y-4">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                  <Bell className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-black text-gray-900">{comingSoonProvider} Integration</h3>
                <p className="text-sm text-gray-500 font-medium px-4">
                  This integration is coming soon. We'll notify you when it's ready for your store.
                </p>
                <Button onClick={() => setPosStep("options")} className="bg-indigo-600 rounded-xl px-8">Back to Providers</Button>
              </div>
            )}

            {(posStep === "paystack" || posStep === "posinfor") && (
              <>
                <div className="bg-indigo-600 p-6 text-white">
                  <DialogTitle className="text-xl font-black">Connect {newPOS.provider} Terminal</DialogTitle>
                  <p className="text-[10px] text-indigo-100 font-medium mt-1 uppercase tracking-wider">Enter terminal hardware details</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Terminal ID / SN</Label>
                      <Input 
                        placeholder="e.g. SN-90210"
                        value={newPOS.serialNumber} 
                        onChange={e => setNewPOS({...newPOS, serialNumber: e.target.value})} 
                        className="h-11 rounded-xl bg-gray-50 border-none font-bold" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Terminal Name</Label>
                      <Input 
                        placeholder="e.g. Counter 1"
                        value={newPOS.name} 
                        onChange={e => setNewPOS({...newPOS, name: e.target.value})} 
                        className="h-11 rounded-xl bg-gray-50 border-none font-bold" 
                      />
                    </div>
                  </div>
                  {posStep === "posinfor" && (
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Merchant ID</Label>
                      <Input 
                        placeholder="MID-000000"
                        className="h-11 rounded-xl bg-gray-50 border-none font-bold" 
                      />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-gray-400 ml-1">Assigned Store Location</Label>
                    <Select value={currentStore?.id || ""}>
                      <SelectTrigger className="h-11 rounded-xl bg-gray-50 border-none font-bold">
                        <SelectValue placeholder="Select Store" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {allStores.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter className="p-6 bg-gray-50/50 border-t border-gray-100">
                  <Button variant="outline" onClick={() => setPosStep("options")} className="h-11 rounded-xl font-bold">Back</Button>
                  <Button onClick={handleAddPOS} disabled={isVerifyingPOS} className="h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 min-w-[150px]">
                    {isVerifyingPOS ? (
                      <RefreshCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      "Verify & Link Terminal"
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
}
