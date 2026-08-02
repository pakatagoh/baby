import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { feedingRanges, type FeedingRange } from "@/lib/feeding-guide-data";

interface Props {
  currentRange: FeedingRange | null;
}

export function DailyIntakeChart({ currentRange }: Props) {
  const data = feedingRanges.map((r) => ({
    age: r.label,
    ml: r.dailyTotal,
    isCurrent: currentRange?.label === r.label,
  }));

  return (
    <div className="rounded-xl border bg-card p-4">
      <h2 className="mb-1 text-sm font-semibold">
        Daily Milk Intake by Age
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Expressed breastmilk — approximate daily total. Highlighted bar = your
        baby's current range.
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          margin={{ top: 24, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="#f0f0f0"
          />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={40}
            domain={[0, "dataMax"]}
            tickCount={5}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              fontSize: 12,
            }}
            formatter={(value: number) => [`${value} ml`, "Daily total"]}
          />
          <Bar dataKey="ml" radius={[3, 3, 0, 0]} maxBarSize={36}>
            {data.map((point, i) => (
              <Cell
                key={i}
                fill={
                  point.isCurrent
                    ? "hsl(var(--primary))"
                    : "hsl(var(--primary) / 0.25)"
                }
              />
            ))}
          </Bar>
          {currentRange && (
            <ReferenceLine
              x={currentRange.label}
              stroke="hsl(var(--primary))"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: "You are here",
                position: "top",
                fontSize: 10,
                fill: "hsl(var(--primary))",
                fontWeight: 600,
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
