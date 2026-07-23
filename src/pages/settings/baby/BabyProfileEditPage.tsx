import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getBabyProfile, saveBabyProfile, uploadProfilePhoto } from "@/lib/baby-profile-fn";
import { BabyAvatarPlaceholder } from "@/pages/overview/BabyAvatarPlaceholder";
import { ArrowLeft } from "lucide-react";

export function BabyProfileEditPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const saveFn = useServerFn(saveBabyProfile);
  const uploadFn = useServerFn(uploadProfilePhoto);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["babyProfile"],
    queryFn: () => getBabyProfile(),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setDateOfBirth(profile.dateOfBirth);
      setGender(profile.gender);
      setImageUrl(profile.imageUrl);
    }
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    try {
      await saveFn({ data: { firstName, lastName, dateOfBirth, gender } });
      void queryClient.invalidateQueries({ queryKey: ["babyProfile"] });
      navigate({ to: "/settings" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await uploadFn({ data: form });
      setImageUrl(result.imageUrl);
      void queryClient.invalidateQueries({ queryKey: ["babyProfile"] });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-accent"
          aria-label="Back to settings"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-xl font-bold">Edit Baby Profile</h1>
      </div>

      {/* Photo */}
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="h-24 w-24 overflow-hidden rounded-full bg-muted">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={firstName}
              className="h-full w-full object-cover"
            />
          ) : (
            <BabyAvatarPlaceholder gender={gender} className="h-full w-full" />
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePhotoUpload(file);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Uploading…" : imageUrl ? "Change Photo" : "Upload Photo"}
        </Button>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">First Name</span>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Last Name</span>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Date of Birth</span>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          />
        </label>

        <fieldset className="block">
          <legend className="mb-1 text-xs font-medium text-muted-foreground">Gender</legend>
          <div className="flex gap-3">
            {(["male", "female"] as const).map((g) => {
              const isActive = gender === g;
              const activeClass = g === "male"
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-pink-400 bg-pink-400 text-white";
              return (
                <label
                  key={g}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? activeClass
                      : "border-input bg-transparent hover:border-gray-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={isActive}
                    onChange={() => setGender(g)}
                    className="sr-only"
                  />
                  <span className="text-base leading-none">{g === "male" ? "♂" : "♀"}</span>
                  {g === "male" ? "Male" : "Female"}
                </label>
              );
            })}
          </div>
        </fieldset>

        <Button
          type="button"
          className="w-full"
          disabled={saving || !firstName.trim() || !dateOfBirth}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </main>
  );
}
