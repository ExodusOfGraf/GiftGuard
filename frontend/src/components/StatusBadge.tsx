"use client";

import React from "react";
import { GiveawayStatus } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface StatusBadgeProps {
  status: GiveawayStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useI18n();

  const labels: Record<GiveawayStatus, string> = {
    draft: t.statusDraft,
    scheduled: t.statusScheduled,
    active: t.statusActive,
    locked: t.statusLocked,
    drawing: t.statusDrawing,
    completed: t.statusCompleted,
    cancelled: t.statusCancelled,
  };

  return <span className={`badge badge-${status}`}>{labels[status] || status}</span>;
}
