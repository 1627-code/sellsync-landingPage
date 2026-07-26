import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { FileText, Download, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { motion } from "framer-motion";

type ReportPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  report: any;
  onEmail: (report: any) => void;
  onSMS: (report: any) => void;
  onDownload: (report: any) => void;
};

export function ReportPreviewModal({ open, onClose, report, onEmail, onSMS, onDownload }: ReportPreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <div className="bg-white">
          <DialogHeader className="p-8 pb-4 bg-gray-50/50 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-gray-900">Report Preview</DialogTitle>
                <DialogDescription className="text-gray-500 font-medium">{report?.name || "Report Overview"}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-1">
                <h3 className="text-lg font-black text-gray-900 mb-1">{report?.name || "Selected Report"}</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">{report?.description || "This report provides a comprehensive breakdown of business performance, including sales metrics, inventory turnover, and financial summaries."}</p>
                <div className="flex items-center gap-2 mt-4">
                  {report?.type && <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold">{report.type}</Badge>}
                  {report?.format && <Badge className="bg-green-50 text-green-700 border-green-100 font-bold">{report.format}</Badge>}
                  {report?.date && <span className="text-xs text-gray-400 font-black uppercase tracking-widest ml-auto">{report.date}</span>}
                </div>
              </div>
            </div>

            <Card className="border-gray-100 bg-gray-50/30 rounded-2xl overflow-hidden mb-8">
              <CardContent className="p-0">
                <ScrollArea className="h-[280px]">
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Executive Summary</p>
                        <p className="text-sm text-gray-600 font-medium leading-relaxed">
                          The business showed strong performance this period with a 12.5% increase in total revenue. 
                          Key growth drivers included high demand in the Hygiene category and successful promotions on Supplements.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
                          <p className="text-xl font-black text-indigo-600">₦4.2M</p>
                        </div>
                        <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Growth</p>
                          <p className="text-xl font-black text-green-600">+12%</p>
                        </div>
                      </div>
                      <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Key Insight</p>
                        <p className="text-sm text-gray-600 font-medium italic">"Inventory turnover is at an all-time high, suggesting efficient stock management."</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl border-gray-200 font-bold gap-2 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                  onClick={() => onEmail(report)}
                >
                  <Mail className="w-5 h-5" />
                  Email Report
                </Button>
                <Button 
                  variant="outline" 
                  className="h-12 rounded-xl border-gray-200 font-bold gap-2 hover:bg-green-50 hover:text-green-600 transition-all"
                  onClick={() => onSMS(report)}
                >
                  <MessageSquare className="w-5 h-5" />
                  SMS Summary
                </Button>
              </div>
              <Button 
                className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg gap-3 shadow-xl shadow-indigo-100 transition-all"
                onClick={() => onDownload(report)}
              >
                <Download className="w-5 h-5" />
                Download Full Report
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

