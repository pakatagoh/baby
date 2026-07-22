import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthlyData {
  month: string;
  ml: number;
}

interface MonthlyFrozenChartProps {
  title: string;
  data: MonthlyData[];
  onPrev: () => void;
  onNext: () => void;
}

export function MonthlyFrozenChart({ title, data, onPrev, onNext }: MonthlyFrozenChartProps) {
  return (
    <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-border/50">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onPrev} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-sm font-medium">{title}</p>
        <button onClick={onNext} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              interval={0}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={45}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value} ml`, "Frozen"]}
            />
            <Bar
              dataKey="ml"
              fill="#60a5fa"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
