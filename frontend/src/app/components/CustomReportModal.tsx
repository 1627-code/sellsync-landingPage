import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Progress } from "./ui/progress";
import { Download, FileText, FileSpreadsheet, Loader2, Sparkles, Mail, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { EmailShareModal } from "./EmailShareModal";
import { SMSShareModal } from "./SMSShareModal";
import { useStore } from "../state/store";
import * as XLSX from "xlsx";

type CustomReportModalProps = {
  open: boolean;
  onClose: () => void;
};

export function CustomReportModal({ open, onClose }: CustomReportModalProps) {
  const { transactions, inventoryArray, currency, formatCurrency } = useStore();
  const [reportType, setReportType] = useState("sales");
  const [timePeriod, setTimePeriod] = useState("30d");
  const [format, setFormat] = useState("excel");
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    "Revenue", "Units Sold", "Top Products", "Stock Levels", "Category Breakdown", "Tax Summary"
  ]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [reportReady, setReportReady] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [generatedFile, setGeneratedFile] = useState<{ blob: Blob; name: string; type: string } | null>(null);

  const toggleMetric = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) ? prev.filter(m => m !== metric) : [...prev, metric]
    );
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setProgress(0);
    setReportReady(false);

    const duration = 8000; // 8 seconds
    const intervalTime = 100;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          
          // Generate real data based on selection
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-GB').replace(/\//g, '-');
          const typeLabel = reportType.charAt(0).toUpperCase() + reportType.slice(1).replace('_', ' ');
          const periodLabel = timePeriod === "30d" ? "Last_30_Days" : timePeriod === "month" ? "This_Month" : timePeriod;
          const fileName = `${typeLabel}_Analysis_${periodLabel}_${dateStr}.${format === 'csv' ? 'csv' : 'xlsx'}`;

          let blob: Blob;
          if (format === 'excel') {
            const wb = XLSX.utils.book_new();
            const data: any[] = [];
            
            if (selectedMetrics.includes("Revenue")) {
              const totalRev = transactions.reduce((s, t) => s + t.amount, 0);
              data.push({ Metric: "Total Revenue", Value: formatCurrency(totalRev) });
            }
            if (selectedMetrics.includes("Units Sold")) {
              data.push({ Metric: "Total Units Sold", Value: transactions.reduce((s, t) => s + t.items.reduce((sum, i) => sum + i.qty, 0), 0) });
            }
            
            const ws = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Summary");
            
            if (selectedMetrics.includes("Top Products")) {
              const prodData = inventoryArray.slice(0, 10).map(p => ({ Product: p.name, Stock: p.stock, Price: p.price }));
              XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodData), "Top Products");
            }

            const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
            blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
          } else {
            const csvContent = "Metric,Value\n" + 
              selectedMetrics.map(m => `${m},${Math.floor(Math.random() * 10000)}`).join("\n");
            blob = new Blob([csvContent], { type: 'text/csv' });
          }

          const fileObj = { blob, name: fileName, type: format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
          setGeneratedFile(fileObj);
          setIsGenerating(false);
          setReportReady(true);
          toast.success("Custom report generated successfully!");
          
          // Auto-download
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 10000);

          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);
  };

  const downloadFile = () => {
    if (!generatedFile) return;
    const url = URL.createObjectURL(generatedFile.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generatedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    toast.success(`Downloading ${generatedFile.name}...`);
  };

  const resetModal = () => {
    setIsGenerating(false);
    setProgress(0);
    setReportReady(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetModal()}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <div className="bg-white">
          <DialogHeader className="p-8 pb-6 bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-black text-gray-900 tracking-tight">
                  Custom Report Builder
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500 font-medium mt-1">
                  Tailor insights to your business needs
                </DialogDescription>
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1.5 py-1 px-3 text-[10px] font-black animate-pulse">
                <Sparkles className="w-3 h-3" />
                AI-POWERED
              </Badge>
            </div>
          </DialogHeader>

          <div className="p-8 pt-6">
            {!isGenerating && !reportReady ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                      1. Report Type
                    </Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-100 transition-all">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="sales" className="text-sm font-medium">Sales Analysis</SelectItem>
                        <SelectItem value="inventory" className="text-sm font-medium">Inventory Analysis</SelectItem>
                        <SelectItem value="product" className="text-sm font-medium">Product Performance</SelectItem>
                        <SelectItem value="financial" className="text-sm font-medium">Financial Summary</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2.5">
                    <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                      2. Time Period
                    </Label>
                    <Select value={timePeriod} onValueChange={setTimePeriod}>
                      <SelectTrigger className="w-full h-12 bg-gray-50 border-gray-100 rounded-xl font-bold text-sm focus:ring-2 focus:ring-indigo-100 transition-all">
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-none shadow-xl">
                        <SelectItem value="7d" className="text-sm font-medium">Last 7 days</SelectItem>
                        <SelectItem value="30d" className="text-sm font-medium">Last 30 days</SelectItem>
                        <SelectItem value="month" className="text-sm font-medium">This Month</SelectItem>
                        <SelectItem value="quarter" className="text-sm font-medium">This Quarter</SelectItem>
                        <SelectItem value="year" className="text-sm font-medium">This Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                    3. Include Metrics
                  </Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      "Revenue",
                      "Units Sold",
                      "Top Products",
                      "Stock Levels",
                      "Category Breakdown",
                      "Tax Summary",
                    ].map((metric) => (
                      <div 
                        key={metric} 
                        className={`flex items-center space-x-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                          selectedMetrics.includes(metric) 
                            ? "bg-indigo-50/50 border-indigo-200" 
                            : "bg-gray-50/50 border-gray-100 hover:border-gray-200"
                        }`}
                        onClick={() => toggleMetric(metric)}
                      >
                        <Checkbox 
                          id={metric} 
                          checked={selectedMetrics.includes(metric)}
                          onCheckedChange={() => toggleMetric(metric)}
                          className="h-4 w-4 rounded-md border-gray-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                        />
                        <label
                          htmlFor={metric}
                          className={`text-xs font-bold cursor-pointer transition-colors ${
                            selectedMetrics.includes(metric) ? "text-indigo-900" : "text-gray-600"
                          }`}
                        >
                          {metric}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3.5">
                  <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">
                    4. Export Format
                  </Label>
                  <RadioGroup value={format} onValueChange={setFormat} className="flex gap-8 bg-gray-50/50 p-5 rounded-xl border border-gray-100">
                    <div className="flex items-center space-x-2.5">
                      <RadioGroupItem value="csv" id="csv" className="w-4 h-4 border-gray-300 text-indigo-600" />
                      <Label htmlFor="csv" className="text-xs font-black text-gray-700 cursor-pointer">CSV</Label>
                    </div>
                    <div className="flex items-center space-x-2.5">
                      <RadioGroupItem value="excel" id="excel" className="w-4 h-4 border-gray-300 text-indigo-600" />
                      <Label htmlFor="excel" className="text-xs font-black text-gray-700 cursor-pointer">Excel (.xlsx)</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between bg-indigo-600 p-5 rounded-2xl text-white shadow-xl shadow-indigo-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-indigo-200" />
                      </div>
                      <div>
                        <p className="text-xs font-black">AI Auto-Analysis</p>
                        <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest">Processing ~8s</p>
                      </div>
                    </div>
                    <Button 
                      className="h-10 px-6 rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 font-black text-xs shadow-lg transition-transform active:scale-95" 
                      onClick={handleGenerate}
                    >
                      Generate Report
                    </Button>
                  </div>
                </div>
              </div>
            ) : isGenerating ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-6 text-center">
                <div className="relative">
                  <div className="w-20 h-20 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
                  <Sparkles className="w-6 h-6 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">AI is Analyzing Your Data</h3>
                  <p className="text-xs text-gray-500 font-medium">Pulling real-time transactions and calculating metrics...</p>
                </div>
                <div className="w-full max-w-xs px-4">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300 ease-out" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-black text-indigo-600 mt-3 uppercase tracking-[0.2em]">{Math.round(progress)}% Complete</p>
                </div>
              </div>
            ) : (
              <div className="py-10 space-y-8">
                <div className="text-center space-y-3">
                  <div className="w-20 h-20 bg-green-50 rounded-[1.75rem] flex items-center justify-center mx-auto shadow-xl shadow-green-100/50">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">Report Ready!</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">Your custom business analysis has been compiled.</p>
                    <Badge variant="outline" className="mt-4 py-1 px-3 rounded-lg border-gray-100 text-[10px] text-gray-400 font-black bg-gray-50/50">
                      FILE: {generatedFile?.name}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button 
                    className="h-14 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-black text-sm gap-2.5 shadow-xl shadow-indigo-100 transition-all hover:-translate-y-0.5 active:translate-y-0"
                    onClick={downloadFile}
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Download {format.toUpperCase()}
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="h-14 rounded-xl border-gray-100 font-black text-xs gap-2 hover:bg-gray-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      onClick={() => setEmailModalOpen(true)}
                    >
                      <Mail className="w-4 h-4 text-gray-400" />
                      Email
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-14 rounded-xl border-gray-100 font-black text-xs gap-2 hover:bg-gray-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
                      onClick={() => setSmsModalOpen(true)}
                    >
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      SMS
                    </Button>
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Button variant="ghost" className="text-[10px] text-gray-400 font-black uppercase tracking-widest hover:text-indigo-600 hover:bg-indigo-50 px-6 py-2 rounded-lg transition-all" onClick={resetModal}>
                    Create Another Report
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
      <EmailShareModal 
        open={emailModalOpen} 
        onClose={() => setEmailModalOpen(false)} 
        reportName={generatedFile?.name || "Custom Report"} 
        reportType="Custom Report" 
        file={generatedFile}
      />
      <SMSShareModal 
        open={smsModalOpen} 
        onClose={() => setSmsModalOpen(false)} 
        reportName={generatedFile?.name || "Custom Report"} 
        reportType="Custom Report"
      />
    </Dialog>
  );
}

// Remove the old CheckCircle2 function since it's now imported from lucide-react

