import { Button } from "@/components/ui/button";

interface BatchActionBarProps {
  selectedCount: number;
  onMarkUsed: () => void;
  busy: boolean;
}

export function BatchActionBar({ selectedCount, onMarkUsed, busy }: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-40 border-t bg-white px-4 py-3.5 shadow-lg [@media(display-mode:standalone)]:bottom-24">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <Button onClick={onMarkUsed} disabled={busy} variant="default" size="default" className="bg-primary text-primary-foreground hover:bg-primary/80">
          Mark as Used
        </Button>
      </div>
    </div>
  );
}
