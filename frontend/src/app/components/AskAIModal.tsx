// IMPORTANT: Do NOT duplicate imports from shadcn/ui – use only "@/components/ui/..." paths
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  MessageSquare,
  Mic,
  Send,
  Sparkles,
  BarChart4,
  TrendingUp,
  PieChart as PieChartIcon,
  Search,
  ChevronRight,
  Trash2,
  FileDown,
  Volume2,
  X,
  Mail,
  Plus,
  User,
  Pin,
  MoreVertical,
  Copy,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Share2,
  Paperclip,
  Activity,
  Package,
  ArrowUpRight,
  Layout,
  Moon,
  Sun,
  History,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { useStore } from "../state/store";
import { toast } from "sonner";
import { EmailShareModal } from "./EmailShareModal";
import { SMSShareModal } from "./SMSShareModal";
import { motion, AnimatePresence } from "framer-motion";

type Message = {
  id: string;
  role: "user" | "ai";
  content: string;
  chart?: any;
  timestamp: Date;
  isLiked?: boolean;
  isDisliked?: boolean;
};

type ChatTab = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  isPinned?: boolean;
};

type AskAIModalProps = {
  open: boolean;
  onClose: () => void;
};

function ChatHistoryItem({ tab, isActive, onSelect, onDelete, onPin, onRename, isDark }: { 
  tab: ChatTab, 
  isActive: boolean, 
  onSelect: () => void, 
  onDelete: (e: React.MouseEvent) => void,
  onPin: (e: React.MouseEvent) => void,
  onRename: (e: React.MouseEvent) => void,
  isDark: boolean
}) {
  return (
    <div
      onClick={onSelect}
      className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
        isActive 
          ? isDark ? "bg-white/10 text-white" : "bg-indigo-50 text-indigo-700" 
          : isDark ? "text-gray-500 hover:bg-white/5 hover:text-gray-300" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? (isDark ? "text-white" : "text-indigo-600") : "opacity-50"}`} />
      <span className="flex-1 text-[11px] font-bold truncate tracking-tight">{tab.title}</span>
      
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-indigo-600">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={`w-32 ${isDark ? "bg-[#1A1A1A] border-white/10 text-gray-400" : "bg-white border-gray-100 text-gray-600"}`}>
            <DropdownMenuItem onClick={onPin} className="text-[10px] font-bold uppercase tracking-widest gap-2">
              <Pin className="w-3 h-3" /> {tab.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename} className="text-[10px] font-bold uppercase tracking-widest gap-2">
              <Sparkles className="w-3 h-3" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-[10px] font-bold uppercase tracking-widest text-red-500 gap-2">
              <Trash2 className="w-3 h-3" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AskAIModal({ open, onClose }: AskAIModalProps) {
  const { inventoryArray, transactions, kpis, currentUser, currentStore, theme: globalTheme, formatCurrency } = useStore();
  
  // Theme logic
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("sellsync_ai_theme");
    return saved ? saved === "dark" : false; // Default to white
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("sellsync_ai_theme", next ? "dark" : "light");
  };

  const [tabs, setTabs] = useState<ChatTab[]>(() => {
    const saved = localStorage.getItem("sellsync_chat_tabs_v4");
    if (saved) {
      return JSON.parse(saved).map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        messages: t.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
      }));
    }
    const initialId = `chat-${Date.now()}`;
    return [{
      id: initialId,
      title: "New Analysis",
      createdAt: new Date(),
      isPinned: false,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: "ai",
          content: "Hello! I'm your SellSync AI Assistant. I can analyze your sales, inventory, and forecasts in real-time. What would you like to know today?",
          timestamp: new Date(),
        },
      ]
    }];
  });

  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [input, setInput] = useState("");
  const [isLiveContext, setIsLiveContext] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const messages = activeTab.messages;

  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id === activeTabId) {
        const updatedMessages = typeof newMessages === 'function' ? newMessages(tab.messages) : newMessages;
        let newTitle = tab.title;
        if (tab.title === "New Analysis") {
          const firstUserMsg = updatedMessages.find(m => m.role === "user");
          if (firstUserMsg) {
            newTitle = firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? "..." : "");
          }
        }
        return { ...tab, messages: updatedMessages, title: newTitle };
      }
      return tab;
    }));
  };

  const createNewTab = () => {
    const newId = `chat-${Date.now()}`;
    const newTab: ChatTab = {
      id: newId,
      title: "New Analysis",
      createdAt: new Date(),
      isPinned: false,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: "ai",
          content: "Hello! I'm your SellSync AI Assistant. How can I help with your store data today?",
          timestamp: new Date(),
        },
      ]
    };
    setTabs(prev => [newTab, ...prev]);
    setActiveTabId(newId);
  };

  const deleteTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) {
      handleClearHistory();
      return;
    }
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[0].id);
    }
  };

  const togglePin = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => prev.map(t => t.id === id ? { ...t, isPinned: !t.isPinned } : t));
  };

  const startRenaming = (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(id);
    setEditTitle(title);
  };

  // Persist tabs to localStorage
  useEffect(() => {
    localStorage.setItem("sellsync_chat_tabs_v4", JSON.stringify(tabs));
  }, [tabs]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
    
    // Fallback: manually scroll the scroll area's viewport
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior
      });
    }
  };

  useEffect(() => {
    // Scroll immediately on message change
    scrollToBottom("smooth");
    
    // Aggressive scroll during typing/streaming
    const timer = setTimeout(() => scrollToBottom("smooth"), 100);
    const aggressiveTimer = setTimeout(() => scrollToBottom("auto"), 50);
    
    // Extra scroll for charts/images that might take longer to render
    const extraTimer = setTimeout(() => scrollToBottom("smooth"), 500);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(aggressiveTimer);
      clearTimeout(extraTimer);
    };
  }, [messages, isTyping, activeTabId, streamingContent]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = async (text?: string) => {
    const content = text || input;
    if (!content.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);
    setStreamingContent("");

    // AI Response Generation with Live Data
    const fullResponse = generateAIResponse(content, { 
      kpis, 
      inventoryArray, 
      transactions, 
      formatCurrency, 
      currentUser, 
      currentStore,
      isNewChat: activeTab.messages.length <= 1 
    });
    
    await new Promise(resolve => setTimeout(resolve, 800));

    let currentStream = "";
    const words = fullResponse.content.split(" ");
    for (let i = 0; i < words.length; i++) {
      currentStream += (i === 0 ? "" : " ") + words[i];
      setStreamingContent(currentStream);
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    setMessages(prev => [...prev, { ...fullResponse, id: `msg-ai-${Date.now()}` }]);
    setStreamingContent("");
    setIsTyping(false);
  };

  const handleClearHistory = () => {
    if (confirm("Clear this chat history?")) {
      const initialMessage: Message = {
        id: `msg-${Date.now()}`,
        role: "ai",
        content: "Hello! I'm your SellSync AI Assistant. I can analyze your sales, inventory, and forecasts in real-time. What would you like to know today?",
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
      toast.success("Chat history cleared");
    }
  };

  const filteredTabs = tabs.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const pinnedTabs = filteredTabs.filter(t => t.isPinned);
  const recentTabs = filteredTabs.filter(t => !t.isPinned);

  const quickPrompts = useMemo(() => {
    const role = currentUser?.role || "Staff";
    const hasLowStock = kpis.lowStockCount > 0;
    
    const basePrompts = [
      { label: "Revenue Analysis", prompt: "How is my store doing today?" },
      { label: "Inventory Check", prompt: "Show me low stock items" },
    ];

    if (role === "Admin") {
      return [
        ...basePrompts,
        { label: "Profit Forecast", prompt: "Predict next week's profit" },
        { label: "Store Comparison", prompt: "Compare performance across stores" },
      ];
    }

    if (role === "Manager") {
      return [
        ...basePrompts,
        { label: "Restock Needs", prompt: "Generate restock recommendations" },
        { label: "Daily Summary", prompt: "Send daily sales summary to my email" },
      ];
    }

    return [
      ...basePrompts,
      { label: "How to POS", prompt: "How do I add a sale with voice commands?" },
      { label: "Price Check", prompt: "What is the price of our top product?" },
    ];
  }, [currentUser?.role, kpis.lowStockCount]);

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);

  const handleShareInsight = (msg: Message) => {
    setSelectedInsight({
      name: msg.chart?.title || "AI Analysis",
      content: msg.content
    });
    setEmailModalOpen(true);
  };

  const [isListening, setIsListening] = useState(false);
  const toggleListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error("Speech recognition not supported in this browser");
      return;
    }
    
    setIsListening(!isListening);
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    if (!isListening) recognition.start();
    else recognition.stop();
  };

  const bgColor = isDark ? "bg-[#0A0A0A]" : "bg-white";
  const textColor = isDark ? "text-gray-100" : "text-gray-900";
  const borderColor = isDark ? "border-white/5" : "border-gray-100";
  const sidebarColor = isDark ? "bg-black" : "bg-gray-50/50";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`sm:max-w-[100vw] h-[100vh] p-0 overflow-hidden rounded-none border-none shadow-2xl ${bgColor} ${textColor} flex flex-row gap-0`}>
        {/* Left Sidebar: History */}
        <aside className={`hidden md:flex w-[280px] shrink-0 ${sidebarColor} flex-col h-full border-r ${borderColor} transition-all z-50`}>
          <div className="p-5 flex flex-col h-full">
            <Button 
              onClick={createNewTab}
              className="w-full h-10 mb-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-100/50 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              New Analysis
            </Button>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
              <Input 
                placeholder="Search history..." 
                className={`h-8 pl-8 ${isDark ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} rounded-lg text-[10px] font-bold uppercase tracking-tight placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-indigo-500/30 transition-all`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-6">
                {pinnedTabs.length > 0 && (
                  <div>
                    <h4 className="px-2 mb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Pin className="w-3 h-3" /> Pinned
                    </h4>
                    <div className="space-y-1">
                      {pinnedTabs.map((tab) => (
                        <ChatHistoryItem 
                          key={tab.id}
                          tab={tab}
                          isActive={activeTabId === tab.id}
                          onSelect={() => setActiveTabId(tab.id)}
                          onDelete={(e) => deleteTab(tab.id, e)}
                          onPin={(e) => togglePin(tab.id, e)}
                          onRename={(e) => startRenaming(tab.id, tab.title, e)}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="px-2 mb-3 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-3 h-3" /> Recent Analysis
                  </h4>
                  <div className="space-y-1">
                    {recentTabs.map((tab) => (
                      <ChatHistoryItem 
                        key={tab.id}
                        tab={tab}
                        isActive={activeTabId === tab.id}
                        onSelect={() => setActiveTabId(tab.id)}
                        onDelete={(e) => deleteTab(tab.id, e)}
                        onPin={(e) => togglePin(tab.id, e)}
                        onRename={(e) => startRenaming(tab.id, tab.title, e)}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="mt-auto pt-6 border-t border-gray-200/10 space-y-4">
              <div className={`flex items-center gap-3 px-3 py-3 ${isDark ? "bg-white/5" : "bg-white"} rounded-2xl border ${borderColor} shadow-sm`}>
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-black text-white uppercase">
                  {currentUser?.name?.[0] || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{currentUser?.name || "John Doe"}</p>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter truncate">
                    {currentStore?.name || "Main Store - Downtown"}
                  </p>
                  <p className="text-[8px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">
                    {currentUser?.role || "Store Owner"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-gray-500 hover:text-indigo-600 h-10 rounded-xl px-3 text-xs font-bold gap-3" onClick={onClose}>
                <X className="w-4 h-4" /> Close Assistant
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className={`flex-1 min-w-0 flex flex-col ${bgColor} h-full relative overflow-hidden`}>
          {/* Header */}
          <header className={`h-16 shrink-0 flex items-center justify-between px-8 border-b ${borderColor} ${isDark ? "bg-[#0A0A0A]/80" : "bg-white/80"} backdrop-blur-md sticky top-0 z-30`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
                  <span className="text-white font-black text-[10px] tracking-tighter">SS</span>
                </div>
                <h2 className={`text-lg font-black tracking-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                  <span className="text-[#3B82F6]">SellSync</span> AI
                </h2>
                <Badge variant="outline" className={`text-[10px] font-black px-1.5 py-0 border-indigo-100 text-indigo-600 uppercase`}>Pro</Badge>
              </div>
              <div className="h-4 w-[1px] bg-gray-200 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Live • Connected</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                className={`h-10 w-10 rounded-xl ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"}`}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-10 w-10 rounded-xl ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"}`}
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-10 w-10 rounded-xl ${isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"}`}
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </header>

          {/* Messages Area */}
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full w-full" ref={scrollAreaRef}>
              <div className="p-8 md:p-12 pb-[300px] space-y-12 max-w-4xl mx-auto w-full">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg, idx) => (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-6 ${msg.role === "user" ? "justify-end" : "justify-start"} group`}
                    >
                      {msg.role === "ai" && (
                        <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center ${isDark ? "bg-white/5 border-white/10" : "bg-indigo-600 text-white shadow-lg shadow-indigo-100"}`}>
                          <Sparkles className="w-5 h-5" />
                        </div>
                      )}
                      
                      <div className={`flex flex-col gap-4 ${msg.role === "user" ? "max-w-[80%] items-end" : "max-w-[100%] items-start w-full"}`}>
                        <div className={`${
                          msg.role === "user" 
                            ? "bg-indigo-50 text-indigo-900 px-6 py-4 rounded-[2rem] rounded-tr-none border border-indigo-100 shadow-sm" 
                            : `${isDark ? "text-gray-100" : "text-gray-800"} leading-relaxed text-lg w-full prose prose-p:leading-relaxed prose-strong:font-black prose-headings:font-black max-w-none`
                        }`}>
                          <div className="whitespace-pre-wrap font-medium">
                            {msg.content}
                          </div>
                          
                          {msg.role === "ai" && (
                            <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600" onClick={() => {
                                navigator.clipboard.writeText(msg.content);
                                toast.success("Copied to clipboard");
                              }}>
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600">
                                <ThumbsUp className="w-3.5 h-3.5" />
                              </Button>
                              <div className="h-3 w-[1px] bg-gray-200 mx-1" />
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest gap-2" onClick={() => handleShareInsight(msg)}>
                                <Share2 className="w-3 h-3" /> Share
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest gap-2">
                                <Volume2 className="w-3 h-3" /> Listen
                              </Button>
                            </div>
                          )}
                        </div>

                        {msg.chart && (
                          <div className={`w-full ${isDark ? "bg-black/40 border-white/5" : "bg-gray-50 border-gray-100"} border rounded-[2rem] p-8 shadow-sm mt-2 relative overflow-hidden group/chart`}>
                            <div className="flex items-center justify-between mb-8 relative z-10">
                              <div>
                                <h4 className="font-black text-gray-900 dark:text-white text-base tracking-tight">{msg.chart.title}</h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Live Store Analytics</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-indigo-600 border border-gray-200 bg-white rounded-xl" title="Download CSV">
                                  <FileDown className="w-4 h-4" />
                                </Button>
                                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 text-[9px] font-black py-1 px-2 rounded-lg uppercase tracking-widest">AI Core</Badge>
                              </div>
                            </div>
                            <div className="h-[300px] w-full relative z-10">
                              <ChartRenderer config={msg.chart} isDark={isDark} formatCurrency={formatCurrency} />
                            </div>
                          </div>
                        )}
                      </div>

                      {msg.role === "user" && (
                        <div className="w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs uppercase shadow-sm">
                          {currentUser?.name?.[0] || "U"}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex gap-6"
                  >
                    <div className={`w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100 animate-pulse`}>
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-4 w-full">
                      <div className={`leading-relaxed text-lg font-medium ${isDark ? "text-gray-100" : "text-gray-800"}`}>
                        {streamingContent || (
                          <div className="flex items-center gap-3">
                            <span className="text-indigo-600 font-black animate-pulse">SellSync AI is thinking</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </ScrollArea>
          </div>

          {/* Persistent Input Bar */}
          <div className={`absolute bottom-0 left-0 right-0 p-6 pt-0 ${isDark ? "bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent" : "bg-gradient-to-t from-white via-white/95 to-transparent"} z-40`}>
            <div className="max-w-4xl mx-auto relative">
              {messages.length < 2 && !isTyping && (
                <div className="flex flex-wrap gap-2 mb-4 justify-center">
                  {quickPrompts.slice(0, 3).map((item, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(item.prompt)}
                      className={`h-9 ${isDark ? "bg-white/5 border-white/10 text-gray-400 hover:text-white" : "bg-white border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200"} text-[10px] font-black uppercase tracking-tight rounded-2xl px-4 shadow-sm transition-all active:scale-95`}
                    >
                      {item.label}
                    </Button>
                  ))}
                </div>
              )}

              <div className={`${isDark ? "bg-[#1A1A1A] border-white/10" : "bg-white border-gray-200 shadow-xl shadow-indigo-100/30"} rounded-3xl border focus-within:border-indigo-500/50 transition-all flex flex-col p-2`}>
                <textarea 
                  ref={inputRef}
                  rows={1}
                  placeholder="Ask anything about your store..." 
                  className={`w-full bg-transparent border-none ${isDark ? "text-gray-200" : "text-gray-900"} text-sm font-medium focus:ring-0 px-4 py-3 resize-none max-h-32 overflow-y-auto`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <div className={`flex items-center justify-between px-2 py-1.5 border-t ${isDark ? "border-white/5" : "border-gray-50"} mt-0.5`}>
                  <div className="flex items-center gap-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600 rounded-lg" title="Attach Data">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 rounded-lg transition-all ${isListening ? "text-red-500 animate-pulse bg-red-50" : "text-gray-400 hover:text-indigo-600"}`}
                      onClick={toggleListening}
                      title="Voice Input"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600 rounded-lg" onClick={() => handleSend([...messages].reverse().find(m => m.role === 'user')?.content)} title="Regenerate">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsLiveContext(!isLiveContext)}
                      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                        isLiveContext 
                          ? "bg-green-50 border-green-100 text-green-700" 
                          : "bg-gray-50 border-gray-100 text-gray-400"
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-widest">Live Context</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${isLiveContext ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-gray-300"}`} />
                    </button>
                    <Button 
                      size="icon"
                      className={`h-9 w-9 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all active:scale-90 ${!input.trim() || isTyping ? "opacity-20 grayscale" : "shadow-lg shadow-indigo-200"}`}
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isTyping}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className={`text-center text-[9px] font-black uppercase tracking-[0.2em] mt-4 ${isDark ? "text-gray-600" : "text-gray-400"}`}>
                SellSync Intelligent Core • Processing {inventoryArray.length} SKU Data Streams
              </p>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Quick Prompts & Live Context */}
        <aside className={`hidden xl:flex w-[340px] shrink-0 ${sidebarColor} flex-col h-full border-l ${borderColor} overflow-y-auto z-50`}>
          <div className="p-8 space-y-10">
            <div className="space-y-6">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" /> Live Store Stats
              </h4>
              <div className="space-y-4">
                <div className={`${isDark ? "bg-[#0A0A0A]" : "bg-white shadow-sm"} p-5 rounded-3xl border ${borderColor} group hover:border-indigo-200 transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Revenue</p>
                    <div className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-widest border border-green-100">Live</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-2xl font-black">{formatCurrency(kpis.totalRevenueToday)}</p>
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center gap-1 text-[11px] font-black ${kpis.totalRevenueTodayChange >= 0 ? "text-green-600" : "text-red-600"}`}>
                        <TrendingUp className="w-3.5 h-3.5" />
                        {kpis.totalRevenueTodayChange}%
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold uppercase">vs Yesterday</p>
                    </div>
                  </div>
                </div>

                <div className={`${isDark ? "bg-[#0A0A0A]" : "bg-white shadow-sm"} p-5 rounded-3xl border ${borderColor} group hover:border-red-200 transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Risk</p>
                    <div className="px-2 py-1 rounded-lg bg-red-50 text-red-700 text-[9px] font-black uppercase tracking-widest border border-red-100">Critical</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-black">{kpis.lowStockCount}</p>
                      <p className="text-xs text-gray-500 font-bold">Items below reorder point</p>
                    </div>
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                  <div className="mt-5 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                      style={{ width: `${(kpis.lowStockCount / inventoryArray.length) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" /> Quick Analysis
              </h4>
              <div className="grid grid-cols-1 gap-2.5">
                {quickPrompts.map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => handleSend(item.prompt)}
                    className={`flex items-center justify-between w-full p-4 rounded-2xl ${isDark ? "bg-[#0A0A0A] border-white/5" : "bg-white border-gray-100 shadow-sm"} text-left hover:border-indigo-600 hover:bg-indigo-50 transition-all group active:scale-[0.98]`}
                  >
                    <span className="text-[11px] font-bold text-gray-600 group-hover:text-indigo-700">{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-600" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200/10">
              <div className="p-5 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl shadow-indigo-100/50">
                <h5 className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-2">Pro Insights</h5>
                <p className="text-xs text-indigo-50 leading-relaxed font-bold">
                  "Show me sales trends for beverages" will generate a specific category growth report.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </DialogContent>
      <EmailShareModal 
        open={emailModalOpen} 
        onClose={() => setEmailModalOpen(false)} 
        reportName={selectedInsight?.name || "AI Insight"} 
        reportType="AI Analysis"
        file={null}
      />
    </Dialog>
  );
}

function ChartRenderer({ config, isDark, formatCurrency }: { config: any, isDark: boolean, formatCurrency: (v: number) => string }) {
  const { chartType, data, xKey, yKey } = config;

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 gap-3">
        <BarChart4 className="w-10 h-10 opacity-20" />
        <p className="text-xs font-black uppercase tracking-widest">No data for this analysis</p>
      </div>
    );
  }

  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
  const labelColor = isDark ? "#666" : "#999";
  const mainColor = "#6366F1";

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAreaAI" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={mainColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={mainColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: labelColor }} dy={10} />
          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: labelColor }} tickFormatter={(val) => formatCurrency(val)} />
          <Tooltip 
            contentStyle={{ backgroundColor: isDark ? '#1A1A1A' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
            itemStyle={{ color: mainColor, fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: labelColor, fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '900' }}
          />
          <Area type="monotone" dataKey={yKey} stroke={mainColor} strokeWidth={4} fillOpacity={1} fill="url(#colorAreaAI)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis dataKey={xKey} fontSize={10} tickLine={false} axisLine={false} tick={{ fill: labelColor }} dy={10} />
          <YAxis fontSize={10} tickLine={false} axisLine={false} tick={{ fill: labelColor }} />
          <Tooltip 
            cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
            contentStyle={{ backgroundColor: isDark ? '#1A1A1A' : '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
          />
          <Bar dataKey={yKey} radius={[6, 6, 0, 0]} barSize={32}>
            {data.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? mainColor : `${mainColor}40`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

const SYSTEM_PROMPT = `You are SellSync AI, an intelligent assistant built into the SellSync retail management platform. 

SellSync is a complete AI-powered retail operating system that helps store owners and managers run their business efficiently. It includes POS, inventory, transactions, insights, forecasts, reports, notifications, and multi-store management. 

Core tabs and their functions: 
- Dashboard: Live overview with KPIs (Total Revenue Today, Total Sales, Low Stock Items, Products Sold), sales trend chart, top products, low stock alerts, and AI insights. 
- Inventory: Manage stock levels, view total products, stock on hand, low stock, critical items. Includes filters, export, and restock suggestions. 
- Products: Product catalog with search, popular items grid, add product, generate QR code, edit, and delete. 
- POS: Point of sale interface with popular items (5-column grid), search/scan barcode, current order sidebar, voice commands, and payment processing. 
- Transactions: List of all sales with filters, three-dots menu for View Details, Reprint Receipt, Email Receipt, and Refund Sale. 
- Insights: Analytics with dead stock alerts, sales trends, product performance, and AI-generated reports. 
- Forecasts: Stock depletion forecast, weekly demand prediction, reorder recommendations, and simulate impact tool. 
- Reports: Custom reports, AI chat for analysis, available reports (monthly sales, inventory status, financial summary), tax/VAT calculator. 
- Notifications: User preferences for email, SMS, in-app, and browser push notifications. 
- Settings: Store Profile (manage multiple stores), Users & Roles (add/edit users with roles and assigned stores), Preferences (currency, theme), Receipts (default email/phone), Payments & Devices (link bank accounts and POS terminals). 

You have real-time access to the store’s data including inventory, transactions, sales, and forecasts. 

Always answer based on actual SellSync functionality. Be professional, clear, and actionable. When appropriate, offer to show charts, tables, or suggest next steps. If data is missing, be honest (e.g., 'No sales recorded yet — start using POS to unlock insights'). 

Personalization context:
- Always greet the user personally at the start of a conversation.
- Tailor insights based on the user's role:
  - Admin: High-level summaries, multi-store comparisons, strategic recommendations.
  - Manager: Operational insights, team performance, daily tasks.
  - Staff: Simple, task-focused answers.
- Use the current store's actual data in your analysis.
`;

function generateAIResponse(question: string, data: any): Message {
  const q = question.toLowerCase();
  const { kpis, inventoryArray, formatCurrency, currentUser, currentStore } = data;
  const userName = currentUser?.name || "User";
  const storeName = currentStore?.name || "Main Store";
  const userRole = currentUser?.role || "Staff";
  
  // Base response with personalized greeting for new conversations
  let greeting = "";
  if (data.isNewChat) {
    greeting = `Welcome back, ${userName} from ${storeName}!\n\n`;
  }

  if (q.includes("how is my store doing") || q.includes("revenue") || q.includes("sales") || q.includes("performance")) {
    const chartData = [
      { name: "Mon", revenue: 45000 },
      { name: "Tue", revenue: 52000 },
      { name: "Wed", revenue: 48000 },
      { name: "Thu", revenue: 61000 },
      { name: "Fri", revenue: 75000 },
      { name: "Sat", revenue: 68000 },
      { name: "Sun", revenue: 59000 },
    ];
    
    let content = `${greeting}### ${storeName} Performance Analysis\n\n`;
    
    if (userRole === "Admin") {
      content += `As an Admin, I've analyzed your store's live transaction streams. Your total revenue today for **${storeName}** is **${formatCurrency(kpis.totalRevenueToday)}**, reflecting a **${kpis.totalRevenueTodayChange > 0 ? "+" : ""}${kpis.totalRevenueTodayChange}%** change compared to yesterday.\n\n**Strategic Insights:**\n- **Growth Trend:** Weekly volume is trending upward by 12.4%.\n- **Multi-Store Comparison:** This location is performing 8% above your network average.\n- **Recommendation:** Consider expanding the beverage category based on high velocity.`;
    } else if (userRole === "Manager") {
      content += `Here is the operational report for **${storeName}**. Today's revenue is **${formatCurrency(kpis.totalRevenueToday)}**.\n\n**Managerial Insights:**\n- **Peak Hours:** Sales peaked at 4 PM today. Ensure maximum staff coverage during afternoon shifts.\n- **Team Tasks:** 4 low-stock items need immediate reorder (check the Inventory tab).`;
    } else {
      content += `Today at **${storeName}**, we've recorded **${formatCurrency(kpis.totalRevenueToday)}** in sales. Things are moving well!\n\n**Quick Tips:**\n- You can use the POS tab to process new orders faster using voice commands.\n- Don't forget to check for low stock alerts before your shift ends.`;
    }

    return {
      id: `msg-ai-${Date.now()}`,
      role: "ai",
      content: content,
      chart: {
        chartType: "area",
        title: "Weekly Revenue Velocity",
        xKey: "name",
        yKey: "revenue",
        data: chartData,
      },
      timestamp: new Date(),
    };
  }

  if (q.includes("product") || q.includes("inventory") || q.includes("stock") || q.includes("low")) {
    const topProducts = inventoryArray
      .sort((a: any, b: any) => b.stock - a.stock)
      .slice(0, 5)
      .map((p: any) => ({ name: p.name, units: p.stock }));

    let content = `${greeting}### Inventory Intelligence Report for ${storeName}\n\n`;
    content += `Analyzing **${inventoryArray.length} active SKUs**. Currently, you have **${kpis.lowStockCount} items** below their reorder points.\n\n`;
    
    if (kpis.lowStockCount > 0) {
      content += `**Critical Stock Alerts:**\n- **${topProducts[0]?.name}**: Only ${topProducts[0]?.units} units remaining.\n- **Action Required**: Reorder recommended by Wednesday to avoid stockout.\n\n`;
    }

    if (userRole === "Admin" || userRole === "Manager") {
      content += `**Business Recommendations:**\n1. **Immediate Reorder**: Top 3 critical items in Inventory tab.\n2. **Promotional Opportunity**: Consider a bundle offer for 'Home Goods' to free up shelf space.`;
    }

    return {
      id: `msg-ai-${Date.now() + 1}`,
      role: "ai",
      content: content,
      chart: {
        chartType: "bar",
        title: "Product Stock Distribution (Top 5)",
        xKey: "name",
        yKey: "units",
        data: topProducts,
      },
      timestamp: new Date(),
    };
  }

  return {
    id: `msg-ai-${Date.now()}`,
    role: "ai",
    content: `${greeting}I'm processing that request using your live store data for **${storeName}**. \n\nCould you please specify if you'd like to see a report on **Sales**, **Inventory**, or **Financial Forecasts**? I can generate charts and provide recommendations tailored to your role as **${userRole}**.`,
    timestamp: new Date(),
  };
}
