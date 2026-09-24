"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api, Giveaway } from "../../lib/api";
import { StatusBadge } from "../../components/StatusBadge";
import { initTelegram } from "../../lib/telegram";

export default function Dashboard() {
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

  return (
    <main>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1>Campaigns Dashboard</h1>
          <p className="muted">Manage your Telegram Gift &amp; NFT giveaways</p>
        </div>
        <Link href="/giveaways/new" className="button">
          + New Giveaway
        </Link>
      </div>

      {/* Auth Banner if needed */}
      {error && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #f59e0b",
            background: "rgba(245, 158, 11, 0.08)",
            marginBottom: "24px",
          }}
        >
          <div style={{ fontWeight: 600, color: "#fbbf24", marginBottom: "4px" }}>
            Telegram Authentication Required
          </div>
          <p className="muted" style={{ color: "#e2e8f0" }}>
            Open GiftGuard inside the Telegram Mini App to manage campaigns with your Telegram account.
          </p>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "6px" }}>
            Details: {error}
          </p>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Campaigns</span>
          <span className="stat-value">{totalGiveaways}</span>
          <span className="stat-hint">All time created</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Now</span>
          <span className="stat-value" style={{ color: "#34d399" }}>
            {activeCount}
          </span>
          <span className="stat-hint">Accepting entries</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Drafts</span>
          <span className="stat-value" style={{ color: "#cbd5e1" }}>
            {draftCount}
          </span>
          <span className="stat-hint">Unpublished</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value" style={{ color: "#38bdf8" }}>
            {completedCount}
          </span>
          <span className="stat-hint">With provable draw</span>
        </div>
      </div>

      {/* Segmented Filter Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "all" ? "active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All ({totalGiveaways})
        </button>
        <button
          className={`tab ${activeTab === "active" ? "active" : ""}`}
          onClick={() => setActiveTab("active")}
        >
          Active ({activeCount})
        </button>
        <button
          className={`tab ${activeTab === "draft" ? "active" : ""}`}
          onClick={() => setActiveTab("draft")}
        >
          Drafts ({draftCount})
        </button>
        <button
          className={`tab ${activeTab === "completed" ? "active" : ""}`}
          onClick={() => setActiveTab("completed")}
        >
          Completed ({completedCount})
        </button>
      </div>

      {/* Loading & Empty State */}
      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading your giveaways...</p>
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎁</div>
          <h2>No giveaways found</h2>
          <p className="muted" style={{ marginBottom: "20px" }}>
            {activeTab === "all"
              ? "You haven't created any giveaways yet."
              : `No giveaways matching the "${activeTab}" filter.`}
          </p>
          <Link href="/giveaways/new" className="button">
            Create Giveaway
          </Link>
        </div>
      )}

      {/* Giveaways List Grid */}
      <div className="grid">
        {filteredItems.map((item) => (
          <div key={item.id} className="card card-interactive" style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <StatusBadge status={item.status} />
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                {item.winners_count} {item.winners_count === 1 ? "winner" : "winners"}
              </span>
            </div>

            <h2 style={{ fontSize: "1.2rem", marginBottom: "6px" }}>{item.title}</h2>
            {item.description && (
              <p
                style={{
                  fontSize: "0.88rem",
                  marginBottom: "12px",
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
                marginBottom: "14px",
                fontSize: "0.85rem",
              }}
            >
              {item.prize ? (
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "#f8fafc", fontWeight: 600 }}>🎁 {item.prize.title}</span>
                  {item.prize.estimated_value && (
                    <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                      {item.prize.estimated_value} {item.prize.currency || "TON"}
                    </span>
                  )}
                </div>
              ) : (
                <span className="muted">No prize configured</span>
              )}

              {item.requirements && item.requirements.length > 0 && (
                <div className="muted" style={{ fontSize: "0.78rem" }}>
                  📋 {item.requirements.length} {item.requirements.length === 1 ? "channel required" : "channels required"}
                </div>
              )}
            </div>

            {/* Timing */}
            <div className="muted" style={{ fontSize: "0.8rem", marginBottom: "16px", marginTop: "auto" }}>
              Ends: {new Date(item.ends_at).toLocaleString()}
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
              <Link href={`/giveaways/${item.id}`} className="button button-sm button-secondary" style={{ flex: 1 }}>
                Manage
              </Link>
              <Link href={`/giveaways/${item.id}/participants`} className="button button-sm button-secondary">
                Participants
              </Link>
              <Link href={`/giveaways/${item.id}/results`} className="button button-sm button-secondary">
                Results
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
