import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { updateEntry } from "@/lib/update-entry-fn";
import { getExpiryDate } from "@/lib/expiry";
import type { MilkSheetEntry } from "@/lib/sheets";
import { X } from "lucide-react";

interface EntryDetailModalProps {
  entry: MilkSheetEntry | null;
  open: boolean;
  onClose: () => void;
}

export function EntryDetailModal({ entry, open, onClose }: EntryDetailModalProps) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateEntry);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [amount, setAmount] = useState("");
  const [used, setUsed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset form whenever a new entry is opened
  useEffect(() => {
    if (entry && open) {
      setDate(entry.date);
      setTime(entry.time);
      setAmount(String(entry.amount));
      setUsed(entry.used);
    }
  }, [entry?.id, open]);

  if (!entry) return null;

  const handleSave = async () => {
    if (!entry.rowIndex) return;
    setSaving(true);
    try {
      await updateFn({
        data: {
          rowIndex: entry.rowIndex,
          date,
          time,
          amount: Number(amount) || 0,
          used,
          usedAt: used ? (entry.usedAt || new Date().toISOString()) : "",
        },
      });
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const expiryDate = getExpiryDate(entry);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-lg" showCloseButton={false}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 flex size-7 items-center justify-center rounded-full bg-black/30 text-white"
        >
          <X className="size-4" />
        </button>

        {/* Image */}
        <div className="bg-black">
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl}
              alt={`Milk packet ${entry.date}`}
              className="mx-auto h-64 w-full object-contain"
            />
          ) : (
            <div className="flex h-48 items-center justify-center">
              <svg width="48" height="64" viewBox="0 0 24 32" fill="none">
                <rect x="4" y="10" width="16" height="22" rx="3" fill="#d4c5b9" stroke="#b0a090" strokeWidth="1" />
                <rect x="8" y="12" width="8" height="16" rx="2" fill="#f0e8e0" />
                <line x1="8" y1="16" x2="16" y2="16" stroke="#b0a090" strokeWidth="0.5" />
                <line x1="8" y1="20" x2="16" y2="20" stroke="#b0a090" strokeWidth="0.5" />
                <line x1="8" y1="24" x2="13" y2="24" stroke="#b0a090" strokeWidth="0.5" />
                <rect x="9" y="6" width="6" height="5" rx="1" fill="#d4c5b9" stroke="#b0a090" strokeWidth="1" />
              </svg>
            </div>
          )}
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <label className="w-16 shrink-0 text-sm text-muted-foreground">Date</label>
            <Input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="flex-1"
              placeholder="DD-Mon-YY"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 shrink-0 text-sm text-muted-foreground">Time</label>
            <Input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1"
              placeholder="HH:MM"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 shrink-0 text-sm text-muted-foreground">Amount</label>
            <Input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1"
              placeholder="ml"
            />
            <span className="text-sm text-muted-foreground">ml</span>
          </div>

          {expiryDate && (
            <p className="text-xs text-muted-foreground">
              Expires: {expiryDate}
            </p>
          )}

          {/* Mark as Used */}
          {entry.used ? (
            <p className="text-sm text-muted-foreground">
              Used on {entry.usedAt ? new Date(entry.usedAt).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" }) : "—"}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <Checkbox
                id={`used-${entry.id}`}
                checked={used}
                onCheckedChange={(c) => setUsed(!!c)}
                className="size-5"
              />
              <label htmlFor={`used-${entry.id}`} className="text-sm">Mark as Used</label>
            </div>
          )}
        </div>

        {/* Save */}
        <div className="border-t px-4 py-3">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-[#3d3833] text-white hover:bg-[#2d2925]"
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
