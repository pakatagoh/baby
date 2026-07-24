import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getEntries } from "@/lib/entries-fn";
import { StorageDetailPage } from "@/pages/storage/StorageDetailPage";

export const Route = createFileRoute("/storage-detail/$id")({
  loader: ({ context }) =>
    context.queryClient.prefetchQuery({
      queryKey: ["entries"],
      queryFn: () => getEntries(),
    }),
  component: StorageDetailRoute,
});

function StorageDetailRoute() {
  const { id } = Route.useParams();
  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: () => getEntries(),
  });

  const entry = entries.find((e) => e.id === id);
  if (!entry) return <p className="p-8 text-center text-muted-foreground">Entry not found.</p>;
  return <StorageDetailPage entry={entry} />;
}
