import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { uploadMilk } from "@/lib/upload-fn";
import { Camera, Loader2 } from "lucide-react";

interface PendingEntry {
  id: string;
  previewUrl: string;
  status: "uploading" | "pending" | "analyzing" | "writing" | "done" | "error";
  jobId?: string;
  error?: string;
}

const STATUS_ICONS: Record<PendingEntry["status"], string> = {
  uploading: "⏳",
  pending: "⏳",
  analyzing: "🔍",
  writing: "📝",
  done: "✅",
  error: "❌",
};

const STATUS_LABELS: Record<PendingEntry["status"], string> = {
  uploading: "Uploading...",
  pending: "Queued...",
  analyzing: "Reading label...",
  writing: "Saving...",
  done: "Done",
  error: "Failed",
};

export function UploadPage() {
  const [entries, setEntries] = useState<PendingEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMilkFn = useServerFn(uploadMilk);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFile(file);
    e.target.value = "";
  }

  async function handleFile(file: File) {
    const optimisticId = crypto.randomUUID();
    const previewUrl = URL.createObjectURL(file);

    setEntries((prev) => [
      { id: optimisticId, previewUrl, status: "uploading" },
      ...prev,
    ]);
    setUploading(true);

    const form = new FormData();
    form.append("image", file);

    try {
      const { jobId } = await uploadMilkFn({ data: form });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === optimisticId ? { ...e, status: "pending", jobId } : e,
        ),
      );

      await pollJob(jobId, (status) => {
        setEntries((prev) =>
          prev.map((e) => (e.id === optimisticId ? { ...e, status } : e)),
        );
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setEntries((prev) =>
        prev.map((e) =>
          e.id === optimisticId ? { ...e, status: "error", error: msg } : e,
        ),
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="mb-6 text-center text-2xl font-bold">
        🍼 Baby Tracker
      </h1>

      <div className="mb-6 flex justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
        <Button
          size="lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
          {uploading ? "Uploading..." : "Snap Milk Packet"}
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          No milk packets recorded yet. Tap the button to snap a photo.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
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
                  {STATUS_ICONS[entry.status]} {STATUS_LABELS[entry.status]}
                </span>
                {entry.error && (
                  <p className="mt-1 text-xs text-red-600">{entry.error}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

async function pollJob(
  jobId: string,
  onStatus: (status: PendingEntry["status"]) => void,
  maxRetries = 30,
): Promise<void> {
  let retries = 0;
  while (retries < maxRetries) {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) throw new Error("Failed to check job status");
    const job = await res.json();

    switch (job.status) {
      case "done":
        onStatus("done");
        return;
      case "failed":
        onStatus("error");
        throw new Error(job.error || "Processing failed");
      case "processing":
        onStatus(retries < 5 ? "analyzing" : "writing");
        break;
      case "pending":
        onStatus("pending");
        break;
    }

    retries++;
    await new Promise((r) => setTimeout(r, 1000));
  }

  onStatus("error");
  throw new Error("Timed out waiting for analysis");
}
