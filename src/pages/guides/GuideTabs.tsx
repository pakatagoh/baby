import { Link } from "@tanstack/react-router";

interface GuideTabsProps {
  active: "feeding" | "expiration";
}

const tabs = [
  { label: "Feeding", href: "/guides/feed", key: "feeding" },
  { label: "Expiration", href: "/guides/expiration", key: "expiration" },
] as const;

export function GuideTabs({ active }: GuideTabsProps) {
  return (
    <nav aria-label="Guide sections" className="mb-6 flex gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.href}
            to={tab.href}
            preload="intent"
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "rounded-lg border-2 border-primary bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-lg border-2 border-black bg-white px-4 py-2 text-sm font-semibold text-foreground"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
