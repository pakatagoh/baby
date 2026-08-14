import { expirationGuide } from "@/lib/expiration-guide-data";
import { GuideTabs } from "@/pages/guides/GuideTabs";

export function ExpirationPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Breast Milk Expiration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Expressed breast milk storage times
        </p>
      </div>

      <GuideTabs active="expiration" />

      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 font-semibold">Stage</th>
              <th className="px-4 py-3 font-semibold">Storage</th>
              <th className="px-4 py-3 font-semibold">Use within</th>
            </tr>
          </thead>
          <tbody>
            {expirationGuide
              .filter((item) => !item.warning)
              .map((item) => (
                <tr key={`${item.stage}-${item.storage}`} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 align-top">{item.stage}</td>
                  <td className="px-4 py-3 align-top">{item.storage}</td>
                  <td className="px-4 py-3 align-top font-semibold">{item.interval}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-4 text-sm font-semibold text-destructive">
        {expirationGuide.find((item) => item.warning)?.warning}
      </div>
    </main>
  );
}
