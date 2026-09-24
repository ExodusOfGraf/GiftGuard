"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Giveaway } from "../../lib/api";
import { StatusBadge } from "../../components/StatusBadge";
import { initTelegram, hapticImpact } from "../../lib/telegram";
import { useI18n } from "../../lib/i18n";

export default function Dashboard() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Giveaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "draft" | "completed">("all");

  useEffect(() => {
    initTelegram();
    api<Giveaway[]>("/api/giveaways")
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to load giveaways");
      })
      .finally(() => setLoading(false));
  }, []);

  const totalGiveaways = items.length;
  const activeCount = items.filter((g) => g.status === "active" || g.status === "scheduled").length;
  const completedCount = items.filter((g) => g.status === "completed").length;
  const draftCount = items.filter((g) => g.status === "draft").length;

  const filteredItems = items.filter((item) => {
    if (activeTab === "active") return item.status === "active" || item.status === "scheduled";
    if (activeTab === "draft") return item.status === "draft";
    if (activeTab === "completed") return item.status === "completed";
    return true;
  });

  const handleTabChange = (tab: "all" | "active" | "draft" | "completed") => {
    hapticImpact("light");
    setActiveTab(tab);
  };

  return (
    <main>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1>{t.dashTitle}</h1>
          <p className="muted">{t.dashSubtitle}</p>
        </div>
        <Link
          href="/giveaways/new"
          className="button button-sm"
          onClick={() => hapticImpact("light")}
          style={{ whiteSpace: "nowrap" }}
        >
          {t.dashBtnNew}
        </Link>
      </div>

      {/* Auth Banner if needed */}
      {error && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #f59e0b",
            background: "rgba(245, 158, 11, 0.08)",
            marginBottom: "16px",
          }}
        >
          <div style={{ fontWeight: 700, color: "#fbbf24", marginBottom: "4px", fontSize: "0.95rem" }}>
            {t.dashAuthBannerTitle}
          </div>
          <p className="muted" style={{ color: "#e2e8f0", fontSize: "0.85rem" }}>
            {t.dashAuthBannerText}
          </p>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">{t.dashStatTotal}</span>
          <span className="stat-value">{totalGiveaways}</span>
          <span className="stat-hint">{t.dashStatTotalHint}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t.dashStatActive}</span>
          <span className="stat-value" style={{ color: "#34d399" }}>
            {activeCount}
          </span>
          <span className="stat-hint">{t.dashStatActiveHint}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t.dashStatDrafts}</span>
          <span className="stat-value" style={{ color: "#cbd5e1" }}>
            {draftCount}
          </span>
          <span className="stat-hint">{t.dashStatDraftsHint}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">{t.dashStatCompleted}</span>
          <span className="stat-value" style={{ color: "#38bdf8" }}>
            {completedCount}
          </span>
          <span className="stat-hint">{t.dashStatCompletedHint}</span>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => handleTabChange("all")}
        >
          {t.dashTabAll} ({totalGiveaways})
        </button>
        <button
          className={`tab ${activeTab === "active" ? "active" : ""}`}
          onClick={() => handleTabChange("active")}
        >
          {t.dashTabActive} ({activeCount})
        </button>
        <button
          className={`tab ${activeTab === "draft" ? "active" : ""}`}
          onClick={() => handleTabChange("draft")}
        >
          {t.dashTabDrafts} ({draftCount})
        </button>
        <button
          className={`tab ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => handleTabChange("completed")}
        >
          {t.dashTabCompleted} ({completedCount})
        </button>
      </div>

      {/* Loading & Empty State */}
      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "36px" }}>
          <p>{t.dashLoading}</p>
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "40px 16px" }}>
          <div style={{ fontSize: "2.2rem", marginBottom: "10px" }}>🎁</div>
          <h2>{t.dashEmptyTitle}</h2>
          <p className="muted" style={{ marginBottom: "16px", fontSize: "0.9rem" }}>
            {activeTab === "all"
              ? t.dashEmptyText
              : `${t.dashEmptyFilteredText} «${activeTab}».`}
          </p>
          <Link
            href="/giveaways/new"
            className="button button-sm"
            onClick={() => hapticImpact("light")}
          >
            {t.dashBtnNew}
          </Link>
        </div>
      )}

      {/* Giveaways List Grid */}
      <div className="grid">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="card card-interactive"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <StatusBadge status={item.status} />
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                🏆 {item.winners_count}{" "}
                {item.winners_count === 1 ? t.dashWinnerCount : t.dashWinnersCount}
              </span>
            </div>

            <h2 style={{ fontSize: "1.15rem", marginBottom: "4px" }}>{item.title}</h2>
            {item.description && (
              <p
                style={{
                  fontSize: "0.85rem",
                  marginBottom: "10px",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {item.description}
              </p>
            )}

            {/* Prize & Channels Info */}
            <div
              style={{
                background: "rgba(0,0,0,0.2)",
                padding: "8px 12px",
                borderRadius: "8px",
                marginBottom: "12px",
                fontSize: "0.85rem",
              }}
            >
              {item.prize ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ color: "#f8fafc", fontWeight: 600 }}>
                    🎁 {item.prize.title}
                  </span>
                  {item.prize.estimated_value && (
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                      {item.prize.estimated_value} {item.prize.currency || "TON"}
                    </span>
                  )}
                </div>
              ) : (
                <span className="muted">{t.dashNoPrize}</span>
              )}

              {item.requirements && item.requirements.length > 0 && (
                <div className="muted" style={{ fontSize: "0.78rem" }}>
                  📋 {item.requirements.length}{" "}
                  {item.requirements.length === 1
                    ? t.dashChannelRequired
                    : t.dashChannelsRequired}
                </div>
              )}
            </div>

            {/* Timing */}
            <div
              className="muted"
              style={{ fontSize: "0.78rem", marginBottom: "12px", marginTop: "auto" }}
            >
              {t.dashEndsAt}: {new Date(item.ends_at).toLocaleString(locale === "ru" ? "ru-RU" : "en-US")}
            </div>

            {/* Quick Actions */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "6px",
                borderTop: "1px solid var(--border-color)",
                paddingTop: "10px",
              }}
            >
              <Link
                href={`/giveaways/${item.id}`}
                className="button button-sm button-secondary"
                onClick={() => hapticImpact("light")}
              >
                {t.dashBtnManage}
              </Link>
              <Link
                href={`/giveaways/${item.id}/participants`}
                className="button button-sm button-secondary"
                onClick={() => hapticImpact("light")}
              >
                {t.dashBtnParticipants}
              </Link>
              <Link
                href={`/giveaways/${item.id}/results`}
                className="button button-sm button-secondary"
                onClick={() => hapticImpact("light")}
              >
                {t.dashBtnResults}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
