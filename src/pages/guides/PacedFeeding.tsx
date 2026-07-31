export function PacedFeeding() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="text-sm font-semibold">Paced Bottle Feeding</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        When feeding expressed milk via bottle, use the lowest-flow nipple and
        pace the feed. Caregivers often overfeed because bottles flow faster
        than the breast.
      </p>
      <ol className="mt-3 space-y-2 text-sm text-muted-foreground list-decimal pl-5">
        <li>Hold baby upright — not lying flat.</li>
        <li>Keep the bottle horizontal — just enough milk in the nipple.</li>
        <li>Pause every 20–30 seconds — tip the bottle down to slow flow.</li>
        <li>Let baby control the flow — they'll stop when full.</li>
      </ol>
      <p className="mt-3 text-xs text-muted-foreground italic">
        AAP: breastfed infants top out at roughly{" "}
        <strong className="not-italic">135 ml per feed</strong> even at 1 year —
        far less than formula-fed babies who reach 180–240 ml.
      </p>
    </div>
  );
}
