import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TotalFrozenData {
  date: string;
  totalMl: number;
}

interface TotalFrozenOverTimeChartProps {
  title: string;
  data: TotalFrozenData[];
  onPrev: () => void;
  onNext: () => void;
}

export function TotalFrozenOverTimeChart({ title, data, onPrev, onNext }: TotalFrozenOverTimeChartProps) {
  return (
    <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-border/50">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onPrev} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
        </button>
        <p className="text-center text-sm font-medium">{title}</p>
        <button onClick={onNext} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              axisLine={false}
              tickLine={false}
              width={45}
              label={{
                value: "ml",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: "#9ca3af", fontSize: 10 },
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value} ml`, "Remaining Frozen"]}
            />
            <Line
              type="monotone"
              dataKey="totalMl"
              name="Remaining Frozen"
              stroke="#6f9fc5"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#6f9fc5", strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
