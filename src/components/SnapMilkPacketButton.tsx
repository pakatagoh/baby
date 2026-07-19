import { useRef } from "react";
import { Camera } from "lucide-react";

interface SnapMilkPacketButtonProps {
  onFile: (file: File) => void;
}

export function SnapMilkPacketButton({ onFile }: SnapMilkPacketButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onFile(file);
    e.target.value = "";
  }

  return (
    <div className="mb-6 flex justify-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="inline-flex items-center gap-2.5 rounded-2xl bg-[#e8937c] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#e8937c]/30 transition-all hover:-translate-y-0.5 hover:bg-[#e07d64] hover:shadow-xl hover:shadow-[#e8937c]/40 active:translate-y-0"
      >
        <Camera className="size-5" />
        Snap Milk Packet
      </button>
    </div>
  );
}
