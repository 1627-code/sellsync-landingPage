import React, { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Loader2, Sparkles, Volume2, Globe, WifiOff, X, CheckCircle2, ShoppingCart, CreditCard } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useStore, InventoryItem } from "../state/store";

interface POSVoiceButtonProps {
  onAddToCart: (id: number, qty?: number) => void;
  onUpdateQty: (id: number, qty: number) => void;
  onClearCart: () => void;
  onSetPaymentMethod: (method: any) => void;
  onSetCashReceived: (amount: string) => void;
  onCompleteSale: () => void;
  cartItems: any[];
  inventory: InventoryItem[];
  total: number;
}

export function POSVoiceButton({
  onAddToCart,
  onUpdateQty,
  onClearCart,
  onSetPaymentMethod,
  onSetCashReceived,
  onCompleteSale,
  cartItems,
  inventory,
  total,
}: POSVoiceButtonProps) {
  const { formatCurrency } = useStore();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<{ id: number; name: string } | null>(null);

  const voicePrompts = [
    "What do you want to purchase?",
    "What would you like to buy?",
    "Tell me the product you want to add",
    "What item are you selling today?",
    "Which product should I add for you?",
    "Ready to add an item. What is it?"
  ];

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const processCommand = useCallback((text: string) => {
    if (!text || text.length < 2) return;
    
    const cleanText = text.toLowerCase().trim();
    setIsProcessing(true);
    setLastCommand(cleanText);

    try {
      // Logic for quantity after pending item
      if (pendingItem) {
        const numMatch = cleanText.match(/\d+/);
        if (numMatch) {
          const qty = parseInt(numMatch[0]);
          onAddToCart(pendingItem.id, qty);
          toast.success(`Added ${qty} x ${pendingItem.name}`, {
            icon: <ShoppingCart className="w-4 h-4 text-green-600" />
          });
          speak(`Added ${qty} ${pendingItem.name}`);
          setPendingItem(null);
          return;
        } else if (cleanText.includes("cancel") || cleanText.includes("stop")) {
          setPendingItem(null);
          toast.info("Action cancelled");
          speak("Cancelled");
          return;
        } else {
          toast.info(`Still waiting for quantity for ${pendingItem.name}`);
          speak(`How many ${pendingItem.name}?`);
          return;
        }
      }

      // 1. Add Item: "Add [product name] [qty]" or "Add [product name]"
      if (cleanText.includes("add") || cleanText.includes("plus") || cleanText.includes("put")) {
        const words = cleanText.split(" ");
        let qty: number | null = null;
        
        const numMatch = cleanText.match(/\d+/);
        if (numMatch) qty = parseInt(numMatch[0]);

        const commandWords = ["add", "plus", "put", "some", "of", "to", "cart", "order"];
        const nameParts = words.filter(w => !commandWords.includes(w) && !w.match(/^\d+$/));
        const productName = nameParts.join(" ");

        if (productName.length < 2) {
          toast.error("Please specify a product name");
          return;
        }

        const product = inventory.find(p => 
          p.name.toLowerCase().includes(productName) || 
          p.sku.toLowerCase() === productName ||
          productName.includes(p.name.toLowerCase())
        );

        if (product) {
          if (qty !== null) {
            onAddToCart(product.id, qty);
            toast.success(`Added ${qty} x ${product.name}`, {
              icon: <ShoppingCart className="w-4 h-4 text-green-600" />
            });
            speak(`Added ${qty} ${product.name}`);
          } else {
            // No quantity mentioned yet
            setPendingItem({ id: product.id, name: product.name });
            toast.info(`Found ${product.name}. How many?`, {
              description: "Say a number to set quantity"
            });
            speak(`Found ${product.name}. How many do you want to add?`);
          }
        } else {
          toast.error(`Product "${productName}" not found`);
          speak(`Sorry, I couldn't find ${productName}`);
        }
      }
      // ... rest of logic stays similar

      // 2. Payment/Checkout: "Move to payment", "Checkout", "Finish sale"
      else if (cleanText.includes("checkout") || cleanText.includes("payment") || cleanText.includes("finish") || cleanText.includes("complete")) {
        if (cartItems.length > 0) {
          onCompleteSale();
          toast.success("Moving to checkout...");
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Moving to checkout"));
        } else {
          toast.error("Cart is empty. Add items first.");
        }
      }

      // 3. Clear Cart: "Clear all", "Empty cart", "Cancel"
      else if (cleanText.includes("clear") || cleanText.includes("empty") || cleanText.includes("cancel")) {
        onClearCart();
        toast.success("Cart cleared");
        window.speechSynthesis.speak(new SpeechSynthesisUtterance("Cart cleared"));
      }

      // 4. Quantity Update: "Change quantity to [qty]", "Make it [qty]"
      else if (cleanText.includes("quantity") || cleanText.includes("make it") || cleanText.includes("set to")) {
        const numMatch = cleanText.match(/\d+/);
        if (numMatch && cartItems.length > 0) {
          const qty = parseInt(numMatch[0]);
          const lastItem = cartItems[cartItems.length - 1];
          onUpdateQty(lastItem.id, qty);
          toast.success(`Updated ${lastItem.name} to ${qty}`);
        }
      }

      // 5. Help: "What can I say?"
      else if (cleanText.includes("help") || cleanText.includes("what can i say")) {
        toast.info("Voice Commands Help", {
          description: "Try: 'Add Vitamin C 3', 'Checkout', 'Clear cart', 'Status'",
        });
      }

      // 6. Status: "What's the total?", "How much?"
      else if (cleanText.includes("total") || cleanText.includes("status") || cleanText.includes("how much")) {
        toast.info(`Total: ${formatCurrency(total)}`, {
          description: `${cartItems.length} items in cart`,
          icon: <CreditCard className="w-4 h-4 text-indigo-600" />
        });
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(`The total is ${total} ${currency || ''}`));
      }

    } catch (err) {
      console.error("Voice command error:", err);
    } finally {
      setIsProcessing(false);
      setTranscript("");
    }
  }, [inventory, cartItems, onAddToCart, onUpdateQty, onClearCart, onCompleteSale, formatCurrency, total]);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true; // Keep listening for multiple commands
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
            processCommand(event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript || interimTranscript);
      };

      rec.onend = () => {
        // Automatically restart if we're supposed to be listening
        // This makes it feel "always on" while active
        if (isListening) {
          try {
            rec.start();
          } catch (e) {
            console.error("Restart error", e);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech error", event.error);
        if (event.error === 'no-speech') return;
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, [processCommand, isListening]);

  const toggleListening = () => {
    if (!recognition) {
      toast.error("Voice input not supported in this browser.");
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setTranscript("");
    } else {
      try {
        const randomPrompt = voicePrompts[Math.floor(Math.random() * voicePrompts.length)];
        speak(randomPrompt);
        
        recognition.start();
        setIsListening(true);
        toast.success("Voice Assistant Active", {
          description: randomPrompt,
          icon: <Sparkles className="w-4 h-4 text-indigo-600" />
        });
      } catch (err) {
        console.error("Start error", err);
      }
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {isListening && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`flex flex-col gap-2 min-w-[280px] p-4 rounded-3xl shadow-2xl border backdrop-blur-xl ${
              isOffline ? "bg-orange-950/90 border-orange-500/30" : "bg-slate-950/90 border-indigo-500/30"
            } text-white`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isOffline ? (
                  <WifiOff className="w-4 h-4 text-orange-400" />
                ) : (
                  <Globe className="w-4 h-4 text-indigo-400" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                  {isOffline ? "Offline Mode" : "Cloud Connected"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Live</span>
              </div>
            </div>

            <div className="h-12 flex items-center">
              <p className="text-sm font-bold leading-tight">
                {transcript || (
                  <span className="opacity-40 italic">"Try saying: Add Vitamin C 3"</span>
                )}
              </p>
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="flex gap-1.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`w-1 h-3 rounded-full bg-indigo-500 animate-bounce`} style={{ animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              {lastCommand && (
                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-300">
                  <CheckCircle2 className="w-3 h-3" />
                  Processed
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative group">
        <div className={`absolute -inset-1 bg-gradient-to-r ${isListening ? 'from-red-600 to-orange-600' : 'from-indigo-600 to-purple-600'} rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt`} />
        <Button
          size="icon"
          className={`relative w-16 h-16 rounded-full shadow-2xl transition-all duration-500 ${
            isListening 
              ? "bg-red-600 hover:bg-red-700 scale-110" 
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          onClick={toggleListening}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : isListening ? (
            <div className="relative">
              <MicOff className="w-8 h-8 text-white" />
              <motion.div 
                layoutId="mic-active"
                className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            </div>
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </Button>
      </div>
    </div>
  );
}

