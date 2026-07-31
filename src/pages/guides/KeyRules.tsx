const RULES = [
  "Vitamin D: 400 IU/day from birth (breast milk is low in vitamin D).",
  "Store expressed milk: 4 hrs room temp, 4 days fridge, 6 months freezer.",
  "Thawed milk: use within 2 hrs room temp, 24 hrs fridge — never refreeze.",
  "No honey before 12 months (botulism risk).",
  "No solids before 4 months (AAP recommends ~6 months).",
  "Feed on demand — hunger cues over clock.",
];

export function KeyRules() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Key Rules</h2>
      <ul className="mt-2 space-y-1.5">
        {RULES.map((rule) => (
          <li
            key={rule}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="mt-0.5 shrink-0 text-primary">•</span>
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}
