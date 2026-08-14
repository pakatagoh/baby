import { createFileRoute } from "@tanstack/react-router";
import { GuidesPage } from "@/pages/guides/GuidesPage";
import { getFeedingGuide } from "@/lib/feeding-guide-fn";

export const Route = createFileRoute("/guides/feed")({
  loader: ({ context }) =>
    context.queryClient
      .prefetchQuery({
        queryKey: ["feedingGuide"],
        queryFn: () => getFeedingGuide(),
      })
      .catch(() => {}),
  component: GuidesPage,
});
