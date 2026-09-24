"use client";

import React from "react";
import { Participant } from "../lib/api";
import { RiskBadge } from "./RiskBadge";

interface ParticipantModalProps {
  participant: Participant | null;
  onClose: () => void;
}

export function ParticipantModal({ participant, onClose }: ParticipantModalProps) {
  if (!participant) return null;

  const signals = participant.metadata?.risk_signals || [];
  const checks = participant.metadata?.eligibility?.checks || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const displayName = participant.user.username
    ? `@${participant.user.username}`
    : participant.user.first_name || `ID ${participant.user.telegram_id}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{displayName}</h2>
            <p className="muted">Telegram ID: {participant.user.telegram_id}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Ticket ID */}
        <div className="hash-box">
          <div className="hash-box-label">
            <span>Ticket UUID</span>
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={() => copyToClipboard(participant.id)}
            >
              Copy
            </button>
          </div>
          <div className="hash-value">{participant.id}</div>
        </div>

        {/* Overview Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", margin: "14px 0" }}>
          <div className="card" style={{ padding: "12px", background: "rgba(0,0,0,0.2)" }}>
            <span className="stat-label">Eligibility</span>
            <div style={{ marginTop: "4px" }}>
              <span
                className={`badge ${
                  participant.eligibility_status === "eligible"
                    ? "badge-completed"
                    : participant.eligibility_status === "rejected"
                    ? "badge-cancelled"
                    : "badge-drawing"
                }`}
              >
                {participant.eligibility_status.toUpperCase()}
              </span>
            </div>
            {participant.rejection_reason && (
              <p className="muted" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                {participant.rejection_reason}
              </p>
            )}
          </div>

          <div className="card" style={{ padding: "12px", background: "rgba(0,0,0,0.2)" }}>
            <span className="stat-label">Fraud Risk</span>
            <div style={{ marginTop: "4px" }}>
              <RiskBadge score={participant.risk_score} level={participant.risk_level} />
            </div>
            <p className="muted" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
              Joined: {new Date(participant.joined_at).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Anti-Farm Risk Signals Breakdown */}
        <div style={{ marginTop: "18px" }}>
          <h3>Anti-Farm Signals ({signals.length})</h3>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Explainable heuristic rules evaluated for this participant.
          </p>

          {signals.length === 0 ? (
            <div className="card" style={{ padding: "14px", marginTop: "8px", background: "rgba(16, 185, 129, 0.05)" }}>
              <p style={{ color: "#34d399", fontSize: "0.9rem" }}>
                ✓ No suspicious signals detected. Account looks clean.
              </p>
            </div>
          ) : (
            <div className="signal-list">
              {signals.map((sig, idx) => (
                <div key={idx} className="signal-item">
                  <div className="signal-info">
                    <span className="signal-title">{formatRuleName(sig.rule)}</span>
                    <span className="signal-reason">{sig.reason}</span>
                  </div>
                  <span className="signal-score">+{sig.score}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Requirements Checks Observations */}
        {checks.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h3>Requirement Checks</h3>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {checks.map((chk, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.15)",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                >
                  <span className="muted">Requirement #{idx + 1}</span>
                  <span>
                    {chk.subscribed ? (
                      <span style={{ color: "#34d399" }}>Subscribed ✓</span>
                    ) : chk.status === "unavailable" ? (
                      <span style={{ color: "#fbbf24" }}>Check Pending ⏳</span>
                    ) : (
                      <span style={{ color: "#f87171" }}>Not Subscribed ✗</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatRuleName(rule: string): string {
  const map: Record<string, string> = {
    participation_burst: "Participation Burst",
    instant_join: "Instant Participation",
    requirement_completion_speed: "Completion Speed Anomaly",
    duplicate_pattern: "Duplicate Behavioral Pattern",
    new_interaction: "First Interaction Anomaly",
    referral_anomaly: "Referral Graph Anomaly",
  };
  return map[rule] || rule.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
