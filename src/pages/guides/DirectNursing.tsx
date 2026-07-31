import { nursingRanges } from "@/lib/feeding-guide-data";

export function DirectNursing() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Direct Breastfeeding</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Volumes are unmeasurable during direct breastfeeding. Track feeds per
        day instead. Breastfeed before offering solids — milk is still the
        primary nutrition source.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-3 font-medium text-muted-foreground">Age</th>
              <th className="py-2 pr-3 font-medium text-muted-foreground">Feeds / Day</th>
              <th className="py-2 font-medium text-muted-foreground">Solids</th>
            </tr>
          </thead>
          <tbody>
            {nursingRanges.map((r) => (
              <tr key={r.label} className="border-b border-border/50 last:border-0">
                <td className="py-2 pr-3">{r.label}</td>
                <td className="py-2 pr-3 tabular-nums">
                  {r.feedsMin}–{r.feedsMax}
                </td>
                <td className="py-2 text-muted-foreground">
                  {r.solids ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        12–24 months: on demand (may be before bed or morning only).
        24–36 months: 1–3 feeds on demand.
      </p>
    </div>
  );
}
