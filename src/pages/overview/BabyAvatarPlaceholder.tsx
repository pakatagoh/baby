interface BabyAvatarPlaceholderProps {
  gender: "male" | "female";
  className?: string;
}

const SHIRT: Record<"male" | "female", { fill: string; stroke: string }> = {
  male: { fill: "#5ba4b5", stroke: "#4691a2" },
  female: { fill: "#f0a0b5", stroke: "#d98095" },
};

export function BabyAvatarPlaceholder({ gender, className }: BabyAvatarPlaceholderProps) {
  const shirt = SHIRT[gender];

  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden="true"
      role="img"
      aria-label={`${gender} baby avatar placeholder`}
    >
      {/* Shirt */}
      <path
        d="M22 54 C22 48, 30 44, 40 44 C50 44, 58 48, 58 54 L58 80 L22 80 Z"
        fill={shirt.fill}
        stroke={shirt.stroke}
        strokeWidth="1"
      />
      {/* Collar line */}
      <path
        d="M30 52 Q36 56 40 52 Q44 56 50 52"
        stroke={shirt.stroke}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Head */}
      <circle cx="40" cy="32" r="22" fill="#fce5dd" />

      {/* Hair tuft */}
      <path
        d="M36 14 C36 8, 44 8, 44 14"
        stroke="#5c4333"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Hair curl */}
      <circle cx="40" cy="10" r="3" fill="#5c4333" />

      {/* Eyes */}
      <circle cx="32" cy="30" r="2.5" fill="#2d1f14" />
      <circle cx="48" cy="30" r="2.5" fill="#2d1f14" />

      {/* Eye shine */}
      <circle cx="32.8" cy="29.2" r="0.8" fill="white" />
      <circle cx="48.8" cy="29.2" r="0.8" fill="white" />

      {/* Cheeks */}
      <ellipse cx="25" cy="37" rx="5" ry="3.5" fill="#f0a090" opacity="0.35" />
      <ellipse cx="55" cy="37" rx="5" ry="3.5" fill="#f0a090" opacity="0.35" />

      {/* Smile */}
      <path
        d="M35 42 Q40 47 45 42"
        stroke="#2d1f14"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
