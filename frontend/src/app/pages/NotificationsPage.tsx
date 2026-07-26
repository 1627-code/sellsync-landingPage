import React, { useMemo, useState, useEffect } from "react";
import {
  Bell,
  Package,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  ExternalLink,
  Check,
  MoreVertical,
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useStore, AppNotification } from "../state/store";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeInUp } from "../../animations/variants";
import { toast } from "sonner";

export function NotificationsPage() {
  const { 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead, 
    clearAllNotifications 
  } = useStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "unread" | "alert" | "success">("all");

  // KPI Calculations
  const stats = useMemo(() => ({
    total: notifications.length,
    unread: notifications.filter(n => !n.read).length,
    alerts: notifications.filter(n => n.type === "alert").length,
    resolved: notifications.filter(n => n.type === "success").length,
  }), [notifications]);

  // Filtered Notifications
  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case "unread": return notifications.filter(n => !n.read);
      case "alert": return notifications.filter(n => n.type === "alert");
      case "success": return notifications.filter(n => n.type === "success");
      default: return notifications;
    }
  }, [notifications, filter]);

  // Relative Time Formatter
  const getRelativeTime = (isoString: string) => {
    const now = new Date();
    const then = new Date(isoString);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);
    
    if (diffInSeconds < 60) return "just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  // Toast for new critical alerts
  useEffect(() => {
    const lastNotification = notifications[0];
    if (lastNotification && lastNotification.type === "alert" && !lastNotification.read) {
      const isRecent = (new Date().getTime() - new Date(lastNotification.timestamp).getTime()) < 5000;
      if (isRecent) {
        toast.error(lastNotification.title, {
          description: lastNotification.message,
          action: {
            label: "View",
            onClick: () => handleViewDetails(lastNotification)
          }
        });
      }
    }
  }, [notifications, navigate]);

  const handleClearAll = () => {
    toast.warning("Clear all notifications?", {
      action: {
        label: "Clear All",
        onClick: () => {
          clearAllNotifications();
          toast.success("All notifications cleared");
        }
      }
    });
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    toast.success("All notifications marked as read");
  };

  const handleViewDetails = (notification: AppNotification) => {
    markNotificationRead(notification.id);
    
    if (notification.type === "alert" && notification.productId) {
      navigate("/products", { state: { productId: notification.productId } });
    } else if (notification.link) {
      navigate(notification.link);
    } else {
      navigate("/notifications");
    }
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50/30 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Notifications</h1>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 flex items-center gap-1.5 py-1 px-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Updated just now
            </Badge>
          </div>
          <p className="text-gray-500 font-medium">
            Stay updated with important alerts and updates
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="text-gray-500 font-bold hover:text-indigo-600 transition-colors"
            onClick={handleMarkAllRead}
          >
            Mark All as Read
          </Button>
          <Button 
            variant="ghost" 
            className="text-red-500 font-bold hover:bg-red-50 hover:text-red-600 transition-colors gap-2"
            onClick={handleClearAll}
          >
            <X className="w-4 h-4" />
            Clear All
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" variants={staggerContainer} initial="hidden" animate="visible">
        {[
          { label: "Total", value: stats.total, icon: Bell, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Unread", value: stats.unread, icon: Bell, color: "text-orange-600", bg: "bg-orange-50" },
          { label: "Alerts", value: stats.alerts, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
        ].map((stat, i) => (
          <motion.div key={i} variants={fadeInUp}>
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden group hover:shadow-md transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{stat.value}</h3>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
        {[
          { id: "all", label: "All", count: stats.total },
          { id: "unread", label: "Unread", count: stats.unread },
          { id: "alert", label: "Alerts", count: stats.alerts },
          { id: "success", label: "Resolved", count: stats.resolved },
        ].map((pill) => (
          <Button
            key={pill.id}
            variant={filter === pill.id ? "default" : "ghost"}
            className={`rounded-full px-6 h-10 font-bold transition-all ${
              filter === pill.id 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                : "bg-white text-gray-500 hover:bg-gray-100"
            }`}
            onClick={() => setFilter(pill.id as any)}
          >
            {pill.label}
            <Badge className={`ml-2 px-2 py-0 h-5 min-w-[20px] justify-center border-none ${
              filter === pill.id ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {pill.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`group relative bg-white rounded-[2rem] border-l-4 p-6 shadow-sm hover:shadow-md transition-all ${
                  notification.type === "alert" 
                    ? "border-red-500" 
                    : notification.type === "success" 
                    ? "border-green-500" 
                    : "border-blue-500"
                }`}
              >
                <div className="flex items-start gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    notification.type === "alert" 
                      ? "bg-red-50" 
                      : notification.type === "success" 
                      ? "bg-green-50" 
                      : "bg-blue-50"
                  }`}>
                    {notification.type === "alert" ? (
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    ) : notification.type === "success" ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <Bell className="w-6 h-6 text-blue-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <h3 className={`text-lg font-black tracking-tight ${!notification.read ? "text-gray-900" : "text-gray-500"}`}>
                          {notification.title}
                        </h3>
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                        )}
                      </div>
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {getRelativeTime(notification.timestamp)}
                      </span>
                    </div>
                    <p className={`text-sm font-medium leading-relaxed ${!notification.read ? "text-gray-600" : "text-gray-400"}`}>
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-50">
                      {!notification.read && (
                        <button 
                          className="text-xs font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest flex items-center gap-1.5"
                          onClick={() => markNotificationRead(notification.id)}
                        >
                          <Check className="w-3.5 h-3.5" />
                          Mark as Read
                        </button>
                      )}
                      <button 
                        className="text-xs font-black text-gray-400 hover:text-indigo-600 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                        onClick={() => handleViewDetails(notification)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6">
                <Bell className="w-10 h-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-900">All caught up!</h3>
              <p className="text-gray-500 font-medium mt-1">No notifications match your current filter.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
