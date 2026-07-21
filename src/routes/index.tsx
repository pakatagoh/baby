import { createFileRoute } from "@tanstack/react-router";
import { OverviewPage } from "@/pages/OverviewPage";
import { getEntries } from "@/lib/entries-fn";

export const Route = createFileRoute("/")({
  // Prefetch the sheet rows during SSR (and on hover, via defaultPreload) so
  // the list is present on first paint with no loading flash.
  loader: ({ context }) =>
    context.queryClient.prefetchQuery({
      queryKey: ["entries"],
      queryFn: () => getEntries(),
    }),
  component: OverviewPage,
});
