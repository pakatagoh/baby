interface TimelineBucket {
  label: string;
  color: string;
  bags: number;
  ml: number;
  maxBags: number;
}

interface ExpiryTimelineProps {
  buckets: TimelineBucket[];
}

const COLOR_CLASS: Record<string, string> = {
  red: "bg-[#b07a6a]",   // ≤1 week: pure peach
  orange: "bg-[#c09588]", // 1-2 weeks
  amber: "bg-[#d8bdb5]",  // 2-4 weeks
  green: "bg-[#ebdeda]",  // 1-3 months: pale peach
};

export function ExpiryTimeline({ buckets }: ExpiryTimelineProps) {
  if (buckets.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
        Expiry Timeline
      </h2>
      <div className="space-y-3">
        {buckets.map((b) => {
          const pct = b.maxBags > 0 ? (b.bags / b.maxBags) * 100 : 0;
          return (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{b.label}</span>
                <span className="text-xs text-muted-foreground">
                  {b.bags} bags · {b.ml}ml
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                    b.bags > 0 ? COLOR_CLASS[b.color] : ""
                  }`}
                  style={{ width: `${Math.max(pct, b.bags > 0 ? 5 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
