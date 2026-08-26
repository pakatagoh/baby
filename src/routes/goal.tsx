import { createFileRoute } from "@tanstack/react-router";
import { GoalPage } from "@/pages/goal/GoalPage";

export const Route = createFileRoute("/goal")({
  component: GoalPage,
});
