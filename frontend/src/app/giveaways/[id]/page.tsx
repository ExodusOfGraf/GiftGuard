"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  api,
  Giveaway,
  Analytics,
  Participation,
} from "../../../lib/api";
import { StatusBadge } from "../../../components/StatusBadge";
import {
  initTelegram,
  hapticNotification,
  hapticImpact,
  openTelegramChannel,
} from "../../../lib/telegram";
import { useI18n } from "../../../lib/i18n";

export default function GiveawayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { t, locale } = useI18n();

  const [giveaway, setGiveaway] = useState<Giveaway | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [myEntry, setMyEntry] = useState<Participation | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    // Try fetching as owner first
    try {
      const owned = await api<Giveaway>(`/api/giveaways/${id}`);
      setGiveaway(owned);
      setIsOwner(true);

      // Load analytics for owner
      try {
        const stats = await api<Analytics>(`/api/giveaways/${id}/analytics`);
        setAnalytics(stats);
      } catch {
        // Analytics might not have data yet
      }
    } catch {
      // Not owner or not authenticated as owner, try public view
      setIsOwner(false);
      try {
        const pub = await api<Giveaway>(`/api/public/giveaways/${id}`);
        setGiveaway(pub);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Giveaway not found";
        setError(message);
      }
    }

    // Check my participation status if authenticated
    try {
      const entry = await api<Participation>(`/api/giveaways/${id}/participation/me`);
      setMyEntry(entry);
    } catch {
      // Not participated yet
    }

    setLoading(false);
  };

  useEffect(() => {
    initTelegram();
    loadData();
  }, [id]);

  // Actions for Organizer
  const handlePublish = async () => {
    if (!confirm(t.gwBtnPublishConfirm)) return;
    setActionLoading(true);
    hapticImpact("medium");
    try {
      await api(`/api/giveaways/${id}/publish`, { method: "POST" });
      hapticNotification("success");
      setSuccessMessage(t.gwPublishedSuccess);
      await loadData();
    } catch (err: unknown) {
      hapticNotification("error");
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm(t.gwBtnCancelConfirm)) return;
    setActionLoading(true);
    hapticImpact("medium");
    try {
      await api(`/api/giveaways/${id}/cancel`, { method: "POST" });
      hapticNotification("warning");
      await loadData();
    } catch (err: unknown) {
      hapticNotification("error");
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRunDraw = async () => {
    if (!confirm(t.gwBtnExecuteDrawConfirm)) return;
    setActionLoading(true);
    hapticImpact("heavy");
    try {
      await api(`/api/giveaways/${id}/draw`, { method: "POST" });
      hapticNotification("success");
      router.push(`/giveaways/${id}/results`);
    } catch (err: unknown) {
      hapticNotification("error");
      setError(err instanceof Error ? err.message : "Failed to execute draw");
    } finally {
      setActionLoading(false);
    }
  };

  // Action for Participant
  const handleParticipate = async () => {
    setActionLoading(true);
    setError(null);
    hapticImpact("medium");
    try {
      const entry = await api<Participation>(`/api/giveaways/${id}/participate`, { method: "POST" });
      setMyEntry(entry);
      hapticNotification("success");
      setSuccessMessage(t.gwParticipatedSuccess);
    } catch (err: unknown) {
      hapticNotification("error");
      setError(err instanceof Error ? err.message : "Failed to enter giveaway");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <main>
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p>{t.btnLoading}</p>
        </div>
      </main>
    );
  }

  if (!giveaway) {
    return (
      <main>
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2>{error || "Giveaway not found"}</h2>
          <Link href="/dashboard" className="button" style={{ marginTop: "16px" }}>
            {t.gwBackDashboard}
          </Link>
        </div>
      </main>
    );
  }

  const isCompleted = giveaway.status === "completed";
  const isDraft = giveaway.status === "draft";
  const isActive = giveaway.status === "active";
  const isLocked = giveaway.status === "locked";
  const canDraw = isOwner && (isActive || isLocked);

  return (
    <main style={{ maxWidth: "720px" }}>
      {/* Navigation Header */}
      <div style={{ marginBottom: "16px" }}>
        <Link
          href="/dashboard"
          className="muted"
          onClick={() => hapticImpact("light")}
          style={{ display: "inline-block", marginBottom: "6px" }}
        >
          {t.gwBackDashboard}
        </Link>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
          <div>
            <h1>{giveaway.title}</h1>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "4px" }}>
              <StatusBadge status={giveaway.status} />
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "3px 8px",
                  borderRadius: "9999px",
                  background: isOwner ? "rgba(56, 189, 248, 0.15)" : "rgba(148, 163, 184, 0.12)",
                  color: isOwner ? "#38bdf8" : "#94a3b8",
                  fontWeight: 700,
                }}
              >
                {isOwner ? t.gwBadgeOrganizer : t.gwBadgeParticipant}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #10b981",
            background: "rgba(16, 185, 129, 0.1)",
            marginBottom: "16px",
            padding: "12px 16px",
          }}
        >
          <p style={{ color: "#34d399", fontWeight: 600, fontSize: "0.9rem" }}>{successMessage}</p>
        </div>
      )}

      {error && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #ef4444",
            background: "rgba(239, 68, 68, 0.1)",
            marginBottom: "16px",
            padding: "12px 16px",
          }}
        >
          <p style={{ color: "#fca5a5", fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      {/* Description if present */}
      {giveaway.description && (
        <section className="card" style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>{giveaway.description}</p>
        </section>
      )}

      {/* Prize Card */}
      <section className="card" style={{ marginBottom: "16px" }}>
        <h2>🎁 {t.gwSectionPrize}</h2>
        {giveaway.prize ? (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                background: "rgba(0,0,0,0.25)",
                borderRadius: "8px",
                marginBottom: "8px",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#f8fafc" }}>
                  {giveaway.prize.title}
                </div>
                <div className="muted" style={{ fontSize: "0.78rem" }}>
                  {giveaway.prize.type.toUpperCase()}
                </div>
              </div>
              {giveaway.prize.estimated_value && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "#38bdf8", fontSize: "1.1rem" }}>
                    ~{giveaway.prize.estimated_value} {giveaway.prize.currency || "TON"}
                  </div>
                </div>
              )}
            </div>
            {giveaway.prize.description && (
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                {giveaway.prize.description}
              </p>
            )}
          </div>
        ) : (
          <p className="muted">{t.dashNoPrize}</p>
        )}
      </section>

      {/* Quick Info Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        <div className="card" style={{ padding: "12px" }}>
          <span className="stat-label">🏆 {t.gwWinnersCountLabel}</span>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, marginTop: "4px" }}>
            {giveaway.winners_count}
          </div>
        </div>
        <div className="card" style={{ padding: "12px" }}>
          <span className="stat-label">⏰ {t.gwDeadlineLabel}</span>
          <div style={{ fontSize: "0.85rem", fontWeight: 700, marginTop: "4px" }}>
            {new Date(giveaway.ends_at).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}
          </div>
        </div>
      </div>

      {/* Channel Requirements */}
      {giveaway.requirements && giveaway.requirements.length > 0 && (
        <section className="card" style={{ marginBottom: "16px" }}>
          <h2>📋 {t.gwSectionRequirements}</h2>
          <p className="muted" style={{ marginBottom: "12px", fontSize: "0.85rem" }}>
            {t.gwReqDesc}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {giveaway.requirements.map((req) => {
              const ch = req.config?.username;
              const chatId = req.config?.chat_id;
              return (
                <div
                  key={req.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "8px",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#38bdf8", fontSize: "0.95rem" }}>
                    {ch ? `@${ch}` : `ID: ${chatId}`}
                  </span>
                  {ch && (
                    <button
                      type="button"
                      className="button button-sm button-secondary"
                      onClick={() => openTelegramChannel(ch)}
                    >
                      {t.gwBtnSubscribe} @{ch}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Anti-Farm Status */}
      <section className="card" style={{ marginBottom: "16px" }}>
        <h2>🛡️ {t.gwSectionAntiFarm}</h2>
        <p style={{ fontSize: "0.88rem" }}>
          {giveaway.exclude_high_risk ? t.gwAntiFarmActive : t.gwAntiFarmInactive}
        </p>
      </section>

      {/* Participant View: My Participation */}
      {!isOwner && (
        <section
          className="card"
          style={{
            marginBottom: "16px",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            background: "rgba(56, 189, 248, 0.05)",
          }}
        >
          <h2>{t.gwSectionParticipation}</h2>
          {myEntry ? (
            <div>
              <div style={{ fontWeight: 700, color: "#34d399", marginBottom: "6px", fontSize: "0.95rem" }}>
                {t.gwYouAreRegistered}
              </div>
              <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "12px" }}>
                {myEntry.eligibility_status === "eligible"
                  ? t.gwYouAreEligible
                  : myEntry.eligibility_status === "pending"
                  ? t.gwYouArePending
                  : t.gwYouAreRejected}
              </p>
              <div className="hash-box">
                <span className="hash-box-label">{t.gwTicketNumber}</span>
                <span className="hash-value">{myEntry.id}</span>
              </div>
            </div>
          ) : isActive ? (
            <div>
              <p className="muted" style={{ marginBottom: "14px", fontSize: "0.88rem" }}>
                {locale === "ru"
                  ? "Нажмите кнопку ниже, чтобы проверить выполнение условий и зарегистрироваться в розыгрыше."
                  : "Click below to verify requirements and register your ticket in this giveaway."}
              </p>
              <button
                type="button"
                className="button button-full button-success"
                onClick={handleParticipate}
                disabled={actionLoading}
              >
                {actionLoading ? t.gwBtnParticipating : t.gwBtnParticipate}
              </button>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {giveaway.status === "completed"
                ? locale === "ru"
                  ? "Этот розыгрыш уже завершён. Смотрите итоги по кнопке ниже."
                  : "This giveaway has already completed. Check results below."
                : locale === "ru"
                ? "Приём заявок на данный момент закрыт."
                : "Entry is currently closed."}
            </p>
          )}
        </section>
      )}

      {/* Organizer View: Analytics */}
      {isOwner && analytics && (
        <section className="card" style={{ marginBottom: "16px" }}>
          <h2>📊 {t.gwSectionAnalytics}</h2>
          <div className="stats-grid" style={{ marginBottom: "12px" }}>
            <div className="stat-card">
              <span className="stat-label">{t.gwStatTotalEntries}</span>
              <span className="stat-value">{analytics.participants_total}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t.gwStatEligible}</span>
              <span className="stat-value" style={{ color: "#34d399" }}>
                {analytics.eligible}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t.gwStatPending}</span>
              <span className="stat-value" style={{ color: "#fbbf24" }}>
                {analytics.pending}
              </span>
            </div>
            <div className="stat-card">
              <span className="stat-label">{t.gwStatRejected}</span>
              <span className="stat-value" style={{ color: "#f87171" }}>
                {analytics.rejected}
              </span>
            </div>
          </div>

          <div
            style={{
              padding: "10px 14px",
              background: "rgba(0,0,0,0.2)",
              borderRadius: "8px",
              fontSize: "0.85rem",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>{t.gwRiskDistTitle}</div>
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <span>
                🟢 {t.gwRiskLow} <b>{analytics.risk.low}</b>
              </span>
              <span>
                🟡 {t.gwRiskMedium} <b>{analytics.risk.medium}</b>
              </span>
              <span>
                🔴 {t.gwRiskHigh} <b>{analytics.risk.high}</b>
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Action Navigation Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "20px" }}>
        {isCompleted && (
          <Link
            href={`/giveaways/${id}/results`}
            className="button button-full"
            onClick={() => hapticImpact("medium")}
          >
            {t.gwBtnViewResults}
          </Link>
        )}

        {isOwner && (
          <>
            <Link
              href={`/giveaways/${id}/participants`}
              className="button button-secondary button-full"
              onClick={() => hapticImpact("light")}
            >
              {t.gwBtnInspectParticipants}
            </Link>

            {isDraft && (
              <button
                type="button"
                className="button button-full button-success"
                onClick={handlePublish}
                disabled={actionLoading}
              >
                {t.gwBtnPublish}
              </button>
            )}

            {canDraw && (
              <button
                type="button"
                className="button button-full"
                onClick={handleRunDraw}
                disabled={actionLoading}
              >
                {t.gwBtnExecuteDraw}
              </button>
            )}

            {isDraft && (
              <button
                type="button"
                className="button button-secondary button-danger button-full"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {t.gwBtnCancelGw}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
