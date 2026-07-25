import { useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Camera,
  Home,
  ImagePlus,
  Keyboard,
  Package,
  Plus,
  BarChart3,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface NavItem {
  id: string;
  label: string;
  to: string;
  icon: React.ReactNode;
  cta?: boolean;
}

const navItems: NavItem[] = [
  { id: "overview", label: "Overview", to: "/", icon: <Home className="size-5" /> },
  { id: "storage", label: "Storage", to: "/storage", icon: <Package className="size-5" /> },
  { id: "add", label: "Add", to: "", icon: <Plus className="size-6" />, cta: true },
  { id: "stats", label: "Stats", to: "/stats", icon: <BarChart3 className="size-5" /> },
  { id: "settings", label: "Settings", to: "/settings", icon: <Settings className="size-5" /> },
];

interface BottomNavProps {
  onFileSelected: (file: File) => void;
  onManualEntry: () => void;
}

export default function BottomNav({ onFileSelected, onManualEntry }: BottomNavProps) {
  const { location } = useRouterState();
  const pathname = location.pathname;
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function isActive(to: string) {
    if (to === "/") return pathname === "/";
    return pathname.startsWith(to);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAddMenuOpen(false);
    onFileSelected(file);
  }

  function startManualEntry() {
    setAddMenuOpen(false);
    onManualEntry();
  }

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80
                   backdrop-blur-lg h-16 [@media(display-mode:standalone)]:h-24
                   pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-around px-2 [@media(display-mode:standalone)]:h-24 [@media(display-mode:standalone)]:items-start [@media(display-mode:standalone)]:pt-2">
          {navItems.map((item) =>
            item.cta ? (
              <button
                key={item.id}
                type="button"
                onClick={() => setAddMenuOpen(true)}
                className="relative -mt-3 flex size-12 items-center justify-center rounded-full
                           bg-primary text-primary-foreground shadow-lg transition-transform
                           active:scale-95"
                aria-label={item.label}
              >
                {item.icon}
              </button>
            ) : (
              <Link
                key={item.id}
                to={item.to}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5
                           py-1 transition-colors ${
                             isActive(item.to)
                               ? "text-primary"
                               : "text-muted-foreground"
                           }`}
                aria-label={item.label}
                aria-current={isActive(item.to) ? "page" : undefined}
              >
                {item.icon}
                <span className="text-[10px] font-medium leading-none [@media(display-mode:standalone)]:text-xs">{item.label}</span>
              </Link>
            ),
          )}
        </div>

      </nav>

      <Dialog open={addMenuOpen} onOpenChange={setAddMenuOpen}>
        <DialogContent className="max-w-sm gap-3 rounded-2xl bg-white p-5">
          <DialogTitle>Add frozen milk</DialogTitle>
          <p className="text-sm text-muted-foreground">Choose how you would like to add an entry.</p>
          <div className="grid gap-2 pt-1">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button variant="outline" className="h-auto justify-start gap-3 px-3 py-3" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="size-5 text-primary" />
              <span>Take a photo</span>
            </Button>
            <Button variant="outline" className="h-auto justify-start gap-3 px-3 py-3" onClick={() => imageInputRef.current?.click()}>
              <ImagePlus className="size-5 text-primary" />
              <span>Choose an image</span>
            </Button>
            <Button className="h-auto justify-start gap-3 px-3 py-3" onClick={startManualEntry}>
              <Keyboard className="size-5" />
              <span>Enter manually</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
