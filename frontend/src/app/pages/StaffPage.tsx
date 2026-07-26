import { useMemo, useState } from "react";
import {
  Users,
  Clock,
  DollarSign,
  Calendar as CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Download,
  FileText,
  FileSpreadsheet,
  ArrowUpRight,
  Plus,
  Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import { useStore } from "../state/store";
import { motion } from "framer-motion";
import { staggerContainer, fadeInUp } from "../../animations/variants";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function StaffPage() {
  const { 
    users, 
    attendance, 
    payroll, 
    transactions, 
    currentStore, 
    currentUser,
    clockIn, 
    clockOut, 
    markAbsent,
    formatCurrency,
    storeSettings,
    updateStoreSettings,
    updateStaffDetails,
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState("attendance");
  const [searchTerm, setSearchTerm] = useState("");
  const [historyFilterUser, setHistoryFilterUser] = useState("all");
  const [historyFilterPeriod, setHistoryFilterPeriod] = useState("this-month");
  const [historyFilterAction, setHistoryFilterAction] = useState("all");

  const activeUser = currentUser || users[0];
  const isAdmin = activeUser?.role === "Admin";
  const isManager = activeUser?.role === "Manager";

  // Everyone can see Daily Attendance for themselves. 
  // Only Admin/Manager can see others' attendance and Payroll/History.
  const canSeeAllStaff = isAdmin || isManager;

  const storeUsers = useMemo(() => {
    if (canSeeAllStaff) {
      return users.filter(u => u.assignedStoreIds.includes(currentStore.id));
    }
    return users.filter(u => u.id === activeUser?.id);
  }, [users, currentStore.id, activeUser?.id, canSeeAllStaff]);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const settings = storeSettings[currentStore.id] || {
    clockInTime: "08:00",
    clockOutTime: "18:00",
    gracePeriod: 15,
    lateArrivalPenaltyEnabled: true,
    latePenaltyType: "fixed",
    latePenaltyFixed: 500,
    latePenaltyPerMinute: 50,
    maxLatesPerMonth: 3,
    earlyDeparturePenaltyEnabled: true,
    earlyDeparturePenaltyType: "fixed",
    earlyDeparturePenaltyFixed: 500,
    earlyDeparturePenaltyPerMinute: 50,
    absentDayPenaltyFixed: 1000,
    deductFullDayOnAbsence: true,
    overtimeEnabled: false,
    overtimeMinThreshold: 30,
    overtimeRateType: "multiplier",
    overtimeMultiplier: 1.5,
    overtimeFixedPerHour: 1000,
    weekendHolidayMultiplier: 2.0,
    workingDaysPerMonth: 25,
  };

  // --- Attendance Logic ---
  const todayAttendance = attendance.filter(a => a.date === today && a.storeId === currentStore.id);
  
  const attendanceStats = useMemo(() => {
    const allStoreUsers = users.filter(u => u.assignedStoreIds.includes(currentStore.id));
    const storeTodayAttendance = attendance.filter(a => a.date === today && a.storeId === currentStore.id);
    
    const presentCount = storeTodayAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
    const lateCount = storeTodayAttendance.filter(a => a.status === "Late").length;
    const absentCount = storeTodayAttendance.filter(a => a.status === "Absent").length;
    const rate = allStoreUsers.length > 0 ? (presentCount / allStoreUsers.length) * 100 : 0;

    return {
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      rate: rate.toFixed(1),
      total: allStoreUsers.length
    };
  }, [attendance, users, today, currentStore.id]);

  const handleClockIn = (userId: string) => {
    if (userId !== activeUser?.id && !isAdmin) {
      toast.error("You can only clock in for yourself");
      return;
    }
    
    const now = new Date();
    const [targetHour, targetMin] = settings.clockInTime.split(":").map(Number);
    const targetDate = new Date();
    targetDate.setHours(targetHour, targetMin, 0, 0);
    
    const diffMs = now.getTime() - targetDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    clockIn(userId, currentStore.id);
    
    if (settings.lateArrivalPenaltyEnabled && diffMins > settings.gracePeriod) {
      const penaltyAmount = settings.latePenaltyType === "fixed" ? settings.latePenaltyFixed : diffMins * settings.latePenaltyPerMinute;
      toast.warning(`Clocked in late by ${diffMins} minutes. Penalty: ${formatCurrency(penaltyAmount)}`);
    } else {
      toast.success("Clocked in successfully");
    }
  };

  const handleClockOut = (userId: string) => {
    if (userId !== activeUser?.id && !isAdmin) {
      toast.error("You can only clock out for yourself");
      return;
    }
    
    const now = new Date();
    const [targetHour, targetMin] = settings.clockOutTime.split(":").map(Number);
    const targetDate = new Date();
    targetDate.setHours(targetHour, targetMin, 0, 0);
    
    const diffMs = targetDate.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    clockOut(userId, currentStore.id);
    
    if (settings.earlyDeparturePenaltyEnabled && diffMins > 0) {
      const penaltyAmount = settings.earlyDeparturePenaltyType === "fixed" ? settings.earlyDeparturePenaltyFixed : diffMins * settings.earlyDeparturePenaltyPerMinute;
      toast.warning(`Clocked out early by ${diffMins} minutes. Penalty: ${formatCurrency(penaltyAmount)}`);
    } else {
      const overtimeDiff = now.getTime() - targetDate.getTime();
      const overtimeMins = Math.floor(overtimeDiff / 60000);
      if (settings.overtimeEnabled && overtimeMins >= settings.overtimeMinThreshold) {
        toast.success(`Clocked out with ${Math.floor(overtimeMins / 60)}h ${overtimeMins % 60}m overtime!`);
      } else {
        toast.success("Clocked out successfully");
      }
    }
  };

  // --- History Logic ---
  const historyData = useMemo(() => {
    let filtered = attendance.filter(a => a.storeId === currentStore.id);
    
    if (historyFilterUser !== "all") {
      filtered = filtered.filter(a => a.userId === historyFilterUser);
    }
    
    const now = new Date();
    if (historyFilterPeriod === "today") {
      filtered = filtered.filter(a => a.date === today);
    } else if (historyFilterPeriod === "this-week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      filtered = filtered.filter(a => a.date >= weekAgo);
    } else if (historyFilterPeriod === "this-month") {
      filtered = filtered.filter(a => a.date.startsWith(currentMonth));
    } else if (historyFilterPeriod === "last-30-days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      filtered = filtered.filter(a => a.date >= thirtyDaysAgo);
    }

    if (historyFilterAction === "clock-in-only") {
      filtered = filtered.filter(a => a.clockIn && !a.clockOut);
    } else if (historyFilterAction === "clock-out-only") {
      filtered = filtered.filter(a => a.clockOut);
    } else if (historyFilterAction === "overtime-only") {
      filtered = filtered.filter(a => {
        if (!a.clockOut) return false;
        const cout = new Date(a.clockOut);
        const [th, tm] = settings.clockOutTime.split(":").map(Number);
        const tdate = new Date(cout);
        tdate.setHours(th, tm, 0, 0);
        const diff = Math.floor((cout.getTime() - tdate.getTime()) / 60000);
        return diff >= settings.overtimeMinThreshold;
      });
    }

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, currentStore.id, historyFilterUser, historyFilterPeriod, historyFilterAction, today, currentMonth, settings]);

  // --- Payroll Logic ---
  const payrollData = useMemo(() => {
    const allStoreUsers = users.filter(u => u.assignedStoreIds.includes(currentStore.id));
    
    return allStoreUsers.map(user => {
      // Calculate sales commission
      const staffSales = transactions.filter(tx => 
        tx.status === "Completed" && 
        tx.cashier === user.name && 
        tx.datetime.startsWith(currentMonth)
      );
      const totalSalesValue = staffSales.reduce((sum, tx) => sum + tx.amount, 0);
      const commissionEarned = (totalSalesValue * (user.commissionRate || 0)) / 100;
      
      // Attendance based pay
      const monthAttendance = attendance.filter(a => 
        a.userId === user.id && 
        a.date.startsWith(currentMonth)
      );
      
      const daysPresent = monthAttendance.filter(a => a.status === "Present" || a.status === "Late").length;
      const attendanceRatio = daysPresent / settings.workingDaysPerMonth;
      
      // Penalties & Rewards
      let latePenalty = 0;
      let earlyPenalty = 0;
      let absentPenalty = 0;
      let overtimeReward = 0;
      let totalOvertimeHours = 0;
      
      monthAttendance.forEach(a => {
        if (a.status === "Absent") {
          absentPenalty += settings.absentDayPenaltyFixed;
          return;
        }

        if (a.clockIn && settings.lateArrivalPenaltyEnabled) {
          const cin = new Date(a.clockIn);
          const [th, tm] = settings.clockInTime.split(":").map(Number);
          const tdate = new Date(cin);
          tdate.setHours(th, tm, 0, 0);
          const diff = Math.floor((cin.getTime() - tdate.getTime()) / 60000);
          if (diff > settings.gracePeriod) {
            if (settings.latePenaltyType === "fixed") {
              latePenalty += settings.latePenaltyFixed;
            } else {
              latePenalty += diff * settings.latePenaltyPerMinute;
            }
          }
        }
        
        if (a.clockOut && settings.earlyDeparturePenaltyEnabled) {
          const cout = new Date(a.clockOut);
          const [th, tm] = settings.clockOutTime.split(":").map(Number);
          const tdate = new Date(cout);
          tdate.setHours(th, tm, 0, 0);
          const diff = Math.floor((tdate.getTime() - cout.getTime()) / 60000);
          if (diff > 0) {
            if (settings.earlyDeparturePenaltyType === "fixed") {
              earlyPenalty += settings.earlyDeparturePenaltyFixed;
            } else {
              earlyPenalty += diff * settings.earlyDeparturePenaltyPerMinute;
            }
          }
        }

        if (a.clockOut && settings.overtimeEnabled) {
          const cout = new Date(a.clockOut);
          const [th, tm] = settings.clockOutTime.split(":").map(Number);
          const tdate = new Date(cout);
          tdate.setHours(th, tm, 0, 0);
          const diff = Math.floor((cout.getTime() - tdate.getTime()) / 60000);
          if (diff >= settings.overtimeMinThreshold) {
            const hours = diff / 60;
            totalOvertimeHours += hours;
            if (settings.overtimeRateType === "multiplier") {
              const hourlyRate = (user.baseSalary || 0) / (settings.workingDaysPerMonth * 8);
              overtimeReward += hours * hourlyRate * settings.overtimeMultiplier;
            } else {
              overtimeReward += hours * settings.overtimeFixedPerHour;
            }
          }
        }
      });

      const baseSalary = user.baseSalary || 0;
      const adjustedBaseSalary = baseSalary * Math.min(1, attendanceRatio);
      const allowances = user.allowances || 0;
      const deductions = user.deductions || 0;
      
      const totalPenalties = latePenalty + earlyPenalty + absentPenalty;
      const netPay = adjustedBaseSalary + commissionEarned + allowances + overtimeReward - deductions - totalPenalties;

      return {
        ...user,
        totalSales: totalSalesValue,
        commissionEarned,
        daysPresent,
        attendanceRatio: (attendanceRatio * 100).toFixed(0),
        baseSalary,
        adjustedBaseSalary,
        allowances,
        deductions,
        latePenalty,
        earlyPenalty,
        absentPenalty,
        totalPenalties,
        overtimeReward,
        totalOvertimeHours,
        netPay
      };
    });
  }, [users, currentStore.id, transactions, attendance, currentMonth, settings]);

  const exportPayroll = () => {
    const data = payrollData.map(p => ({
      Name: p.name,
      Role: p.role,
      "Base Salary": p.baseSalary,
      Commission: p.commissionEarned,
      Allowances: p.allowances,
      Deductions: p.deductions,
      "Net Pay": p.netPay,
      "Sales Handled": p.totalSales
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Summary");
    XLSX.writeFile(wb, `Payroll_${currentMonth}_${currentStore.name}.xlsx`);
    toast.success("Payroll exported to Excel");
  };

  const exportHistory = () => {
    const data = historyData.map(h => {
      const user = users.find(u => u.id === h.userId);
      let totalHours = 0;
      if (h.clockIn && h.clockOut) {
        totalHours = (new Date(h.clockOut).getTime() - new Date(h.clockIn).getTime()) / (1000 * 60 * 60);
      }
      return {
        Date: h.date,
        Staff: user?.name,
        Role: user?.role,
        "Clock In": h.clockIn ? new Date(h.clockIn).toLocaleTimeString() : "—",
        "Clock Out": h.clockOut ? new Date(h.clockOut).toLocaleTimeString() : "—",
        "Total Hours": totalHours.toFixed(2),
        Status: h.status
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance History");
    XLSX.writeFile(wb, `Attendance_History_${currentStore.name}.xlsx`);
    toast.success("Attendance history exported to Excel");
  };

  const generatePayslip = (staff: any) => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // Indigo
    doc.text("SellSync Payslip", margin, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Store: ${currentStore.name}`, margin, 40);
    doc.text(`Period: ${currentMonth}`, margin, 45);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, 50);

    // Staff Details
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, 60, 190, 60);
    
    doc.setFontSize(12);
    doc.setTextColor(31, 41, 55);
    doc.text(`Employee Name: ${staff.name}`, margin, 70);
    doc.text(`Role: ${staff.role}`, margin, 80);
    doc.text(`Phone: ${staff.phone}`, margin, 90);

    // Earnings & Deductions Table
    const body = [
      ['Base Salary (Original)', formatCurrency(staff.baseSalary)],
      ['Base Salary (Adjusted)', formatCurrency(staff.adjustedBaseSalary)],
      ['Commission Earned', formatCurrency(staff.commissionEarned)],
      ['Overtime Reward', formatCurrency(staff.overtimeReward)],
      ['Allowances', formatCurrency(staff.allowances)],
      ['Deductions (Manual)', `(${formatCurrency(staff.deductions)})`],
    ];

    if (staff.latePenalty > 0) body.push(['Late Arrival Penalty', `(${formatCurrency(staff.latePenalty)})`]);
    if (staff.earlyPenalty > 0) body.push(['Early Departure Penalty', `(${formatCurrency(staff.earlyPenalty)})`]);
    if (staff.absentPenalty > 0) body.push(['Absenteeism Penalty', `(${formatCurrency(staff.absentPenalty)})`]);

    (doc as any).autoTable({
      startY: 100,
      head: [['Description', 'Amount']],
      body: body,
      foot: [['Net Total Pay', formatCurrency(staff.netPay)]],
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229], fontStyle: 'bold' },
      footStyles: { fillColor: [249, 250, 251], textColor: [31, 41, 55], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right' }
      }
    });

    // Attendance Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Attendance Summary:", margin, finalY);
    doc.text(`- Days Present: ${staff.daysPresent} / ${settings.workingDaysPerMonth}`, margin + 5, finalY + 7);
    doc.text(`- Overtime Hours: ${staff.totalOvertimeHours.toFixed(1)} hrs`, margin + 5, finalY + 14);

    doc.save(`Payslip_${staff.name}_${currentMonth}.pdf`);
    toast.success(`Payslip generated for ${staff.name}`);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50/30 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Staff Management</h1>
          <p className="text-xs text-gray-500 font-medium">Manage attendance, payroll, and performance for {currentStore.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" className="rounded-xl border-gray-200 gap-2 shadow-sm h-9 text-xs font-bold" onClick={exportPayroll}>
              <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
              Export Payroll
            </Button>
          )}
        </div>
      </div>

      {/* KPI Overview */}
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
      >
        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <Badge className="bg-indigo-50 text-indigo-700 border-none text-[10px] font-bold">Today</Badge>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Present Staff</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h3 className="text-2xl font-black text-gray-900">{attendanceStats.present}</h3>
              <span className="text-xs font-bold text-gray-400">/ {attendanceStats.total}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <Badge className="bg-green-50 text-green-700 border-none text-[10px] font-bold">Monthly</Badge>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attendance Rate</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <h3 className="text-2xl font-black text-gray-900">{attendanceStats.rate}%</h3>
              <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <Badge className="bg-amber-50 text-amber-700 border-none text-[10px] font-bold">Alerts</Badge>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Late Arrivals</p>
            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{attendanceStats.late}</h3>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <Badge className="bg-red-50 text-red-700 border-none text-[10px] font-bold">Budget</Badge>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Payroll</p>
            <h3 className="text-xl font-black text-gray-900 mt-0.5">
              {formatCurrency(payrollData.reduce((sum, p) => sum + p.netPay, 0))}
            </h3>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sub Tabs */}
      <Tabs defaultValue="attendance" className="w-full" onValueChange={setActiveSubTab}>
        <TabsList className="bg-white border border-gray-100 p-1 rounded-xl h-12 shadow-sm mb-6">
          <TabsTrigger value="attendance" className="rounded-lg px-6 h-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs font-bold transition-all">
            Daily Attendance
          </TabsTrigger>
          {canSeeAllStaff && (
            <>
              <TabsTrigger value="history" className="rounded-lg px-6 h-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs font-bold transition-all">
                History
              </TabsTrigger>
              <TabsTrigger value="payroll" className="rounded-lg px-6 h-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs font-bold transition-all">
                Payroll & Salaries
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="settings" className="rounded-lg px-6 h-10 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs font-bold transition-all">
                  Staff Settings
                </TabsTrigger>
              )}
            </>
          )}
        </TabsList>

        <TabsContent value="attendance" className="mt-0">
          <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardHeader className="p-6 border-b border-gray-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-gray-900">Attendance Tracker</CardTitle>
                <p className="text-xs text-gray-500 font-medium">Record clock-in/out times for today, {new Date().toLocaleDateString()}</p>
              </div>
              {canSeeAllStaff && (
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input 
                    placeholder="Search staff..." 
                    className="pl-9 h-9 bg-gray-50 border-none rounded-lg text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Staff Member</th>
                      <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Store / Role</th>
                      <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Clock In</th>
                      <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Clock Out</th>
                      <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {storeUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase())).map(user => {
                      const att = todayAttendance.find(a => a.userId === user.id);
                      const isSelf = user.id === activeUser?.id;
                      
                      return (
                        <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-xs">
                                {user.name[0]}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{user.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{user.phone}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-gray-900">{currentStore.name}</p>
                            <Badge className="bg-gray-100 text-gray-600 border-none text-[9px] px-1.5 py-0 font-bold">{user.role}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-black text-gray-900">
                              {att?.clockIn ? new Date(att.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-black text-gray-900">
                              {att?.clockOut ? new Date(att.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {att ? (
                              <div className="flex flex-col gap-1">
                                <Badge className={`${
                                  att.status === "Present" ? "bg-green-50 text-green-700" : 
                                  att.status === "Late" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                                } border-none font-bold text-[10px]`}>
                                  {att.status}
                                </Badge>
                                {att.clockIn && (
                                  (() => {
                                    const cin = new Date(att.clockIn);
                                    const [th, tm] = settings.clockInTime.split(":").map(Number);
                                    const tdate = new Date(cin);
                                    tdate.setHours(th, tm, 0, 0);
                                    const diff = Math.floor((cin.getTime() - tdate.getTime()) / 60000);
                                    if (diff > settings.gracePeriod) {
                                      return <span className="text-[9px] font-bold text-orange-500">Late by {diff} mins</span>;
                                    }
                                    return null;
                                  })()
                                )}
                                {att.clockOut && (
                                  (() => {
                                    const cout = new Date(att.clockOut);
                                    const [th, tm] = settings.clockOutTime.split(":").map(Number);
                                    const tdate = new Date(cout);
                                    tdate.setHours(th, tm, 0, 0);
                                    
                                    const earlyDiff = Math.floor((tdate.getTime() - cout.getTime()) / 60000);
                                    const overtimeDiff = Math.floor((cout.getTime() - tdate.getTime()) / 60000);
                                    
                                    if (earlyDiff > 0) {
                                      return <span className="text-[9px] font-bold text-red-500">Early by {earlyDiff} mins</span>;
                                    }
                                    if (overtimeDiff >= settings.overtimeMinThreshold) {
                                      return <Badge className="bg-green-50 text-green-700 border-none text-[9px] font-bold w-fit">OT: {(overtimeDiff / 60).toFixed(1)}h</Badge>;
                                    }
                                    return null;
                                  })()
                                )}
                              </div>
                            ) : (
                              <Badge className="bg-gray-50 text-gray-400 border-none font-bold text-[10px]">Not Clocked In</Badge>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!att?.clockIn ? (
                                <Button 
                                  size="sm" 
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 h-8 text-[11px] font-bold" 
                                  onClick={() => handleClockIn(user.id)}
                                  disabled={!isSelf && !isAdmin}
                                >
                                  Clock In
                                </Button>
                              ) : !att?.clockOut ? (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-lg px-3 h-8 text-[11px] font-bold" 
                                  onClick={() => handleClockOut(user.id)}
                                  disabled={!isSelf && !isAdmin}
                                >
                                  Clock Out
                                </Button>
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-indigo-600 border-indigo-100 bg-indigo-50/30 h-8 text-[11px] font-bold"
                                  onClick={() => handleClockIn(user.id)}
                                  disabled={!isSelf && !isAdmin}
                                >
                                  Re-Clock In
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {canSeeAllStaff && (
          <>
            <TabsContent value="history" className="mt-0">
              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-gray-50 space-y-4">
                  <div>
                    <CardTitle className="text-lg font-black text-gray-900">Attendance History</CardTitle>
                    <p className="text-xs text-gray-500 font-medium">Detailed logs of all staff clock-in and clock-out actions</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Staff Member</label>
                      <select 
                        className="bg-gray-50 border-none rounded-lg h-9 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
                        value={historyFilterUser}
                        onChange={(e) => setHistoryFilterUser(e.target.value)}
                      >
                        <option value="all">All Staff</option>
                        {users.filter(u => u.assignedStoreIds.includes(currentStore.id)).map(u => (
                          <option key={u.id} value={u.id}>{u.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period</label>
                      <select 
                        className="bg-gray-50 border-none rounded-lg h-9 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
                        value={historyFilterPeriod}
                        onChange={(e) => setHistoryFilterPeriod(e.target.value)}
                      >
                        <option value="today">Today</option>
                        <option value="this-week">This Week</option>
                        <option value="this-month">This Month</option>
                        <option value="last-30-days">Last 30 Days</option>
                        <option value="all-time">All Time</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Action Type</label>
                      <select 
                        className="bg-gray-50 border-none rounded-lg h-9 px-3 text-xs font-bold focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
                        value={historyFilterAction}
                        onChange={(e) => setHistoryFilterAction(e.target.value)}
                      >
                        <option value="all">All Actions</option>
                        <option value="clock-in-only">Clock In Only</option>
                        <option value="clock-out-only">Clock Out Only</option>
                        <option value="overtime-only">Overtime Only</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1 ml-auto">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">&nbsp;</label>
                      <Button variant="outline" size="sm" className="h-9 rounded-lg gap-2 text-xs font-bold" onClick={exportHistory}>
                        <Download className="w-3.5 h-3.5" />
                        Export History
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Staff Name</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Store / Role</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Clock In</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Clock Out</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Hours</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {historyData.map((a, idx) => {
                          const user = users.find(u => u.id === a.userId);
                          let totalHours = "—";
                          if (a.clockIn && a.clockOut) {
                            const diff = new Date(a.clockOut).getTime() - new Date(a.clockIn).getTime();
                            totalHours = (diff / (1000 * 60 * 60)).toFixed(1) + " hrs";
                          }
                          
                          return (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors text-xs">
                              <td className="px-6 py-4 font-bold text-gray-900">
                                {new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center font-black text-indigo-600 text-[10px]">
                                    {user?.name[0]}
                                  </div>
                                  <span className="font-bold text-gray-900">{user?.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <p className="font-bold text-gray-900">{currentStore.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium uppercase">{user?.role}</p>
                              </td>
                              <td className="px-6 py-4 font-black text-gray-900">
                                {a.clockIn ? new Date(a.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                              </td>
                              <td className="px-6 py-4 font-black text-gray-900">
                                {a.clockOut ? new Date(a.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                              </td>
                              <td className="px-6 py-4 font-black text-indigo-600">{totalHours}</td>
                              <td className="px-6 py-4">
                                <Badge className={`${
                                  a.status === "Present" ? "bg-green-50 text-green-700" : 
                                  a.status === "Late" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                                } border-none font-bold text-[10px]`}>
                                  {a.status}
                                </Badge>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payroll" className="mt-0">
              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg font-black text-gray-900">Payroll Processing</CardTitle>
                      <p className="text-xs text-gray-500 font-medium">Automatic salary and commission calculation for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                    </div>
                    <Badge className="bg-indigo-50 text-indigo-700 border-none px-3 py-1 text-xs font-bold">
                      Period: {currentMonth}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Base Salary</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Adj. Base</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Commission</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Overtime</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Penalties</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Net Pay</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Presence</th>
                          <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {payrollData.map(p => (
                          <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-xs font-bold text-gray-900">{p.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{p.role}</p>
                              </div>
                            </td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-gray-400 line-through decoration-red-200">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{formatCurrency(p.baseSalary)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-[10px]">Original monthly base salary</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-gray-900">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>{formatCurrency(p.adjustedBaseSalary)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-[10px]">Adjusted based on attendance ratio ({p.attendanceRatio}%)</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-green-600">+{formatCurrency(p.commissionEarned)}</span>
                              <span className="text-[9px] text-gray-400 font-black">RATE: {p.commissionRate}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs font-bold text-indigo-600">+{formatCurrency(p.overtimeReward)}</span>
                              <span className="text-[9px] text-gray-400 font-black">{p.totalOvertimeHours.toFixed(1)} hrs</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-xs font-bold text-red-500">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>-{formatCurrency(p.totalPenalties)}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-[10px] space-y-1">
                                    {p.latePenalty > 0 && <p>Late Penalty: {formatCurrency(p.latePenalty)}</p>}
                                    {p.earlyPenalty > 0 && <p>Early Penalty: {formatCurrency(p.earlyPenalty)}</p>}
                                    {p.absentPenalty > 0 && <p>Absent Penalty: {formatCurrency(p.absentPenalty)}</p>}
                                    {p.totalPenalties === 0 && <p>No penalties this period</p>}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </td>
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-black text-gray-900">{formatCurrency(p.netPay)}</span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <Badge className="bg-indigo-50 text-indigo-700 border-none font-black text-[9px]">{p.daysPresent}/{settings.workingDaysPerMonth} d</Badge>
                                <span className="text-[9px] text-gray-400 font-black mt-0.5">{p.attendanceRatio}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button variant="outline" size="sm" className="rounded-lg border-indigo-100 text-indigo-600 h-8 text-[11px] font-bold gap-1.5" onClick={() => generatePayslip(p)}>
                                <FileText className="w-3.5 h-3.5" />
                                Payslip
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {isAdmin && (
              <TabsContent value="settings" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Global Shift Settings */}
                  <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-gray-50">
                      <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600" />
                        Store Shift & Penalty Rules
                      </CardTitle>
                      <p className="text-xs text-gray-500 font-medium">Configure working hours and penalty rates for {currentStore.name}</p>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Default Clock-In</label>
                          <Input 
                            type="time" 
                            value={settings.clockInTime} 
                            onChange={(e) => updateStoreSettings(currentStore.id, { clockInTime: e.target.value })}
                            className="h-11 rounded-xl bg-gray-50 border-none font-bold"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Default Clock-Out</label>
                          <Input 
                            type="time" 
                            value={settings.clockOutTime} 
                            onChange={(e) => updateStoreSettings(currentStore.id, { clockOutTime: e.target.value })}
                            className="h-11 rounded-xl bg-gray-50 border-none font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-50">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Penalty Rates</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Late Arrival (Fixed)</label>
                            <Input 
                              type="number" 
                              value={settings.latePenaltyFixed} 
                              onChange={(e) => updateStoreSettings(currentStore.id, { latePenaltyFixed: Number(e.target.value) })}
                              className="h-11 rounded-xl bg-gray-50 border-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Early Departure (Fixed)</label>
                            <Input 
                              type="number" 
                              value={settings.earlyDeparturePenaltyFixed} 
                              onChange={(e) => updateStoreSettings(currentStore.id, { earlyDeparturePenaltyFixed: Number(e.target.value) })}
                              className="h-11 rounded-xl bg-gray-50 border-none font-bold"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Absent Day Penalty</label>
                            <Input 
                              type="number" 
                              value={settings.absentDayPenaltyFixed} 
                              onChange={(e) => updateStoreSettings(currentStore.id, { absentDayPenaltyFixed: Number(e.target.value) })}
                              className="h-11 rounded-xl bg-gray-50 border-none font-bold"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Overtime Rate (₦/hr)</label>
                            <Input 
                              type="number" 
                              value={settings.overtimeFixedPerHour} 
                              onChange={(e) => updateStoreSettings(currentStore.id, { overtimeFixedPerHour: Number(e.target.value) })}
                              className="h-11 rounded-xl bg-gray-50 border-none font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Individual Staff Compensation */}
                  <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                    <CardHeader className="p-6 border-b border-gray-50">
                      <CardTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-indigo-600" />
                        Staff Compensation
                      </CardTitle>
                      <p className="text-xs text-gray-500 font-medium">Set salary and commission for each team member</p>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-gray-50/50">
                              <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Staff</th>
                              <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Base Salary (₦)</th>
                              <th className="px-6 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Comm. (%)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {storeUsers.map(user => (
                              <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="text-xs font-bold text-gray-900">{user.name}</p>
                                  <p className="text-[10px] text-gray-400 font-medium">{user.role}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <Input 
                                    type="number" 
                                    value={user.baseSalary || 0} 
                                    onChange={(e) => updateStaffDetails(user.id, { baseSalary: Number(e.target.value) })}
                                    className="h-9 w-32 rounded-lg bg-gray-50 border-none font-bold text-xs"
                                  />
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <Input 
                                    type="number" 
                                    value={user.commissionRate || 0} 
                                    onChange={(e) => updateStaffDetails(user.id, { commissionRate: Number(e.target.value) })}
                                    className="h-9 w-20 rounded-lg bg-gray-50 border-none font-bold text-xs mx-auto"
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
