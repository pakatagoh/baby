import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createManualEntry } from "@/lib/manual-entry-fn";
import {
  currentSgtISO,
  frozenDateInput,
  frozenTimeInput,
  toFrozenAt,
} from "@/lib/frozen-date";

type Phase = "form" | "saving" | "success";

interface ManualEntryModalProps {
  onClose: () => void;
}

export function ManualEntryModal({ onClose }: ManualEntryModalProps) {
  const createEntry = useServerFn(createManualEntry);
  const queryClient = useQueryClient();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const initialFrozenAt = currentSgtISO();
  const [date, setDate] = useState(() =>
    frozenDateInput({ frozenAt: initialFrozenAt }),
  );
  const [time, setTime] = useState(() =>
    frozenTimeInput({ frozenAt: initialFrozenAt }),
  );
  const [amount, setAmount] = useState("");
  const [packetCount, setPacketCount] = useState("1");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState("");

  useEffect(() => {
    if (phase !== "success") return;
    const timer = window.setTimeout(onClose, 1_500);
    return () => window.clearTimeout(timer);
  }, [onClose, phase]);

  const submit = async () => {
    const parsedAmount = Number(amount);
    const parsedCount = Number(packetCount);
    if (
      !Number.isInteger(parsedAmount) ||
      parsedAmount < 1 ||
      parsedAmount > 1000
    ) {
      setError("Enter an amount between 1 and 1,000 ml.");
      return;
    }
    if (!Number.isInteger(parsedCount) || parsedCount < 1 || parsedCount > 50) {
      setError("Enter between 1 and 50 packets.");
      return;
    }

    try {
      setError("");
      setPhase("saving");
      const form = new FormData();
      form.set("frozenAt", toFrozenAt(date, time));
      form.set("amount", String(parsedAmount));
      form.set("packetCount", String(parsedCount));
      form.set("notes", notes.trim());
      if (photo) form.set("image", photo);

      await createEntry({ data: form });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
      ]);
      setPhase("success");
    } catch (cause) {
      setPhase("form");
      setError(
        cause instanceof Error ? cause.message : "Could not save this entry.",
      );
    }
  };

  const isSaving = phase === "saving";
  const isSuccess = phase === "success";

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSaving) onClose();
      }}
    >
      <DialogContent className="max-w-sm gap-0 rounded-2xl border-0 bg-white p-0 shadow-lg">
        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 px-4 py-12">
            <CheckCircle2 className="size-10 text-green-500" />
            <p className="text-sm font-medium">
              {packetCount} packet{Number(packetCount) === 1 ? "" : "s"} saved!
            </p>
          </div>
        ) : (
          <form
            className="flex flex-col gap-4 px-4 py-5"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <DialogTitle>Add milk manually</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Enter the details for each packet. A photo is optional.
            </p>

            <div className="flex flex-col gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <label
                  htmlFor="manual-frozen-date"
                  className="w-16 shrink-0 text-sm text-muted-foreground"
                >
                  Date
                </label>
                <Input
                  id="manual-frozen-date"
                  type="date"
                  className="flex-1"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
              <div className="flex min-w-0 items-center gap-2">
                <label
                  htmlFor="manual-frozen-time"
                  className="w-16 shrink-0 text-sm text-muted-foreground"
                >
                  Time
                </label>
                <Input
                  id="manual-frozen-time"
                  type="time"
                  className="flex-1"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-sm font-medium">
                  Amount per packet (ml)
                </span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-medium">Packets</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={50}
                  value={packetCount}
                  onChange={(event) => setPacketCount(event.target.value)}
                  disabled={isSaving}
                  required
                />
              </label>
            </div>

            <div className="space-y-1.5">
              <span className="text-sm font-medium">
                Photo{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
              />
              {photo ? (
                <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{photo.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    disabled={isSaving}
                    onClick={() => {
                      setPhoto(null);
                      if (photoInputRef.current)
                        photoInputRef.current.value = "";
                    }}
                    aria-label="Remove selected photo"
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2"
                  disabled={isSaving}
                  onClick={() => photoInputRef.current?.click()}
                >
                  <ImagePlus className="size-4 text-primary" />
                  Add a photo
                </Button>
              )}
            </div>

            <label className="space-y-1.5">
              <span className="text-sm font-medium">
                Notes{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                disabled={isSaving}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              />
            </label>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button
              type="submit"
              disabled={isSaving}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/80"
            >
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Save entry"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
