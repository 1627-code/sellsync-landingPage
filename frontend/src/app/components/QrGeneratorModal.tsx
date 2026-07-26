import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
// Use window global if import fails
const JsBarcodeGlobal = (window as any).JsBarcode;

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Copy, Download, Printer, Save, QrCode, Barcode, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../state/store";

interface QrGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: {
    name: string;
    sku: string;
    barcode?: string;
    price: number;
    category: string;
    stock: number;
  };
  onSave?: (productData: any) => void;
}

export function QrGeneratorModal({ isOpen, onClose, product, onSave }: QrGeneratorModalProps) {
  const { categories, currency } = useStore();
  const [formData, setFormData] = useState({
    name: product?.name || "",
    sku: product?.sku || `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    barcode: product?.barcode || "",
    price: product?.price || 0,
    category: product?.category || "",
    stock: product?.stock || 0,
    costPrice: 0,
    supplier: "",
    threshold: 10,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode || "",
        price: product.price,
        category: product.category,
        stock: product.stock,
        costPrice: 0,
        supplier: "",
        threshold: 10,
      });
    } else {
      setFormData({
        name: "",
        sku: `SKU-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        barcode: "",
        price: 0,
        category: categories[0] || "",
        stock: 0,
        costPrice: 0,
        supplier: "",
        threshold: 10,
      });
    }
  }, [product, categories]);

  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (isOpen && barcodeRef.current) {
      try {
        const barcodeValue = formData.barcode || formData.sku;
        const JsBarcodeFn = JsBarcodeGlobal || (async () => (await import("jsbarcode")).default)();
        
        const generate = async () => {
          const fn = typeof JsBarcodeFn === 'function' ? JsBarcodeFn : await JsBarcodeFn;
          fn(barcodeRef.current, barcodeValue, {
            format: "CODE128",
            width: 2,
            height: 100,
            displayValue: true,
          });
        };
        generate();
      } catch (err) {
        console.error("Barcode generation error", err);
      }
    }
  }, [isOpen, formData.sku, formData.barcode]);

  const handleCopy = async (type: 'qr' | 'barcode') => {
    const svg = type === 'qr' 
      ? document.querySelector('#qr-code-svg') 
      : barcodeRef.current;
    
    if (!svg) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob })
            ]);
            toast.success(`${type.toUpperCase()} copied to clipboard!`);
          }
        });
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    } catch (err) {
      toast.error("Failed to copy image");
    }
  };

  const handleDownload = (type: 'qr' | 'barcode') => {
    const svg = type === 'qr' 
      ? document.querySelector('#qr-code-svg') 
      : barcodeRef.current;
    
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${formData.name}-${type}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${type.toUpperCase()} downloaded!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl rounded-3xl border-none shadow-2xl overflow-hidden p-0">
        <DialogHeader className="p-6 bg-white border-b border-gray-100">
          <DialogTitle className="text-2xl font-black text-gray-900">Generate QR / Barcode</DialogTitle>
          <DialogDescription className="text-gray-500 font-medium">Create and print codes for your physical products</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row max-h-[60vh] overflow-y-auto">
          {/* Form Side */}
          <div className="flex-1 p-4 border-b lg:border-b-0 lg:border-r border-gray-100 space-y-3 bg-gray-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Product Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="h-9 bg-white border-gray-200 rounded-xl text-sm"
                  placeholder="e.g. Antibacterial Soap"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-9 bg-white border-gray-200 rounded-xl text-sm">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {categories.length > 0 ? (
                      categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                    ) : (
                      <SelectItem value="default" disabled>No categories yet</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="price" className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Selling Price ({currency.symbol})</Label>
                <Input 
                  id="price" 
                  type="number"
                  value={formData.price || ""} 
                  onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                  className="h-9 bg-white border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock" className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Initial Stock</Label>
                <Input 
                  id="stock" 
                  type="number"
                  value={formData.stock || ""} 
                  onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                  className="h-9 bg-white border-gray-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sku" className="text-[9px] font-black text-gray-400 uppercase tracking-widest">SKU / Barcode</Label>
                <Input 
                  id="sku" 
                  value={formData.sku} 
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  className="h-9 bg-white border-gray-200 rounded-xl font-mono text-[10px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplier" className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Supplier</Label>
                <Input 
                  id="supplier" 
                  value={formData.supplier} 
                  onChange={e => setFormData({...formData, supplier: e.target.value})}
                  className="h-9 bg-white border-gray-200 rounded-xl text-sm"
                  placeholder="Optional"
                />
              </div>
            </div>
          </div>

          {/* Preview Side */}
          <div className="flex-1 p-4 flex flex-col items-center justify-center bg-white min-h-[250px]">
            <Tabs defaultValue="qr" className="w-full flex flex-col items-center">
              <TabsList className="mb-3 bg-gray-100 p-1 rounded-xl h-9">
                <TabsTrigger value="qr" className="rounded-lg gap-2 font-bold px-4 h-7 text-[10px]">
                  <QrCode className="w-3 h-3" /> QR
                </TabsTrigger>
                <TabsTrigger value="barcode" className="rounded-lg gap-2 font-bold px-4 h-7 text-[10px]">
                  <Barcode className="w-3 h-3" /> Barcode
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qr" className="flex flex-col items-center gap-3 mt-0">
                <div className="p-2 bg-white border-2 border-gray-50 rounded-2xl shadow-md">
                  <QRCodeSVG 
                    id="qr-code-svg"
                    value={formData.sku} 
                    size={120}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopy('qr')} className="rounded-lg font-bold gap-2 h-7 text-[10px] px-3">
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload('qr')} className="rounded-lg font-bold gap-2 h-7 text-[10px] px-3">
                    <Download className="w-2.5 h-2.5" /> SVG
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="barcode" className="flex flex-col items-center gap-3 mt-0">
                <div className="p-2 bg-white border-2 border-gray-50 rounded-2xl shadow-md flex items-center justify-center min-h-[100px] max-w-full overflow-hidden">
                  <svg ref={barcodeRef} className="max-w-full h-20"></svg>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleCopy('barcode')} className="rounded-lg font-bold gap-2 h-7 text-[10px] px-3">
                    <Copy className="w-2.5 h-2.5" /> Copy
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDownload('barcode')} className="rounded-lg font-bold gap-2 h-7 text-[10px] px-3">
                    <Download className="w-2.5 h-2.5" /> SVG
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="p-4 bg-gray-50 border-t border-gray-100 gap-3">
          <Button variant="ghost" className="h-11 font-bold rounded-xl gap-2 px-6" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" className="h-11 font-bold rounded-xl gap-2 px-6" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print
          </Button>
          <Button 
            className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-base shadow-lg shadow-indigo-100 gap-2"
            onClick={() => {
              onSave?.(formData);
              onClose();
              toast.success(`${product ? "Product updated" : "Product added"} successfully!`);
            }}
          >
            <Save className="w-4 h-4" /> {product ? "Update Product" : "Save Product"}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Printable Area (Hidden in Screen) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-bold">{formData.name}</h1>
          <p className="text-lg font-mono">{formData.sku}</p>
          <div className="border-2 border-black p-4">
            <QRCodeSVG value={formData.sku} size={256} />
          </div>
          <p className="text-3xl font-black">${formData.price.toFixed(2)}</p>
        </div>
      </div>
    </Dialog>
  );
}
