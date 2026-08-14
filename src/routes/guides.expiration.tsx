import { createFileRoute } from "@tanstack/react-router";
import { ExpirationPage } from "@/pages/guides/ExpirationPage";

export const Route = createFileRoute("/guides/expiration")({
  component: ExpirationPage,
});
