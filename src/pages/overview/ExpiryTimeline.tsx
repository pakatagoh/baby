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

/** Map bucket color name to the matching CSS expiry variable */
const COLOR_VAR: Record<string, string> = {
  red: "var(--expiry-red)",
  orange: "var(--expiry-orange)",
  yellow: "var(--expiry-yellow)",
  green: "var(--expiry-green)",
};

export function ExpiryTimeline({ buckets }: ExpiryTimelineProps) {
  if (buckets.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold">
        Expiry Timeline
      </h2>
      <div className="space-y-3">
        {buckets.map((b) => {
          const pct = b.maxBags > 0 ? (b.bags / b.maxBags) * 100 : 0;
          return (
            <div key={b.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs">{b.label}</span>
                <span className="text-xs">
                  {b.bags} bags · {b.ml}ml
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${Math.max(pct, b.bags > 0 ? 5 : 0)}%`,
                    backgroundColor: `hsl(${COLOR_VAR[b.color] ?? "var(--expiry-green)"})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
