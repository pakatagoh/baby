interface Cue {
  stage: string;
  cues: string[];
}

const HUNGER_CUES: Cue[] = [
  {
    stage: "Early — feed now",
    cues: ["Licking lips", "Sticking tongue out"],
  },
  {
    stage: "Mid — baby is ready",
    cues: [
      "Rooting (turning head, opening mouth)",
      "Putting hand to mouth",
      "Fussiness",
      "Sucking on everything",
    ],
  },
  {
    stage: "Late — soothe first",
    cues: ["Crying"],
  },
];

export function HungerCues() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Hunger Cues</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Feed before baby cries — crying is a late hunger sign and makes latching
        harder.
      </p>
      <div className="mt-3 space-y-3">
        {HUNGER_CUES.map((cue) => (
          <div key={cue.stage}>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {cue.stage}
            </h3>
            <ul className="mt-1 space-y-0.5">
              {cue.cues.map((c) => (
                <li
                  key={c}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span className="mt-1 shrink-0 size-1.5 rounded-full bg-primary/50" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
