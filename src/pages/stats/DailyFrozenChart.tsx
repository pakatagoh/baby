import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

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
  data: DailyData[];
}

export function DailyFrozenChart({ data }: DailyFrozenChartProps) {
  return (
    <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-border/50">
      <p className="mb-3 text-sm font-medium">Daily Frozen (ml)</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 4 }}>
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
              width={40}
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
              fill="#34d399"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
