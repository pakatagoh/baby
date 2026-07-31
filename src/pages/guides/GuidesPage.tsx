import { useQuery } from "@tanstack/react-query";
import { getFeedingGuide } from "@/lib/feeding-guide-fn";
import { FeedingOverview } from "@/pages/guides/FeedingOverview";
import { DailyIntakeChart } from "@/pages/guides/DailyIntakeChart";
import { PacedFeeding } from "@/pages/guides/PacedFeeding";
import { DirectNursing } from "@/pages/guides/DirectNursing";
import { KeyRules } from "@/pages/guides/KeyRules";
import { HungerCues } from "@/pages/guides/HungerCues";
import { AdequacyChecks } from "@/pages/guides/AdequacyChecks";

export function GuidesPage() {
  const { data: guide } = useQuery({
    queryKey: ["feedingGuide"],
    queryFn: () => getFeedingGuide(),
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
      {/* ── Header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Feeding Guide</h1>
        {guide?.ageLabel && (
          <p className="mt-1 text-sm text-muted-foreground">
            {guide.firstName ?? "Baby"} is {guide.ageLabel} old
          </p>
        )}
      </div>

      {!guide?.current && !guide?.ageDays ? (
        /* No DOB set — prompt user to set it */
        <div className="rounded-xl border bg-card p-6 text-center">
          <p className="text-muted-foreground">
            Set your baby's date of birth in{" "}
            <a href="/settings/baby" className="text-primary underline">
              Settings → Baby Profile
            </a>{" "}
            to see age-specific recommendations.
          </p>
        </div>
      ) : (
        /* Age-specific + static content */
        <div className="space-y-6">
          {guide?.current && (
            <>
              <FeedingOverview current={guide.current} next={guide.next} />
              <DailyIntakeChart currentRange={guide.current} />
            </>
          )}

          <PacedFeeding />
          <DirectNursing />
          <KeyRules />
          <HungerCues />
          <AdequacyChecks />

          {/* Source attribution */}
          <p className="text-center text-xs text-muted-foreground">
            Sources: CDC, AAP / HealthyChildren.org, Stanford Children's Health,
            NHS, KellyMom (research-backed).
          </p>
        </div>
      )}
    </main>
  );
}
