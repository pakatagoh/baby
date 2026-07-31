const CHECKS = [
  {
    label: "Wet nappies",
    detail:
      "6+ wet nappies/day with clear/pale urine from day ~4 onward.",
  },
  {
    label: "Stool",
    detail:
      "At least 1/day in the first week. Frequency varies after — breastfed babies may go days between stools (that's normal).",
  },
  {
    label: "Weight gain",
    detail:
      "Tracked on growth chart at check-ups (8, 12, 16 weeks, then at 1 year).",
  },
  {
    label: "Content after feeds",
    detail: "Baby seems drowsy and satisfied after nursing or bottle.",
  },
];

export function AdequacyChecks() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Is Baby Getting Enough?</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Wet nappies and weight gain are the true indicators of adequate intake —
        not clock-watching or ounce-counting.
      </p>
      <dl className="mt-3 space-y-3">
        {CHECKS.map((check) => (
          <div key={check.label}>
            <dt className="text-sm font-medium">{check.label}</dt>
            <dd className="text-sm text-muted-foreground">{check.detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
