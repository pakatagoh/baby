import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ArrowUpDown, Bell } from "lucide-react";
import { getBabyProfile } from "@/lib/baby-profile-fn";
import { fetchSortOption } from "@/lib/app-settings-fn";

export const Route = createFileRoute("/settings/")({
  loader: ({ context }) => {
    const profile = context.queryClient.prefetchQuery({
      queryKey: ["babyProfile"],
      queryFn: () => getBabyProfile(),
    }).catch(() => {});
    const sort = context.queryClient.prefetchQuery({
      queryKey: ["appSetting", "sort"],
      queryFn: () => fetchSortOption(),
    }).catch(() => {});
    return Promise.all([profile, sort]);
  },
  component: SettingsMenu,
});

function SettingsMenu() {
  const { data: profile } = useQuery({
    queryKey: ["babyProfile"],
    queryFn: () => getBabyProfile(),
  });

  return (
    <div className="space-y-1">
      <Link
        to="/settings/baby"
        className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
          {profile?.imageUrl ? (
            <img
              src={profile.imageUrl}
              alt="Baby"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-lg">👶</span>
          )}
        </div>
        <span className="flex-1 text-sm font-medium">Baby Profile</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <Link
        to="/settings/sort"
        className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ArrowUpDown className="size-4" />
        </div>
        <span className="flex-1 text-sm font-medium">Default Sort Order</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>

      <Link
        to="/settings/notifications"
        className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bell className="size-4" />
        </div>
        <span className="flex-1 text-sm font-medium">Notification Settings</span>
        <ChevronRight className="size-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
