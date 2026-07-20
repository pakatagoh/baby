import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { updateEntry } from "@/lib/update-entry-fn";
import { getExpiryDate } from "@/lib/expiry";
import { generateImgproxySrcSet, parseStoredPathFromUrl } from "@/lib/images";
import type { MilkSheetEntry } from "@/lib/sheets";

interface EntryCardProps {
  entry: MilkSheetEntry;
}

// Convert "DD-Mon-YY" → "YYYY-MM-DD" for native date input
function toDateInput(sheetDate: string): string {
  const m = sheetDate.match(/^(\d{1,2})-(\w{3})-(\d{2})$/);
  if (!m) return "";
  const months: Record<string, string> = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };
  const mm = months[m[2]];
  if (!mm) return "";
  return `20${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

// Convert "YYYY-MM-DD" → "DD-Mon-YY"
function toSheetDate(dateInput: string): string {
  const d = new Date(dateInput + "T00:00:00");
  if (isNaN(d.getTime())) return dateInput;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const dd = String(d.getDate()).padStart(2, "0");
  const mon = months[d.getMonth()];
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}-${mon}-${yy}`;
}

export function EntryCard({ entry }: EntryCardProps) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateEntry);
  const [open, setOpen] = useState(false);

  // Edit form state — initialised when modal opens
  const [date, setDate] = useState(toDateInput(entry.date));
  const [time, setTime] = useState(entry.time);
  const [amount, setAmount] = useState(String(entry.amount));
  const [packets, setPackets] = useState(String(entry.packets));
  const [totalUsed, setTotalUsed] = useState(String(entry.totalUsed));
  const [notes, setNotes] = useState(entry.notes || "");
  const [saving, setSaving] = useState(false);

  // Pre-compute responsive image srcsets from the stored imgproxy URL.
  const imageSrcSets = useMemo(() => {
    if (!entry.imageUrl) return null;
    const storedPath = parseStoredPathFromUrl(entry.imageUrl);
    if (!storedPath) return null;
    return {
      thumb: generateImgproxySrcSet(storedPath, [64, 128, 256]),
      lightbox: generateImgproxySrcSet(storedPath, [384, 768, 1152]),
    };
  }, [entry.imageUrl]);

  function openModal() {
    setDate(toDateInput(entry.date));
    setTime(entry.time);
    setAmount(String(entry.amount));
    setPackets(String(entry.packets));
    setTotalUsed(String(entry.totalUsed));
    setNotes(entry.notes || "");
    setOpen(true);
  }

  async function save() {
    if (!entry.rowIndex) return;
    setSaving(true);
    try {
      await updateFn({
        data: {
          rowIndex: entry.rowIndex,
          date: toSheetDate(date),
          time,
          amount: Number(amount),
          packets: Number(packets),
          totalUsed: Number(totalUsed),
          notes,
        },
      });
      void queryClient.invalidateQueries({ queryKey: ["entries"] });
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* ── Card in the list ──────────────────────────────────── */}
      <div
        role="button"
        tabIndex={0}
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50"
        onClick={openModal}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openModal();
          }
        }}
      >
        {entry.imageUrl ? (
          <img
            src={entry.imageUrl}
            srcSet={imageSrcSets?.thumb}
            sizes="64px"
            alt={`Milk packet ${entry.date} ${entry.time}`}
            className="h-16 w-16 shrink-0 rounded-md bg-muted object-cover"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : (
          <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-base font-medium">
            {entry.date} {entry.time}
          </p>
          <p className="text-xs text-muted-foreground">
            Expires {getExpiryDate(entry) ?? "—"}
          </p>
          <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
            <span>{entry.amount}ml</span>
            <span>{entry.packets} total pkt</span>
            <span title="Frozen">❄️ {entry.totalFrozen} frozen</span>
            <span title="Used">🍼 {entry.totalUsed} used</span>
          </div>
          {entry.notes && (
            <p className="mt-1 text-pretty text-sm italic text-muted-foreground">{entry.notes}</p>
          )}
        </div>
      </div>

      {/* ── Lightbox modal ────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden rounded-2xl border-0 bg-white p-0 shadow-lg" showCloseButton={false}>
          <DialogClose className="absolute top-3 right-3 z-10 rounded-full bg-black/30 p-1.5 text-white hover:bg-black/50 focus:ring-0 focus:outline-none">
            <X className="size-4" />
          </DialogClose>
          <DialogTitle className="sr-only">
            {entry.date} {entry.time} — {entry.amount}ml
          </DialogTitle>

          {/* Image */}
          <div className="flex items-center justify-center bg-black">
            {entry.imageUrl ? (
              <img
                src={entry.imageUrl}
                srcSet={imageSrcSets?.lightbox}
                sizes="384px"
                alt={`Milk packet ${entry.date} ${entry.time}`}
                className="max-h-[50vh] w-full object-contain"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center text-sm text-gray-400">
                No image
              </div>
            )}
          </div>

          {/* Edit form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="flex flex-col gap-3 px-4 py-4 min-w-0"
          >
            <div className="flex flex-col gap-2">
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 w-auto max-w-full rounded-md border border-input bg-transparent px-1.5 text-sm"
                />
              </label>
              <label className="min-w-0">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Time</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-8 w-auto max-w-full rounded-md border border-input bg-transparent px-1.5 text-sm"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <label className="flex-1">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Amount (ml)
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  min={1}
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  Total packets
                </span>
                <input
                  type="number"
                  value={packets}
                  onChange={(e) => setPackets(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  min={1}
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Used</span>
                <input
                  type="number"
                  value={totalUsed}
                  onChange={(e) => setTotalUsed(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                  min={0}
                />
              </label>
            </div>
            <label>
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = e.target.scrollHeight + "px";
                }}
                placeholder="Notes…"
                rows={1}
                className="w-full rounded-md border border-input bg-transparent px-2 py-1.5 text-sm resize-none"
              />
            </label>
            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-[#3d3833] text-white hover:bg-[#2d2925]"
            >
              Save changes
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
