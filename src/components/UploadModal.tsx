import { useState, useEffect, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { uploadPackets } from "@/lib/upload-packets-fn";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStoredDeviceProfile } from "@/lib/device-profile";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

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
    const deviceProfile = getStoredDeviceProfile();
    if (deviceProfile) form.append("deviceId", deviceProfile.deviceId);

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
  const showClose = state.phase === "preview" || state.phase === "error";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && state.phase !== "uploading") handleClose(); }}>
      <DialogContent
        className="max-w-sm gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-lg"
        showCloseButton={false}
      >
        {showClose && (
          <DialogClose className="absolute top-3 right-3 z-10 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50 focus:ring-0 focus:outline-none">
            <X className="size-4" />
          </DialogClose>
        )}

        {/* ── Preview phase ─────────────────────────────────── */}
        {state.phase === "preview" && (
          <>
            {/* Image preview */}
            {previewUrl && (
              <div className="flex items-center justify-center bg-black">
                <img
                  src={previewUrl}
                  alt="Milk packet preview"
                  className="max-h-[50vh] w-full object-contain"
                />
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="flex flex-col gap-3 px-4 py-4"
            >
              <DialogTitle>New Milk Packet</DialogTitle>

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
                type="submit"
                disabled={
                  !Number.isInteger(Number(packetCount)) ||
                  Number(packetCount) < 1 ||
                  Number(packetCount) > 50
                }
                className="w-full bg-primary text-primary-foreground hover:bg-primary/80"
              >
                Submit
              </Button>
            </form>
          </>
        )}

        {/* ── Uploading phase ──────────────────────────────── */}
        {state.phase === "uploading" && (
          <div className="flex flex-col items-center gap-4 px-4 py-12">
            <Loader2 className="size-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Processing your milk packet
              {Number(packetCount) > 1 ? "s" : ""}...
            </p>
          </div>
        )}

        {/* ── Success phase ────────────────────────────────── */}
        {state.phase === "success" && (
          <div className="flex flex-col items-center gap-4 px-4 py-12">
            <CheckCircle2 className="size-10 text-green-500" />
            <p className="text-sm font-medium">
              {Number(packetCount)}{" "}
              packet{Number(packetCount) !== 1 ? "s" : ""} saved!
            </p>
          </div>
        )}

        {/* ── Error phase ──────────────────────────────────── */}
        {state.phase === "error" && (
          <div className="flex flex-col items-center gap-4 px-4 py-8">
            <AlertCircle className="size-10 text-destructive" />
            <p className="text-center text-sm text-destructive">
              {state.message}
            </p>
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/80"
                onClick={handleRetry}
              >
                Retry
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
