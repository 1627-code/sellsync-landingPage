// IMPORTANT: Do NOT duplicate imports from shadcn/ui – use only "@/components/ui/..." paths
import React, { useState, useEffect, useRef } from "react";
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

type AIChatModalProps = {
  open: boolean;
  onClose: () => void;
};

const COLORS = ["#6366F1", "#22C55E", "#EF4444", "#F59E0B", "#EC4899", "#8B5CF6"];

function ChatHistoryItem({ tab, isActive, onSelect, onDelete, onPin, onRename }: { 
  tab: ChatTab, 
  isActive: boolean, 
  onSelect: () => void, 
  onDelete: (e: React.MouseEvent) => void,
  onPin: (e: React.MouseEvent) => void,
  onRename: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
        isActive 
          ? "bg-white/10 text-white shadow-inner" 
          : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
      }`}
    >
      <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white opacity-100" : "opacity-50"}`} />
      <span className="flex-1 text-[11px] font-bold truncate tracking-tight">{tab.title}</span>
      
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-white">
              <MoreVertical className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32 bg-[#1A1A1A] border-white/10 text-gray-400">
            <DropdownMenuItem onClick={onPin} className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/5 focus:text-white gap-2">
              <Pin className="w-3 h-3" /> {tab.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename} className="text-[10px] font-bold uppercase tracking-widest focus:bg-white/5 focus:text-white gap-2">
              <Sparkles className="w-3 h-3" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-[10px] font-bold uppercase tracking-widest focus:bg-red-500/10 focus:text-red-500 gap-2">
              <Trash2 className="w-3 h-3" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function AIChatModal({ open, onClose }: AIChatModalProps) {
  const { inventoryArray, transactions, kpis, currentUser } = useStore();
  
  const [tabs, setTabs] = useState<ChatTab[]>(() => {
    const saved = localStorage.getItem("sellsync_chat_tabs_v3");
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
      title: "New Project",
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

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];
  const messages = activeTab.messages;

  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    setTabs(prevTabs => prevTabs.map(tab => {
      if (tab.id === activeTabId) {
        const updatedMessages = typeof newMessages === 'function' ? newMessages(tab.messages) : newMessages;
        
        // Auto-update title based on first user message if it's still "New Project"
        let newTitle = tab.title;
        if (tab.title === "New Project") {
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
      title: "New Project",
      createdAt: new Date(),
      isPinned: false,
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: "ai",
          content: "Hello! I'm your SellSync AI Assistant. How can I help with your store data now?",
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

  const handleRename = () => {
    if (editingTabId && editTitle.trim()) {
      setTabs(prev => prev.map(t => t.id === editingTabId ? { ...t, title: editTitle } : t));
      setEditingTabId(null);
    }
  };

  const [input, setInput] = useState("");

  // Persist tabs to localStorage
  useEffect(() => {
    localStorage.setItem("sellsync_chat_tabs_v3", JSON.stringify(tabs));
  }, [tabs]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
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

    // Simulate Streaming Effect
    const fullResponse = generateAIResponse(content, { kpis, inventoryArray, transactions });
    
    // Simulate real-time data pulling delay
    await new Promise(resolve => setTimeout(resolve, 600));

    let currentStream = "";
    const words = fullResponse.content.split(" ");
    for (let i = 0; i < words.length; i++) {
      currentStream += (i === 0 ? "" : " ") + words[i];
      setStreamingContent(currentStream);
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    setMessages(prev => [...prev, { ...fullResponse, id: `msg-ai-${Date.now()}` }]);
    setStreamingContent("");
    setIsTyping(false);
  };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      handleSend(lastUserMsg.content);
    }
  };

  const handleLikeDislike = (msgId: string, type: 'like' | 'dislike') => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          isLiked: type === 'like' ? !m.isLiked : false,
          isDisliked: type === 'dislike' ? !m.isDisliked : false
        };
      }
      return m;
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const handleClearHistory = () => {
    if (confirm("Clear this chat history? This cannot be undone.")) {
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

  const quickPrompts = [
    "Calculate total revenue this month",
    "Show top 5 products chart",
    "Forecast stockouts next week",
    "Compare March vs February sales",
    "What is the average order value?",
  ];

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [smsModalOpen, setSmsModalOpen] = useState(false);
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

  const [isLiveContext, setIsLiveContext] = useState(true);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[100vw] h-[100vh] p-0 overflow-hidden rounded-none border-none shadow-2xl bg-[#0A0A0A] text-gray-100 flex flex-row gap-0">
        {/* Left Sidebar → Chat history and New Chat button */}
        <aside className="hidden md:flex w-[280px] shrink-0 bg-[#000000] flex-col h-full border-r border-white/5 transition-all z-50">
          <div className="p-4 flex flex-col h-full">
            <Button 
              onClick={createNewTab}
              className="w-full h-11 mb-6 bg-white hover:bg-gray-200 text-black rounded-lg font-bold gap-2 transition-all active:scale-95 shadow-lg shadow-black/20"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </Button>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <Input 
                placeholder="Search chats..." 
                className="h-9 pl-9 bg-white/5 border-white/10 text-xs focus:ring-white/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <ScrollArea className="flex-1 -mx-2 px-2">
              <div className="space-y-6">
                {pinnedTabs.length > 0 && (
                  <div>
                    <h4 className="px-2 mb-2 text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
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
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="px-2 mb-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Chats</h4>
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
                      />
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="mt-auto pt-4 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-xl mb-4 border border-white/5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-[10px] font-black uppercase">
                  {currentUser?.name?.[0] || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{currentUser?.name || "User"}</p>
                  <p className="text-[10px] text-gray-500 truncate">{currentUser?.role || "Store Owner"}</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 h-10 rounded-lg px-3 text-xs gap-3 transition-colors" onClick={onClose}>
                <X className="w-4 h-4" /> Close AI
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Chat Area → Messages and Input bar */}
        <main className="flex-1 min-w-0 flex flex-col bg-[#0A0A0A] h-full relative overflow-hidden">
          {/* Header (Fixed at top) */}
          <header className="h-16 shrink-0 flex items-center justify-between px-6 border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold text-gray-200 tracking-tight flex items-center gap-2">
                SellSync AI
                <Badge variant="outline" className="text-[9px] border-white/10 text-gray-500 uppercase py-0 px-1.5 font-black">PRO</Badge>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse" />
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Live Sync</span>
              </div>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-white h-8 w-8 rounded-lg" title="Share Chat">
                <Share2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-white h-8 w-8 rounded-lg md:hidden" onClick={() => {/* Toggle sidebar logic */}}>
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Messages Area (Scrollable) */}
          <div className="flex-1 overflow-hidden relative">
            <ScrollArea className="h-full w-full" ref={scrollRef}>
              <div className="p-6 md:p-10 pb-48 space-y-12 max-w-3xl mx-auto w-full">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-6 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300 group`}>
                    {msg.role === "ai" && (
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-white/5 border border-white/10 text-white shadow-xl">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}
                    
                    <div className={`flex flex-col gap-4 ${msg.role === "user" ? "max-w-[85%] items-end" : "max-w-[100%] items-start w-full"}`}>
                      <div className={`${
                        msg.role === "user" 
                          ? "bg-[#1A1A1A] text-gray-200 px-4 py-3 rounded-2xl border border-white/5 shadow-lg" 
                          : "text-gray-100 leading-relaxed text-base w-full prose prose-invert max-w-none prose-p:leading-relaxed prose-strong:text-white prose-headings:text-white prose-headings:font-black"
                      }`}>
                        <div className="whitespace-pre-wrap font-medium">
                          {msg.content}
                        </div>
                        
                        {msg.role === "ai" && (
                          <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white" onClick={() => copyToClipboard(msg.content)} title="Copy">
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${msg.isLiked ? "text-green-500" : "text-gray-500 hover:text-white"}`}
                              onClick={() => handleLikeDislike(msg.id, 'like')}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${msg.isDisliked ? "text-red-500" : "text-gray-500 hover:text-white"}`}
                              onClick={() => handleLikeDislike(msg.id, 'dislike')}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                            </Button>
                            <div className="h-3 w-[1px] bg-white/10 mx-1" />
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest gap-2" onClick={() => handleShareInsight(msg)}>
                              <Share2 className="w-3 h-3" /> Share
                            </Button>
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest gap-2">
                              <Volume2 className="w-3 h-3" /> Listen
                            </Button>
                          </div>
                        )}
                      </div>

                      {msg.chart && (
                        <div className="w-full bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-2xl mt-2 relative overflow-hidden">
                          <div className="flex items-center justify-between mb-8 relative z-10">
                            <div>
                              <h4 className="font-bold text-white text-sm tracking-tight">{msg.chart.title}</h4>
                              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">Real-time store analysis</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-500 hover:text-white border border-white/5 rounded-md" title="Download Image">
                                <FileDown className="w-3.5 h-3.5" />
                              </Button>
                              <Badge variant="outline" className="border-white/10 text-gray-500 text-[9px] font-bold py-0.5 px-2 rounded-md uppercase tracking-tighter">AI CORE</Badge>
                            </div>
                          </div>
                          <div className="h-[280px] w-full relative z-10">
                            <ChartRenderer config={msg.chart} />
                          </div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-20" />
                        </div>
                      )}
                    </div>

                    {msg.role === "user" && (
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-indigo-600 text-white font-black text-[10px] shadow-lg shadow-indigo-500/20 uppercase">
                        {currentUser?.name?.[0] || "U"}
                      </div>
                    )}
                  </div>
                ))}

                {isTyping && (
                  <div className="flex gap-6 animate-pulse">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex flex-col gap-2 w-full">
                      <div className="text-gray-100 leading-relaxed text-base prose prose-invert font-medium">
                        {streamingContent || "Thinking..."}
                      </div>
                      {!streamingContent && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} className="h-4" />
              </div>
            </ScrollArea>
          </div>

          {/* Input Bar (Fixed at bottom) */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pt-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent z-40">
            <div className="max-w-3xl mx-auto relative group">
              {messages.length < 2 && !isTyping && (
                <div className="flex flex-wrap gap-2 mb-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {quickPrompts.map((prompt, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleSend(prompt)}
                      className="bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 text-[11px] rounded-full px-4"
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              )}

              <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 focus-within:border-white/20 shadow-2xl transition-all flex flex-col p-2">
                <textarea 
                  ref={inputRef as any}
                  rows={1}
                  placeholder="Ask SellSync Assistant anything..." 
                  className="w-full bg-transparent border-none text-gray-200 text-sm font-medium focus:ring-0 px-4 py-3 resize-none max-h-40 overflow-y-auto"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <div className="flex items-center justify-between px-2 py-1 border-t border-white/5 mt-1">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" title="Attach File">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 rounded-lg transition-all ${isListening ? "text-red-500 animate-pulse" : "text-gray-500 hover:text-white hover:bg-white/5"}`}
                      onClick={toggleListening}
                      title="Voice Input"
                    >
                      <Mic className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors" onClick={handleRegenerate} title="Regenerate">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsLiveContext(!isLiveContext)}
                      className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                        isLiveContext 
                          ? "bg-green-500/10 border-green-500/20 text-green-500" 
                          : "bg-white/5 border-white/5 text-gray-500"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">Live Context</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${isLiveContext ? "bg-green-500" : "bg-gray-500"}`} />
                    </button>
                    <Button 
                      size="icon"
                      className={`h-8 w-8 rounded-lg bg-white text-black hover:bg-gray-200 transition-all active:scale-90 ${!input.trim() || isTyping ? "opacity-20 cursor-not-allowed" : "opacity-100 shadow-lg shadow-white/10"}`}
                      onClick={() => handleSend()}
                      disabled={!input.trim() || isTyping}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-center text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-4">
                SellSync Intelligent Core Analyzing {inventoryArray.length} items.
              </p>
            </div>
          </div>
        </main>

        {/* Right Panel → Live Context, Daily Revenue, Inventory Risk, Analysis Models */}
        <aside className="hidden lg:flex w-[300px] shrink-0 bg-[#000000] flex-col h-full border-l border-white/5 overflow-y-auto z-50">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3" /> Live Context
              </h4>
              <div className="space-y-3">
                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-white/5 shadow-lg group hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Daily Revenue</p>
                    <div className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-widest border border-green-500/20">Active</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-xl font-bold text-white">₦{kpis.totalRevenueToday.toLocaleString()}</p>
                    <div className="flex flex-col items-end">
                      <div className={`flex items-center gap-1 text-[10px] font-bold ${kpis.totalRevenueTodayChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                        <TrendingUp className="w-3 h-3" />
                        {kpis.totalRevenueTodayChange}%
                      </div>
                      <p className="text-[8px] text-gray-600 font-bold uppercase">vs Yesterday</p>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0A0A] p-4 rounded-xl border border-white/5 shadow-lg group hover:border-white/10 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Inventory Risk</p>
                    <div className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 text-[8px] font-black uppercase tracking-widest border border-red-500/20">Critical</div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xl font-bold text-white">{kpis.lowStockCount}</p>
                      <p className="text-[10px] text-gray-500 font-medium">Low stock items</p>
                    </div>
                    <Package className="w-5 h-5 text-gray-700" />
                  </div>
                  <div className="mt-4 w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-red-500 rounded-full" 
                      style={{ width: `${(kpis.lowStockCount / inventoryArray.length) * 100}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
                <Layout className="w-3 h-3" /> Analysis Models
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { label: "Revenue Forecast", icon: TrendingUp },
                  { label: "Inventory Analysis", icon: Package },
                  { label: "Sales Trends", icon: Activity },
                  { label: "Profit Analysis", icon: ArrowUpRight },
                ].map((model, i) => (
                  <button 
                    key={i}
                    className="flex items-center justify-between w-full p-3 rounded-xl bg-[#0A0A0A] border border-white/5 text-left hover:border-white/10 hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <model.icon className="w-4 h-4 text-gray-400 group-hover:text-white" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-400 group-hover:text-gray-200">{model.label}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-white" />
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/20">
                <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Pro Tip</h5>
                <p className="text-[11px] text-gray-300 leading-relaxed font-medium">
                  Ask me to "compare March vs February sales" to see a detailed store growth report.
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
        file={null} // AI insights usually share text/link, not a file blob yet
      />
      <SMSShareModal 
        open={smsModalOpen} 
        onClose={() => setSmsModalOpen(false)} 
        reportName={selectedInsight?.name || "AI Insight"} 
        reportType="AI Analysis"
      />
    </Dialog>
  );
}

function ChartRenderer({ config }: { config: any }) {
  const { chartType, data, xKey, yKey, colors } = config;

  if (!data || data.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-gray-400 gap-3 bg-white/5 rounded-2xl">
        <BarChart4 className="w-8 h-8 opacity-20" />
        <p className="text-xs font-bold uppercase tracking-widest">No data available for this chart</p>
      </div>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey={xKey} 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#666' }}
          />
          <YAxis 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#666' }}
            tickFormatter={(val) => `₦${val.toLocaleString()}`} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1A1A1A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#666', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '900' }}
            formatter={(val: number) => [`₦${val.toLocaleString()}`, "Revenue"]}
          />
          <Line 
            type="monotone" 
            dataKey={yKey} 
            stroke="#fff" 
            strokeWidth={3} 
            dot={false}
            activeDot={{ r: 4, fill: '#fff', strokeWidth: 0 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "bar") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey={xKey} 
            fontSize={9} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#666' }}
          />
          <YAxis 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#666' }}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ backgroundColor: '#1A1A1A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#666', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '900' }}
          />
          <Bar dataKey={yKey} radius={[4, 4, 0, 0]} barSize={24}>
            {data.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? "#fff" : "rgba(255,255,255,0.2)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "donut" || chartType === "pie") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={chartType === "donut" ? 55 : 0}
            outerRadius={75}
            paddingAngle={8}
            dataKey={yKey}
            stroke="none"
          >
            {data.map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={index === 0 ? "#fff" : `rgba(255,255,255,${0.6 - index * 0.15})`} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1A1A1A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#666', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '900' }}
          />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#fff" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#fff" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis 
            dataKey={xKey} 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#666' }}
          />
          <YAxis 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tick={{ fill: '#666' }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1A1A1A', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
            labelStyle={{ color: '#666', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '900' }}
          />
          <Area type="monotone" dataKey={yKey} stroke="#fff" strokeWidth={3} fillOpacity={1} fill="url(#colorArea)" />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

function generateAIResponse(question: string, data: any): Message {
  const q = question.toLowerCase();
  const { kpis, inventoryArray, transactions } = data;
  
  if (q.includes("revenue") || q.includes("sales") || q.includes("march vs february") || q.includes("report")) {
    const chartData = [
      { name: "Mon", revenue: 24500 },
      { name: "Tue", revenue: 28900 },
      { name: "Wed", revenue: 26700 },
      { name: "Thu", revenue: 31200 },
      { name: "Fri", revenue: 35600 },
      { name: "Sat", revenue: 32450 },
      { name: "Sun", revenue: 29800 },
    ];
    
    return {
      id: `msg-ai-${Date.now()}`,
      role: "ai",
      content: `### Business Performance Report\n\nI've compiled the requested analytics based on your store's live data streams. Total revenue recorded for this period is **₦${kpis.totalRevenueToday.toLocaleString()}**.\n\n**Performance Highlights:**\n- **Growth:** You've seen a **${kpis.totalRevenueTodayChange > 0 ? "+" : ""}${kpis.totalRevenueTodayChange}%** shift in average volume.\n- **Top Channel:** Direct walk-in sales contributed 68% of today's revenue.\n- **Trend Analysis:** The upward trajectory on Friday suggests successful weekend preparation.\n\nI've generated a performance forecast chart below:`,
      chart: {
        chartType: "area",
        title: "Revenue Forecast & Trends",
        xKey: "name",
        yKey: "revenue",
        data: chartData,
        colors: ["#fff"],
      },
      timestamp: new Date(),
    };
  }

  if (q.includes("top 5") || q.includes("product") || q.includes("inventory analysis")) {
    const topProducts = inventoryArray
      .sort((a: any, b: any) => b.stock - a.stock)
      .slice(0, 5)
      .map((p: any) => ({ name: p.name, units: p.stock }));

    return {
      id: `msg-ai-${Date.now() + 1}`,
      role: "ai",
      content: `### Inventory & Product Analysis\n\nAnalyzing **${inventoryArray.length} unique SKUs** from your database. Here is the current stock distribution for your top-performing items:\n\n1. **${topProducts[0]?.name}** — ${topProducts[0]?.units} units remaining.\n2. **${topProducts[1]?.name}** — ${topProducts[1]?.units} units remaining.\n3. **${topProducts[2]?.name}** — ${topProducts[2]?.units} units remaining.\n4. **${topProducts[3]?.name}** — ${topProducts[3]?.units} units remaining.\n5. **${topProducts[4]?.name}** — ${topProducts[4]?.units} units remaining.\n\n**Recommendations:**\n- Restock **${topProducts[0]?.name}** within 3 days to maintain sales velocity.\n- Consider a "Flash Sale" for slower moving items in the electronics category.`,
      chart: {
        chartType: "bar",
        title: "Product Stock Levels (Top 5)",
        xKey: "name",
        yKey: "units",
        data: topProducts,
        colors: ["#fff"],
      },
      timestamp: new Date(),
    };
  }

  if (q.includes("stockout") || q.includes("risk") || q.includes("prediction") || q.includes("reorder")) {
    const riskData = [
      { name: "Critical", value: kpis.lowStockCount },
      { name: "Warning", value: 8 },
      { name: "Healthy", value: inventoryArray.length - kpis.lowStockCount - 8 },
    ];

    return {
      id: `msg-ai-${Date.now() + 2}`,
      role: "ai",
      content: `### Stockout Prediction & Risk Model\n\nMy predictive engine has flagged **${kpis.lowStockCount} items** with a high probability of stockout within 48 hours.\n\n**Financial Impact:**\nEstimated revenue loss if not restocked: **₦${(kpis.lowStockCount * 18500).toLocaleString()}**.\n\n**AI Recommendation:**\nGenerate a "Bulk Reorder" request for the top 3 critical items immediately to avoid weekend outages.`,
      chart: {
        chartType: "donut",
        title: "Inventory Risk Breakdown",
        xKey: "name",
        yKey: "value",
        data: riskData,
        colors: ["#fff"],
      },
      timestamp: new Date(),
    };
  }

  if (q.includes("profit") || q.includes("comparison") || q.includes("store")) {
    const profitData = [
      { name: "Store A", value: 450000 },
      { name: "Store B", value: 380000 },
      { name: "Store C", value: 520000 },
    ];
    return {
      id: `msg-ai-${Date.now() + 3}`,
      role: "ai",
      content: `### Store Profitability Comparison\n\nComparing performance across your **3 registered locations**. \n\n**Insights:**\n- **Store C** is currently leading in profit margins at **32%**.\n- **Store B** has the highest customer return rate (4.2%).\n\nI recommend reallocating inventory from Store B to Store C to capitalize on higher demand.`,
      chart: {
        chartType: "pie",
        title: "Profit Distribution by Store",
        xKey: "name",
        yKey: "value",
        data: profitData,
      },
      timestamp: new Date(),
    };
  }

  if (q.includes("average order value") || q.includes("aov") || q.includes("insights")) {
    const aov = transactions.length > 0 ? kpis.totalRevenueToday / transactions.length : 0;
    return {
      id: `msg-ai-${Date.now() + 4}`,
      role: "ai",
      content: `### Order Value Insights\n\nYour **Average Order Value (AOV)** for today is currently **₦${aov.toLocaleString(undefined, { minimumFractionDigits: 2 })}**.\n\nCompared to last week's average of ₦16,200, this represents a **${aov > 16200 ? "positive" : "slight"}** shift in customer spending habits. Upselling premium items could push this metric higher during the evening rush.`,
      timestamp: new Date(),
    };
  }

  return {
    id: `msg-ai-${Date.now() + 5}`,
    role: "ai",
    content: `I'm connected to your live store data and ready to help. You can ask me to:\n\n- **Analyze sales** for specific periods\n- **Identify top products** by units or revenue\n- **Forecast inventory risks** and stockouts\n- **Calculate KPIs** like AOV or conversion rates\n\nWhat would you like me to look into first?`,
    timestamp: new Date(),
  };
}
