import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";

interface BatchActionBarProps {
  selectedCount: number;
  selectedAmountMl: number;
  onMarkUsed: () => void;
  busy: boolean;
}

export function BatchActionBar({ selectedCount, selectedAmountMl, onMarkUsed, busy }: BatchActionBarProps) {
  if (selectedCount === 0) return null;

  const target = typeof document === "undefined"
    ? null
    : document.getElementById("bottom-nav-batch-action-slot");
  if (!target) return null;

  const content = (
    <div className="border-t bg-white px-4 py-3.5 shadow-lg">
      <div className="mx-auto flex max-w-4xl items-center justify-between">
        <span className="text-sm font-medium">{selectedCount} selected · {selectedAmountMl} ml</span>
        <Button onClick={onMarkUsed} disabled={busy} variant="default" size="default" className="bg-primary text-primary-foreground hover:bg-primary/80">
          Mark as Used
        </Button>
      </div>
    </div>
  );

  return createPortal(content, target);
}
