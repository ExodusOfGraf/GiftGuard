import React from "react";
import { GiveawayStatus } from "../lib/api";

interface StatusBadgeProps {
  status: GiveawayStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const labels: Record<GiveawayStatus, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    active: "Active",
    locked: "Locked",
    drawing: "Drawing...",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}
