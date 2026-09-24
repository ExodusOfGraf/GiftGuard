import React from "react";
import { RiskLevel } from "../lib/api";

interface RiskBadgeProps {
  score: number;
  level: RiskLevel;
  showScore?: boolean;
}

export function RiskBadge({ score, level, showScore = true }: RiskBadgeProps) {
  const levelClass =
    level === "high" ? "risk-high" : level === "medium" ? "risk-medium" : "risk-low";

  return (
    <span className={`badge ${levelClass}`}>
      {showScore ? `${score} • ` : ""}
      {level.toUpperCase()}
    </span>
  );
}
