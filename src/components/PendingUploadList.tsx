import { Button } from "@/components/ui/button";
import type { MilkPacketResult } from "@/lib/ai";
import { RotateCcw } from "lucide-react";

export interface PendingEntry {
  id: string;
  previewUrl: string;
  status: "processing" | "done" | "error";
  result?: MilkPacketResult;
  error?: string;
}

const STATUS_ICON: Record<PendingEntry["status"], string> = {
  processing: "🔍",
  done: "✅",
  error: "❌",
};

const STATUS_LABEL: Record<PendingEntry["status"], string> = {
  processing: "Reading label...",
  done: "Done",
  error: "Failed",
};

interface PendingUploadListProps {
  pending: PendingEntry[];
  onRetry: (id: string) => void;
}

export function PendingUploadList({ pending, onRetry }: PendingUploadListProps) {
  if (pending.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      {pending.map((entry) => (
        <div
          key={entry.id}
          className={`flex items-center gap-3 rounded-lg border p-3 ${
            entry.status === "done"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : entry.status === "error"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "bg-card"
          }`}
        >
          <img
            src={entry.previewUrl}
            alt="Milk packet"
            className="h-16 w-16 rounded-md object-cover"
          />
          <div className="flex-1">
            <span className="text-sm font-medium">
              {STATUS_ICON[entry.status]} {STATUS_LABEL[entry.status]}
            </span>
            {entry.status === "done" && entry.result && (
              <p className="mt-1 text-xs text-muted-foreground">
                Saved {entry.result.amount_ml}ml · {entry.result.date}{" "}
                {entry.result.time}
              </p>
            )}
            {entry.error && (
              <p className="mt-1 text-xs text-red-600">{entry.error}</p>
            )}
            {entry.status === "error" && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => onRetry(entry.id)}
              >
                <RotateCcw /> Resubmit
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
