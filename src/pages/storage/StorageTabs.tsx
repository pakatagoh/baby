type TabId = "all" | "frozen" | "used";

interface StorageTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  totalCount: number;
  frozenCount: number;
  usedCount: number;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "frozen", label: "Frozen" },
  { id: "used", label: "Used" },
];

export function StorageTabs({ activeTab, onTabChange, totalCount, frozenCount, usedCount }: StorageTabsProps) {
  const counts: Record<TabId, number> = {
    all: totalCount,
    frozen: frozenCount,
    used: usedCount,
  };

  return (
    <div className="flex gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-input bg-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label} ({counts[tab.id]})
        </button>
      ))}
    </div>
  );
}
