import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MilkPacketResult } from "@/lib/ai";
import { Loader2, CheckCircle2, AlertCircle, RotateCcw, X } from "lucide-react";

export interface PendingEntry {
  id: string;
  previewUrl: string;
  srcSetThumb?: string;
  status: "processing" | "done" | "error";
  result?: MilkPacketResult;
  error?: string;
}

interface PendingUploadListProps {
  pending: PendingEntry[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
}

function Thumbnail({
  previewUrl,
  srcSetThumb,
  status,
}: {
  previewUrl: string;
  srcSetThumb?: string;
  status: PendingEntry["status"];
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = previewUrl && !imgFailed;

  return (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
      {showImg && (
        <img
          src={previewUrl}
          srcSet={srcSetThumb}
          sizes="64px"
          alt="Milk packet"
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      )}
      {!showImg && status === "processing" && (
        <Loader2 className="absolute inset-0 m-auto size-5 animate-spin text-muted-foreground" />
      )}
      {!showImg && status === "error" && (
        <AlertCircle className="absolute inset-0 m-auto size-5 text-destructive/50" />
      )}
    </div>
  );
}

export function PendingUploadList({ pending, onRetry, onDismiss }: PendingUploadListProps) {
  if (pending.length === 0) return null;

  return (
    <div className="mb-6 flex flex-col gap-3">
      {pending.map((entry) => (
        <div
          key={entry.id}
          className={`relative flex items-center gap-3 rounded-lg border p-3 ${
            entry.status === "done"
              ? "border-primary/30 bg-card"
              : entry.status === "error"
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-card"
          }`}
        >
          <Thumbnail previewUrl={entry.previewUrl} srcSetThumb={entry.srcSetThumb} status={entry.status} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {entry.status === "processing" && (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
              )}
              {entry.status === "done" && (
                <CheckCircle2 className="size-3.5 shrink-0 text-primary" />
              )}
              {entry.status === "error" && (
                <AlertCircle className="size-3.5 shrink-0 text-destructive" />
              )}
              <span className="truncate text-sm font-medium">
                {entry.status === "processing" && "Reading label…"}
                {entry.status === "done" && "Saved"}
                {entry.status === "error" && "Failed"}
              </span>
            </div>
            {entry.status === "done" && entry.result && (
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {entry.result.amount_ml}ml · {entry.result.frozenAt}
              </p>
            )}
            {entry.error && (
              <p className="mt-1 truncate text-xs text-destructive">
                {entry.error}
              </p>
            )}
            {entry.status === "error" && (
              <Button
                size="xs"
                variant="outline"
                className="mt-2"
                onClick={() => onRetry(entry.id)}
              >
                <RotateCcw /> Retry
              </Button>
            )}
          </div>
          {(entry.status === "done" || entry.status === "error") && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 size-7"
              onClick={() => onDismiss(entry.id)}
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
