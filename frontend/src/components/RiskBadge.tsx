"use client";

import React from "react";
import { RiskLevel } from "../lib/api";
import { useI18n } from "../lib/i18n";

interface RiskBadgeProps {
  score: number;
  level: RiskLevel;
  showScore?: boolean;
}

export function RiskBadge({ score, level, showScore = true }: RiskBadgeProps) {
  const { locale } = useI18n();

  const levelClass =
    level === "high" ? "risk-high" : level === "medium" ? "risk-medium" : "risk-low";

  const levelLabel =
    locale === "ru"
      ? level === "high"
        ? "ВЫСОКИЙ"
        : level === "medium"
        ? "СРЕДНИЙ"
        : "НИЗКИЙ"
      : level.toUpperCase();

  return (
    <span className={`badge ${levelClass}`}>
      {showScore ? `${score} • ` : ""}
      {levelLabel}
    </span>
  );
}
