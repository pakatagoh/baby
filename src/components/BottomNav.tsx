import { Home, Package, Plus, BarChart3, Settings } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  cta?: boolean;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", icon: <Home className="size-5" /> },
  { id: "storage", label: "Storage", icon: <Package className="size-5" /> },
  { id: "add", label: "Add", icon: <Plus className="size-6" />, cta: true },
  { id: "stats", label: "Stats", icon: <BarChart3 className="size-5" /> },
  { id: "settings", label: "Settings", icon: <Settings className="size-5" /> },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80
                 backdrop-blur-lg pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-around px-2">
        {navItems.map((item) =>
          item.cta ? (
            <button
              key={item.id}
              type="button"
              className="relative -mt-6 flex size-14 items-center justify-center rounded-full
                         bg-primary text-primary-foreground shadow-lg transition-transform
                         active:scale-95"
              aria-label={item.label}
            >
              {item.icon}
            </button>
          ) : (
            <button
              key={item.id}
              type="button"
              className="flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5
                         py-1 text-muted-foreground transition-colors"
              aria-label={item.label}
            >
              {item.icon}
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          ),
        )}
      </div>
    </nav>
  );
}
