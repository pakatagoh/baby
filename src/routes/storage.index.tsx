import { createFileRoute } from "@tanstack/react-router";
import { StoragePage } from "@/pages/storage/StoragePage";

export const Route = createFileRoute("/storage/")({
  component: StoragePage,
});
