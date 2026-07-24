import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { MilkBottlePlaceholder } from "@/components/svg/MilkBottlePlaceholder";
import { updateEntry } from "@/lib/update-entry-fn";
import { deleteMilkEntry } from "@/lib/delete-entry-fn";
import { getExpiryDate } from "@/lib/expiry";
import type { MilkSheetEntry } from "@/lib/sheets";
import { ArrowLeft } from "lucide-react";

/** Props initialised from SSR — no useEffect flash. */
export function StorageDetailPage({ entry }: { entry: MilkSheetEntry }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateEntry);
  const deleteFn = useServerFn(deleteMilkEntry);

  const [date, setDate] = useState(entry.date);
  const [time, setTime] = useState(entry.time);
  const [amount, setAmount] = useState(String(entry.amount));
  const [used, setUsed] = useState(entry.used);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
          totalUsed: used ? entry.packets : 0,
          entryId: entry.id,
        },
      });
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      navigate({ to: "/storage" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry.rowIndex) return;
    setDeleting(true);
    try {
      await deleteFn({
        data: {
          rowIndex: entry.rowIndex,
          imageUrl: entry.imageUrl || undefined,
        },
      });
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      navigate({ to: "/storage" });
    } finally {
      setDeleting(false);
    }
  };

  const expiryDate = getExpiryDate(entry);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/storage" })}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Back to storage"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-lg font-semibold">Entry Details</h1>
      </div>

      {/* Image */}
      <div className="mb-4 overflow-hidden rounded-xl bg-black">
        {entry.imageUrl ? (
          <img
            src={entry.imageUrl}
            alt={`Milk packet ${entry.date}`}
            className="mx-auto h-64 w-full object-contain"
          />
        ) : (
          <div className="flex h-48 items-center justify-center">
            <MilkBottlePlaceholder size="lg" />
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3">
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
        <div className="flex items-center gap-2">
          <Checkbox
            id="used-check"
            checked={used}
            onCheckedChange={(c) => setUsed(!!c)}
            className="size-5"
          />
          <label htmlFor="used-check" className="text-sm">
            Mark as Used
          </label>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80"
        >
          {saving ? "Saving…" : "Save"}
        </Button>

        {/* Delete */}
        <div className="border-t pt-3">
          {confirmDelete ? (
            <div className="flex gap-2">
              <Button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-600 text-white hover:bg-red-700"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setConfirmDelete(true)}
              variant="ghost"
              className="w-full text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              Delete Entry
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
