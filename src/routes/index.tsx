import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/pages/overview/OverviewPage";
import { getEntries } from "@/lib/entries-fn";
import { getBabyProfile } from "@/lib/baby-profile-fn";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery({
      queryKey: ["entries"],
      queryFn: () => getEntries(),
    });
    context.queryClient.prefetchQuery({
      queryKey: ["babyProfile"],
      queryFn: () => getBabyProfile(),
    });
  },
  component: OverviewPage,
});
