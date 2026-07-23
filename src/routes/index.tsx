import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/pages/overview/OverviewPage";
import { getEntries } from "@/lib/entries-fn";
import { getBabyProfile } from "@/lib/baby-profile-fn";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    const entriesPromise = context.queryClient.prefetchQuery({
      queryKey: ["entries"],
      queryFn: () => getEntries(),
    });
    // Non-critical — don't crash the page if the Sheets metadata/weight
    // tabs are unavailable during SSR. The client will retry.
    const profilePromise = context.queryClient.prefetchQuery({
      queryKey: ["babyProfile"],
      queryFn: () => getBabyProfile(),
    }).catch(() => {});
    return Promise.all([entriesPromise, profilePromise]);
  },
  component: OverviewPage,
});
