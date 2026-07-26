import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { MessageSquare, Send, X, Link as LinkIcon, Smartphone, Check, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type SMSShareModalProps = {
  open: boolean;
  onClose: () => void;
  reportName: string;
  reportType: string;
};

export function SMSShareModal({ open, onClose, reportName, reportType }: SMSShareModalProps) {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(`Hi, here's the latest SellSync ${reportType} report: ${reportName}.`);
  const [includeLink, setIncludeLink] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [shortLink] = useState(`https://sellsync.app/r/${Math.random().toString(36).substring(7)}`);

  const validatePhone = (num: string) => {
    // Nigerian format regex: +23480xxxxxxxx or 080xxxxxxxx
    const regex = /^(\+234|0)([789])[01]\d{8}$/;
    return regex.test(num.replace(/\s+/g, ''));
  };

  const handleSend = async () => {
    if (!phone) {
      toast.error("Please enter a phone number");
      return;
    }

    if (!validatePhone(phone)) {
      toast.error("Invalid Nigerian phone number format");
      return;
    }

    setIsSending(true);
    
    // Simulate SMS send
    const finalMessage = `${message}${includeLink ? ` View/download: ${shortLink}` : ''}`;
    console.log(`SMS to ${phone}: ${finalMessage}`);

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSending(false);
    toast.success(`SMS sent successfully to ${phone}!`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-[#0f1115] text-white">
        <div>
          <DialogHeader className="p-8 pb-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight">Share via SMS</DialogTitle>
                  <DialogDescription className="text-gray-400 font-medium">Send report link directly to your mobile</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl text-gray-500 hover:text-white hover:bg-white/5" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Phone Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <Input 
                    id="phone" 
                    placeholder="0801 234 5678" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-14 pl-12 bg-white/5 border-white/5 rounded-2xl focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-gray-600 font-bold transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sms-message" className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Message Body</Label>
                <Textarea 
                  id="sms-message" 
                  rows={3} 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white/5 border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-purple-500/20 text-white placeholder:text-gray-600 resize-none font-medium transition-all"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="includeLink" 
                    checked={includeLink} 
                    onCheckedChange={(checked) => setIncludeLink(!!checked)}
                    className="border-gray-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                  />
                  <Label htmlFor="includeLink" className="text-sm font-bold text-gray-300 cursor-pointer">Include Secure Link</Label>
                </div>
                <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                  <LinkIcon className="w-4 h-4 text-purple-400" />
                </div>
              </div>

              <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10 border-dashed">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-1">Generated Short Link</p>
                    <p className="text-xs font-mono text-purple-300/60 truncate">{shortLink}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-purple-400/10 font-bold text-[10px]"
                    onClick={() => {
                      navigator.clipboard.writeText(shortLink);
                      toast.success("Link copied!");
                    }}
                  >
                    COPY
                  </Button>
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
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              className="flex-[2] h-14 rounded-2xl bg-purple-600 hover:bg-purple-700 font-black text-lg gap-3 shadow-xl shadow-purple-500/20 transition-all disabled:opacity-50"
              onClick={handleSend}
              disabled={isSending}
            >
              {isSending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send SMS
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
