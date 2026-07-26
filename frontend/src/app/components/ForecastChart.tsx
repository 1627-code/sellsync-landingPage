import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import React from "react";

type ForecastPoint = {
  date: string;
  actual?: number | null;
  predicted?: number | null;
  lower?: number | null;
  upper?: number | null;
  variance?: number;
  daysToStockout?: number;
};

type ForecastChartProps = {
  title: string;
  subtitle?: string;
  data: ForecastPoint[];
  mode?: "line" | "area" | "stock";
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl">
        <p className="font-bold text-gray-900 mb-2 border-b border-gray-50 pb-1">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-8">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-gray-500 font-medium">{entry.name}</span>
              </div>
              <span className="text-sm font-black text-gray-900">{entry.value}</span>
            </div>
          ))}
          {payload[0]?.payload.variance !== undefined && (
            <div className="pt-2 mt-2 border-t border-gray-50 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-400">Variance</span>
              <span className={`text-xs font-black ${payload[0].payload.variance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {payload[0].payload.variance > 0 ? '+' : ''}{payload[0].payload.variance}%
              </span>
            </div>
          )}
          {payload[0]?.payload.daysToStockout !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-gray-400">Days to Stockout</span>
              <span className="text-xs font-black text-indigo-600">{payload[0].payload.daysToStockout} days</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function ForecastChart({ title, subtitle, data, mode = "line" }: ForecastChartProps) {
  const [hidden, setHidden] = React.useState<Record<string, boolean>>({});

  const toggleLine = (e: any) => {
    const { dataKey } = e;
    setHidden(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  return (
    <Card className="border-gray-200 shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-gray-900">{title}</CardTitle>
        {subtitle && <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{subtitle}</p>}
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={340}>
          {mode === "area" ? (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle" 
                wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} 
                onClick={toggleLine}
                className="cursor-pointer"
              />
              <Area 
                name="Predicted"
                type="monotone" 
                dataKey="predicted" 
                stroke="#6366F1" 
                strokeWidth={3}
                fill="url(#colorPredicted)" 
                hide={hidden["predicted"]}
                animationDuration={1500}
              />
              <Area 
                name="Actual"
                type="monotone" 
                dataKey="actual" 
                stroke="#10B981" 
                strokeWidth={3}
                fill="url(#colorActual)" 
                hide={hidden["actual"]}
                animationDuration={1500}
              />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle" 
                wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} 
                onClick={toggleLine}
                className="cursor-pointer"
              />
              {mode === "stock" && (
                <Area 
                  name="Confidence Band"
                  type="monotone" 
                  dataKey="upper" 
                  stroke="none" 
                  fill="#6366F1" 
                  fillOpacity={0.05} 
                  baseValue="lower"
                  animationDuration={1500}
                />
              )}
              <Line 
                name="Predicted"
                type="monotone" 
                dataKey="predicted" 
                stroke="#6366F1" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
                hide={hidden["predicted"]}
                animationDuration={1500}
              />
              <Line 
                name="Actual"
                type="monotone" 
                dataKey="actual" 
                stroke="#10B981" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
                hide={hidden["actual"]}
                animationDuration={1500}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
