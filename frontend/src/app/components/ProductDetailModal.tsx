import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { 
  Package, 
  Tag, 
  Layers, 
  BarChart3, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useStore } from "../state/store";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: any;
}

export function ProductDetailModal({ isOpen, onClose, product }: ProductDetailModalProps) {
  const { formatCurrency, theme } = useStore();

  if (!product) return null;

  const getStockStatus = (stock: number, reorderPoint: number = 40) => {
    if (stock < 10) return { label: "Critical", color: "bg-red-50 text-red-700 border-red-100", icon: AlertTriangle };
    if (stock < reorderPoint) return { label: "Low Stock", color: "bg-orange-50 text-orange-700 border-orange-100", icon: AlertTriangle };
    return { label: "Healthy", color: "bg-green-50 text-green-700 border-green-100", icon: CheckCircle2 };
  };

  const status = getStockStatus(product.stock, product.reorderPoint);
  const StatusIcon = status.icon;
  const maxStock = product.maxStock || 100;
  const stockPercentage = Math.min(100, (product.stock / maxStock) * 100);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-[600px] p-0 overflow-hidden border-none rounded-[2rem] shadow-2xl ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div className="bg-indigo-600 p-8 text-white relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl font-black border border-white/30 shadow-xl">
              {product.name[0]}
            </div>
            <div>
              <Badge className="mb-2 bg-white/20 hover:bg-white/30 text-white border-white/30 font-bold uppercase tracking-widest text-[10px]">
                {product.category}
              </Badge>
              <h2 className="text-3xl font-black tracking-tight leading-tight">{product.name}</h2>
              <p className="text-indigo-100 font-medium mt-1 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {product.sku}
              </p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        </div>

        <div className="p-8 space-y-8">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div className={`p-5 rounded-3xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} transition-all`}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <DollarSign className="w-3 h-3 text-indigo-500" /> Current Price
              </p>
              <p className="text-2xl font-black text-indigo-600">{formatCurrency(product.price)}</p>
            </div>
            <div className={`p-5 rounded-3xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'} transition-all`}>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-green-500" /> Today's Sales
              </p>
              <p className="text-2xl font-black">{product.soldToday || 0} <span className="text-sm font-bold text-gray-400">Units</span></p>
            </div>
          </div>

          {/* Stock Section */}
          <div className={`p-6 rounded-3xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                  <Layers className="w-3 h-3 text-purple-500" /> Inventory Level
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black">{product.stock}</p>
                  <p className="text-sm font-bold text-gray-400">of {maxStock} max</p>
                </div>
              </div>
              <Badge className={`${status.color} px-3 py-1.5 rounded-xl font-black uppercase tracking-widest text-[10px] border flex items-center gap-1.5`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </Badge>
            </div>
            <Progress value={stockPercentage} className="h-3 bg-gray-200 dark:bg-gray-700" indicatorClassName={status.label === 'Healthy' ? 'bg-green-500' : status.label === 'Low Stock' ? 'bg-orange-500' : 'bg-red-500'} />
          </div>

          {/* Additional Details */}
          <div className="space-y-6">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileText className="w-3 h-3 text-blue-500" /> Product Description
              </p>
              <p className={`text-sm leading-relaxed font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                {product.description || "No description provided for this product. Add one in the edit section to help with store management."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <Calendar className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Manufactured Date</p>
                  <p className="text-sm font-bold">{product.manufacturedDate ? new Date(product.manufacturedDate).toLocaleDateString() : "-"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <Calendar className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiry Date</p>
                  <p className="text-sm font-bold">{product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : "-"}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Added</p>
                  <p className="text-sm font-bold">{new Date(product.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lifetime Sold</p>
                  <p className="text-sm font-bold">{product.totalSold || 0} Units</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
