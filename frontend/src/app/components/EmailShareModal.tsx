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
import { Mail, Send, X, Paperclip, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type EmailShareModalProps = {
  open: boolean;
  onClose: () => void;
  reportName: string;
  reportType: string;
  file?: { blob: Blob; name: string; type: string } | null;
};

export function EmailShareModal({ open, onClose, reportName, reportType, file }: EmailShareModalProps) {
  const [email, setEmail] = useState("");
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(file ? `Receipt for Order ${reportName.split('Order ')[1]}` : `SellSync Report: ${reportName}`);
  const [message, setMessage] = useState(file ? `Hi,\n\nPlease find attached your receipt for order ${reportName.split('Order ')[1]} from SellSync.\n\nThank you for shopping with us!` : `Hi,\n\nPlease find attached the ${reportType} report from SellSync.\n\nBest regards,\nStore Management`);
  const [attachFile, setAttachFile] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleSend = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSending(true);
    
    // Simulate API call
    console.log("Sending email to:", email);
    console.log("Subject:", subject);
    console.log("Message:", message);
    if (attachFile && file) {
      console.log("Attaching file:", file.name);
    }

    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSending(false);
    toast.success(`Email sent successfully to ${email}!`);
    onClose();
  };

  const handleCopyLink = () => {
    const dummyUrl = `https://sellsync.app/reports/share/${Math.random().toString(36).substring(7)}`;
    navigator.clipboard.writeText(dummyUrl);
    setIsCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-[#0f1115] text-white">
        <div>
          <DialogHeader className="p-8 pb-4 border-b border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Mail className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black tracking-tight">Share via Email</DialogTitle>
                  <DialogDescription className="text-gray-400 font-medium">Send report link directly to your team</DialogDescription>
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
                <Label htmlFor="email" className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">To / Recipient</Label>
                <Input 
                  id="email" 
                  placeholder="manager@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 bg-white/5 border-white/5 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-white placeholder:text-gray-600 transition-all"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Message Body</Label>
                <Textarea 
                  id="message" 
                  rows={4} 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-white/5 border-white/5 rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500/20 text-white placeholder:text-gray-600 resize-none font-medium transition-all"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="includeLink" 
                    checked={attachFile} 
                    onCheckedChange={(checked) => setAttachFile(!!checked)}
                    className="border-gray-600 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                  />
                  <Label htmlFor="includeLink" className="text-sm font-bold text-gray-300 cursor-pointer">Include Secure Link</Label>
                </div>
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                  <Copy className="w-4 h-4 text-indigo-400" />
                </div>
              </div>

              <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 border-dashed">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Generated Short Link</p>
                    <p className="text-xs font-mono text-indigo-300/60 truncate">https://sellsync.app/r/sh_7x92kp0</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 font-bold text-[10px]"
                    onClick={handleCopyLink}
                  >
                    {isCopied ? "COPIED" : "COPY"}
                  </Button>
                </div>
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
              className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg gap-3 shadow-xl shadow-indigo-500/20 transition-all disabled:opacity-50"
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
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
