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

interface DailyData {
  day: string;
  label: string;
  ml: number;
}

interface CustomTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
}

function CustomTick({ x = 0, y = 0, payload }: CustomTickProps) {
  if (!payload?.value) return null;
  const parts = payload.value.split(" ");
  return (
    <g transform={`translate(${x},${y + 6})`}>
      <text x={0} y={0} textAnchor="middle" fill="#9ca3af" fontSize={11}>
        {parts[0]}
      </text>
      <text x={0} y={14} textAnchor="middle" fill="#9ca3af" fontSize={10}>
        {parts.slice(1).join(" ")}
      </text>
    </g>
  );
}

interface DailyFrozenChartProps {
  title: string;
  data: DailyData[];
  onPrev: () => void;
  onNext: () => void;
  metricLabel?: "Frozen" | "Used";
}

export function DailyFrozenChart({ title, data, onPrev, onNext, metricLabel = "Frozen" }: DailyFrozenChartProps) {
  const barColor = metricLabel === "Frozen" ? "#6f9fc5" : "#c97886";

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
              dataKey="label"
              tick={<CustomTick />}
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
              formatter={(value: number) => [`${value} ml`, metricLabel]}
            />
            <Bar
              dataKey="ml"
              fill={barColor}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
