import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../state/store";

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: any; // For editing
  onSave?: (productData: any) => void;
}

export function AddProductModal({ isOpen, onClose, product, onSave }: AddProductModalProps) {
  const { categories, currency, inventoryArray } = useStore();
  const [formData, setFormData] = useState({
    name: "",
    category: "Medicine",
    price: 0,
    costPrice: 0,
    stock: 0,
    reorderPoint: 30,
    sku: "",
    barcode: "",
    supplier: "",
    manufacturedDate: "",
    expiryDate: "",
  });

  // Track if the SKU has been manually edited by the user
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        category: product.category || "Medicine",
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        stock: product.stock || 0,
        reorderPoint: product.reorderPoint || 30,
        sku: product.sku || "",
        barcode: product.barcode || "",
        supplier: product.supplier || "",
        manufacturedDate: product.manufacturedDate || "",
        expiryDate: product.expiryDate || "",
      });
      setIsSkuManuallyEdited(true); // Don't auto-generate for existing products
    } else {
      setFormData({
        name: "",
        category: "Medicine",
        price: 0,
        costPrice: 0,
        stock: 0,
        reorderPoint: 30,
        sku: "",
        barcode: "",
        supplier: "",
        manufacturedDate: "",
        expiryDate: "",
      });
      setIsSkuManuallyEdited(false);
    }
  }, [product, isOpen]);

  // Auto-generate SKU logic
  useEffect(() => {
    if (!product && !isSkuManuallyEdited && formData.name.trim() !== "" && formData.category) {
      const prefix = formData.category.substring(0, 3).toUpperCase();
      const sequentialNumber = (inventoryArray.length + 1).toString().padStart(3, "0");
      const generatedSku = `${prefix}-${sequentialNumber}`;
      
      setFormData(prev => ({ ...prev, sku: generatedSku }));
    }
  }, [formData.name, formData.category, inventoryArray.length, product, isSkuManuallyEdited]);

  const handleSave = () => {
    if (!formData.name || !formData.sku) {
      toast.error("Product name and SKU are required");
      return;
    }

    onSave?.(formData);
    toast.success(product ? "Product updated successfully" : "Product added successfully");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-black text-gray-900">{product ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription className="text-gray-500 font-medium mt-1">
                {product ? "Update product details and stock information." : "Enter details to add a new item to your inventory."}
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-400" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto bg-gray-50/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Product Name *</Label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Organic Green Tea"
                className="h-12 bg-white border-gray-200 rounded-xl focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Category *</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger className="h-12 bg-white border-gray-200 rounded-xl">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {categories.length > 0 ? (
                    categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                  ) : (
                    <SelectItem value="none" disabled>No categories yet</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Selling Price ({currency.symbol}) *</Label>
              <Input 
                type="number"
                value={formData.price || ""} 
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                placeholder="0.00"
                className="h-12 bg-white border-gray-200 rounded-xl focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Cost Price ({currency.symbol})</Label>
              <Input 
                type="number"
                value={formData.costPrice || ""} 
                onChange={e => setFormData({...formData, costPrice: Number(e.target.value)})}
                placeholder="0.00 (Optional)"
                className="h-12 bg-white border-gray-200 rounded-xl focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-gray-400">Current Stock</Label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="h-10 rounded-lg bg-gray-50/50 border-none font-bold"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-gray-400">Low Stock Threshold</Label>
              <Input
                type="number"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value) || 0 })}
                className="h-10 rounded-lg bg-gray-50/50 border-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">SKU / Barcode</Label>
              <Input 
                value={formData.sku} 
                onChange={e => {
                  setFormData({...formData, sku: e.target.value});
                  setIsSkuManuallyEdited(true);
                }}
                placeholder="Auto-generated if empty"
                className="h-12 bg-white border-gray-200 rounded-xl font-mono text-sm focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Supplier</Label>
              <Input 
                value={formData.supplier} 
                onChange={e => setFormData({...formData, supplier: e.target.value})}
                placeholder="Optional"
                className="h-12 bg-white border-gray-200 rounded-xl focus:ring-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Manufactured Date</Label>
              <Input 
                type="date"
                value={formData.manufacturedDate} 
                onChange={e => setFormData({...formData, manufacturedDate: e.target.value})}
                className="h-12 bg-white border-gray-200 rounded-xl focus:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-gray-400 uppercase tracking-widest">Expiry Date</Label>
              <Input 
                type="date"
                value={formData.expiryDate} 
                onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                className="h-12 bg-white border-gray-200 rounded-xl focus:ring-indigo-600"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 bg-white border-t border-gray-100 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="h-12 px-8 font-bold rounded-xl text-gray-500 hover:bg-gray-50">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-lg shadow-lg shadow-indigo-100 gap-2"
          >
            <Save className="w-5 h-5" />
            {product ? "Update Product" : "Save Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
