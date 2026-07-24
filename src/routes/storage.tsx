import { Outlet, createFileRoute } from "@tanstack/react-router";
import { getEntries } from "@/lib/entries-fn";
import { fetchSortOption } from "@/lib/app-settings-fn";

export const Route = createFileRoute("/storage")({
  loader: ({ context }) => {
    const entries = context.queryClient.prefetchQuery({
      queryKey: ["entries"],
      queryFn: () => getEntries(),
    });
    const sort = context.queryClient.prefetchQuery({
      queryKey: ["appSetting", "sort"],
      queryFn: () => fetchSortOption(),
    }).catch(() => {});
    return Promise.all([entries, sort]);
  },
  component: () => <Outlet />,
});
