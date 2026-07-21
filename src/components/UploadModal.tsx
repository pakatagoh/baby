import { useState, useEffect, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { uploadPackets } from "@/lib/upload-packets-fn";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type ModalState =
  | { phase: "hidden" }
  | { phase: "preview" }
  | { phase: "uploading" }
  | { phase: "success" }
  | { phase: "error"; message: string };

interface UploadModalProps {
  file: File | null;
  onClose: () => void;
}

export function UploadModal({ file, onClose }: UploadModalProps) {
  const queryClient = useQueryClient();
  const uploadPacketsFn = useServerFn(uploadPackets);

  const [state, setState] = useState<ModalState>({ phase: "hidden" });
  const [packetCount, setPacketCount] = useState("1");
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Stable close callback via ref to avoid timer recreation
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleClose = useCallback(() => {
    setState({ phase: "hidden" });
    setPreviewUrl("");
    onCloseRef.current();
  }, []);

  // When a new file arrives, transition to preview
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setPacketCount("1");
      setState({ phase: "preview" });
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  // Auto-close after success
  useEffect(() => {
    if (state.phase === "success") {
      const timer = setTimeout(() => {
        handleClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.phase, handleClose]);

  const handleSubmit = async () => {
    if (!file) return;
    const count = Number(packetCount);
    if (!Number.isInteger(count) || count < 1 || count > 50) return;

    setState({ phase: "uploading" });

    const form = new FormData();
    form.append("image", file);
    form.append("packetCount", String(count));

    try {
      await uploadPacketsFn({ data: form });
      setState({ phase: "success" });
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed";
      setState({ phase: "error", message });
    }
  };

  const handleRetry = () => {
    setState({ phase: "preview" });
  };

  const isOpen = state.phase !== "hidden";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent
        showCloseButton={state.phase === "preview" || state.phase === "error"}
        className="sm:max-w-md"
      >
        {/* ── Preview phase ─────────────────────────────────── */}
        {state.phase === "preview" && (
          <>
            <DialogHeader>
              <DialogTitle>New Milk Packet</DialogTitle>
            </DialogHeader>

            {/* Image preview */}
            {previewUrl && (
              <div className="overflow-hidden rounded-lg border">
                <img
                  src={previewUrl}
                  alt="Milk packet preview"
                  className="h-48 w-full object-cover"
                />
              </div>
            )}

            {/* Packet count input */}
            <div className="flex items-center gap-3">
              <label
                htmlFor="packetCount"
                className="shrink-0 text-sm font-medium"
              >
                Number of packets:
              </label>
              <Input
                id="packetCount"
                type="number"
                min={1}
                max={50}
                value={packetCount}
                onChange={(e) => setPacketCount(e.target.value)}
                className="w-20 text-center"
              />
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={
                !Number.isInteger(Number(packetCount)) ||
                Number(packetCount) < 1 ||
                Number(packetCount) > 50
              }
            >
              Submit
            </Button>
          </>
        )}

        {/* ── Uploading phase ──────────────────────────────── */}
        {state.phase === "uploading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Processing your milk packet{Number(packetCount) > 1 ? "s" : ""}...
            </p>
          </div>
        )}

        {/* ── Success phase ────────────────────────────────── */}
        {state.phase === "success" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="size-10 text-green-500" />
            <p className="text-sm font-medium">
              {Number(packetCount)}{" "}
              packet{Number(packetCount) !== 1 ? "s" : ""} saved!
            </p>
          </div>
        )}

        {/* ── Error phase ──────────────────────────────────── */}
        {state.phase === "error" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <AlertCircle className="size-10 text-destructive" />
            <p className="text-center text-sm text-destructive">
              {state.message}
            </p>
            <div className="flex w-full gap-3">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleRetry}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
