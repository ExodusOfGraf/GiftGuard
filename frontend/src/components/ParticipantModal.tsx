"use client";

import React from "react";
import { Participant } from "../lib/api";
import { RiskBadge } from "./RiskBadge";
import { useI18n, Locale } from "../lib/i18n";
import { hapticImpact } from "../lib/telegram";

interface ParticipantModalProps {
  participant: Participant | null;
  onClose: () => void;
}

export function ParticipantModal({ participant, onClose }: ParticipantModalProps) {
  const { t, locale } = useI18n();

  if (!participant) return null;

  const signals = participant.metadata?.risk_signals || [];
  const checks = participant.metadata?.eligibility?.checks || [];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    hapticImpact("light");
  };

  const displayName = participant.user.username
    ? `@${participant.user.username}`
    : participant.user.first_name || `ID ${participant.user.telegram_id}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Mobile drag handle */}
        <div className="sheet-drag-handle" />

        <div className="modal-header">
          <div>
            <h2>{displayName}</h2>
            <p className="muted">
              {t.modalTgId} {participant.user.telegram_id}
            </p>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label={t.btnCancel}
          >
            &times;
          </button>
        </div>

        {/* Ticket ID */}
        <div className="hash-box">
          <div className="hash-box-label">
            <span>{t.modalTicketUuid}</span>
            <button
              type="button"
              className="button-secondary button-sm"
              onClick={() => copyToClipboard(participant.id)}
            >
              {t.btnCopy}
            </button>
          </div>
          <div className="hash-value">{participant.id}</div>
        </div>

        {/* Overview Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "10px",
            margin: "12px 0",
          }}
        >
          <div className="card" style={{ padding: "12px", background: "rgba(0,0,0,0.2)" }}>
            <span className="stat-label">{t.modalEligibilityTitle}</span>
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
                {participant.eligibility_status === "eligible"
                  ? locale === "ru"
                    ? "ДОПУЩЕН ✓"
                    : "ELIGIBLE ✓"
                  : participant.eligibility_status === "pending"
                  ? locale === "ru"
                    ? "ОЖИДАЕТ ⏳"
                    : "PENDING ⏳"
                  : locale === "ru"
                  ? "ОТКЛОНЕН ✗"
                  : "REJECTED ✗"}
              </span>
            </div>
            {participant.rejection_reason && (
              <p className="muted" style={{ fontSize: "0.75rem", marginTop: "4px" }}>
                {participant.rejection_reason}
              </p>
            )}
          </div>

          <div className="card" style={{ padding: "12px", background: "rgba(0,0,0,0.2)" }}>
            <span className="stat-label">{t.modalFraudRiskTitle}</span>
            <div style={{ marginTop: "4px" }}>
              <RiskBadge score={participant.risk_score} level={participant.risk_level} />
            </div>
            <p className="muted" style={{ fontSize: "0.72rem", marginTop: "4px" }}>
              {t.modalJoined} {new Date(participant.joined_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {/* Anti-Farm Risk Signals Breakdown */}
        <div style={{ marginTop: "14px" }}>
          <h3>
            {t.modalSignalsTitle} ({signals.length})
          </h3>
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            {t.modalSignalsDesc}
          </p>

          {signals.length === 0 ? (
            <div
              className="card"
              style={{
                padding: "12px",
                marginTop: "8px",
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <p style={{ color: "#34d399", fontSize: "0.88rem", margin: 0 }}>
                {t.modalNoSignals}
              </p>
            </div>
          ) : (
            <div className="signal-list">
              {signals.map((sig, idx) => (
                <div key={idx} className="signal-item">
                  <div className="signal-info">
                    <span className="signal-title">{formatRuleName(sig.rule, locale)}</span>
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
          <div style={{ marginTop: "16px" }}>
            <h3>{t.modalChecksTitle}</h3>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {checks.map((chk, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                  }}
                >
                  <span className="muted">
                    {locale === "ru" ? `Канал #${idx + 1}` : `Channel #${idx + 1}`}
                  </span>
                  <span>
                    {chk.subscribed ? (
                      <span style={{ color: "#34d399", fontWeight: 600 }}>
                        {t.modalSubscribed}
                      </span>
                    ) : chk.status === "unavailable" ? (
                      <span style={{ color: "#fbbf24", fontWeight: 600 }}>
                        {t.modalCheckPending}
                      </span>
                    ) : (
                      <span style={{ color: "#f87171", fontWeight: 600 }}>
                        {t.modalNotSubscribed}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "18px" }}>
          <button
            type="button"
            className="button button-secondary button-full"
            onClick={onClose}
          >
            {t.btnCancel}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRuleName(rule: string, locale: Locale): string {
  if (locale === "ru") {
    const mapRu: Record<string, string> = {
      participation_burst: "Всплеск массовых регистраций",
      instant_join: "Мгновенное участие после публикации",
      requirement_completion_speed: "Аномальная скорость подписки",
      duplicate_pattern: "Одинаковый поведенческий паттерн",
      new_interaction: "Первое взаимодействие с ботом",
      referral_anomaly: "Аномалия графа рефералов",
    };
    return mapRu[rule] || rule;
  }

  const mapEn: Record<string, string> = {
    participation_burst: "Registration Burst Anomaly",
    instant_join: "Instant Participation",
    requirement_completion_speed: "Speed Completion Anomaly",
    duplicate_pattern: "Duplicate Behavioral Pattern",
    new_interaction: "First Interaction Anomaly",
    referral_anomaly: "Referral Graph Anomaly",
  };
  return mapEn[rule] || rule.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
