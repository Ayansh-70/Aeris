"use client";
import { useWorkspace } from "./Workspace";
import { Dashboard } from "./Dashboard";
import FeatureScreen from "./features/FeatureScreen";
export function ToolPage({ page }: { page: string }) {
  const state = useWorkspace();
  return page === "dashboard" ? (
    <Dashboard />
  ) : (
    <FeatureScreen page={page} {...state} />
  );
}
