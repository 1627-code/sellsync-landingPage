import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Search, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import React from "react";

type Item = {
  id: number;
  name: string;
  currentStock: number;
  forecastedStock: number;
  reorderPoint: number;
  recommendedOrder: number;
  status: "good" | "warning" | "critical" | string;
  daysUntilStockout: number;
  category: string;
};

type ReorderTableProps = {
  items: Item[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
};

export function ReorderTable({ items, selected, onToggle, onSelectAll }: ReorderTableProps) {
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("All");

  const filteredItems = items.filter(i => {
    const matchesQuery = i.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "All" || 
      (statusFilter === "Healthy" && i.status === "good") ||
      (statusFilter === "Monitor" && i.status === "warning") ||
      (statusFilter === "Critical" && i.status === "critical");
    return matchesQuery && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const info = status === "critical" ? "Critical: Stock will run out in less than 3 days. Immediate reorder required." : 
                 status === "warning" ? "Monitor: Stock is below reorder point. Plan for restock within 7 days." : 
                 "Healthy: Stock levels are optimal for current demand forecasts.";

    switch (status) {
      case "good":
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Healthy</Badge>
          </div>
        );
      case "warning":
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">Monitor</Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-gray-400 hover:text-indigo-600 transition-colors" title="Why?">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 text-xs bg-white shadow-xl border-gray-100">
                <p className="font-bold text-gray-900 mb-1">AI Insight</p>
                <p className="text-gray-600 leading-relaxed">{info}</p>
              </PopoverContent>
            </Popover>
          </div>
        );
      case "critical":
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Badge variant="destructive" className="border-none">Critical</Badge>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-gray-400 hover:text-indigo-600 transition-colors" title="Why?">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-3 text-xs bg-white shadow-xl border-gray-100">
                <p className="font-bold text-gray-900 mb-1">AI Insight</p>
                <p className="text-gray-600 leading-relaxed">{info}</p>
              </PopoverContent>
            </Popover>
          </div>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center px-1">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search products..." 
            className="pl-9 h-10 bg-white border-gray-200 rounded-lg text-sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg w-full sm:w-auto">
          {["All", "Critical", "Monitor", "Healthy"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === s ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox 
                  checked={selected.size === filteredItems.length && filteredItems.length > 0} 
                  onCheckedChange={(checked) => onSelectAll(!!checked)} 
                />
              </TableHead>
              <TableHead className="font-bold text-gray-900">Product</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Current</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Forecast (6w)</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Days to Stockout</TableHead>
              <TableHead className="text-right font-bold text-gray-900">Recommend</TableHead>
              <TableHead className="text-right font-bold text-gray-900 pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.map((i) => (
              <TableRow key={i.id} className="hover:bg-gray-50/50 transition-colors">
                <TableCell className="text-center">
                  <Checkbox checked={selected.has(i.id)} onCheckedChange={() => onToggle(i.id)} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 border border-gray-100 overflow-hidden">
                      <img src={`https://placehold.co/32x32/4f46e5/ffffff?text=${i.name[0]}`} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 leading-tight">{i.name}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-widest">{i.category}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">{i.currentStock}</TableCell>
                <TableCell className="text-right font-medium">{i.forecastedStock}</TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold ${i.daysUntilStockout < 5 ? 'text-red-500' : 'text-gray-600'}`}>
                    {i.daysUntilStockout}d
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex flex-col items-end">
                    <span className="font-black text-indigo-600">+{i.recommendedOrder}</span>
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Units</span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6">{getStatusBadge(i.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
