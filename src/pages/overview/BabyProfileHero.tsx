import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import type { BabyProfile } from "@/lib/baby-profile-fn";
import { BabyAvatarPlaceholder } from "@/pages/overview/BabyAvatarPlaceholder";
import { Pencil } from "lucide-react";

interface BabyProfileHeroProps {
  profile: BabyProfile;
  /** Optional uploaded image URL to replace the placeholder. */
  imageUrl?: string | null;
}

function computeAge(dob: string): string {
  const birth = new Date(dob + "T00:00:00");
  if (Number.isNaN(birth.getTime())) return "";

  const now = new Date();
  if (now < birth) return "";

  // Calendar month arithmetic (handles varying month lengths correctly)
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    // Borrow days from the previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const totalMonths = years * 12 + months;

  // Under 1 month: show in weeks + days (7-day intervals from birthday)
  if (totalMonths === 0) {
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / (24 * 60 * 60 * 1000));
    const weeks = Math.floor(totalDays / 7);
    const remainingDays = totalDays - weeks * 7;

    if (totalDays === 0) return "Today";
    if (weeks === 0) return `${totalDays} day${totalDays > 1 ? "s" : ""}`;
    if (remainingDays === 0) return `${weeks} week${weeks > 1 ? "s" : ""}`;
    return `${weeks} week${weeks > 1 ? "s" : ""}, ${remainingDays} day${remainingDays > 1 ? "s" : ""}`;
  }

  // Under 1 year: show in months + weeks + days
  // Month boundary is birthday + totalMonths (same day-of-month in a later month)
  if (totalMonths < 12) {
    const monthBoundary = new Date(birth);
    monthBoundary.setMonth(birth.getMonth() + totalMonths);
    const daysSinceBoundary = Math.floor((now.getTime() - monthBoundary.getTime()) / (24 * 60 * 60 * 1000));
    const boundaryWeeks = Math.floor(daysSinceBoundary / 7);
    const boundaryDays = daysSinceBoundary - boundaryWeeks * 7;

    if (boundaryWeeks === 0 && boundaryDays === 0) return `${totalMonths} month${totalMonths > 1 ? "s" : ""}`;
    if (boundaryWeeks === 0) return `${totalMonths} month${totalMonths > 1 ? "s" : ""}, ${boundaryDays} day${boundaryDays > 1 ? "s" : ""}`;
    if (boundaryDays === 0) return `${totalMonths} month${totalMonths > 1 ? "s" : ""}, ${boundaryWeeks} week${boundaryWeeks > 1 ? "s" : ""}`;
    return `${totalMonths} month${totalMonths > 1 ? "s" : ""}, ${boundaryWeeks} week${boundaryWeeks > 1 ? "s" : ""}, ${boundaryDays} day${boundaryDays > 1 ? "s" : ""}`;
  }

  // 1+ year: show in years + months
  if (months === 0) return `${years} year${years > 1 ? "s" : ""}`;
  return `${years} year${years > 1 ? "s" : ""}, ${months} month${months > 1 ? "s" : ""}`;
}

export function BabyProfileHero({ profile, imageUrl }: BabyProfileHeroProps) {
  const age = useMemo(() => computeAge(profile.dateOfBirth), [profile.dateOfBirth]);

  return (
    <div className="flex items-center gap-4 rounded-2xl bg-muted px-5 py-4">
      {/* Avatar */}
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={profile.firstName}
            className="h-full w-full object-cover"
          />
        ) : (
          <BabyAvatarPlaceholder
            gender={profile.gender}
            className="h-full w-full"
          />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-foreground">{profile.firstName}</p>
        {age && (
          <p className="text-sm text-muted-foreground">{age}</p>
        )}
        {profile.latestWeightKg != null && (
          <p className="text-sm text-muted-foreground">{profile.latestWeightKg} kg</p>
        )}
      </div>

      {/* Edit */}
      <Link
        to="/settings/baby"
        className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Edit profile"
      >
        <Pencil className="size-4" />
      </Link>
    </div>
  );
}
