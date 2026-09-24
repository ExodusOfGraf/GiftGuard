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
  openTelegramChannel,
} from "../../../lib/telegram";

export default function GiveawayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

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
    if (!confirm("Are you sure you want to publish this giveaway? Terms and prize will become immutable.")) return;
    setActionLoading(true);
    try {
      await api(`/api/giveaways/${id}/publish`, { method: "POST" });
      hapticNotification("success");
      setSuccessMessage("Giveaway published successfully!");
      await loadData();
    } catch (err: unknown) {
      hapticNotification("error");
      setError(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this giveaway? This action cannot be undone.")) return;
    setActionLoading(true);
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
    if (!confirm("Execute provably fair draw now?")) return;
    setActionLoading(true);
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
    try {
      const entry = await api<Participation>(`/api/giveaways/${id}/participate`, { method: "POST" });
      setMyEntry(entry);
      hapticNotification("success");
      setSuccessMessage("You are now registered in this giveaway! 🎉");
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
          <p>Loading giveaway details...</p>
        </div>
      </main>
    );
  }

  if (!giveaway) {
    return (
      <main>
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2>Giveaway Not Found</h2>
          <p className="muted" style={{ margin: "12px 0 20px" }}>
            {error || "The giveaway you are looking for does not exist or has expired."}
          </p>
          <Link href="/dashboard" className="button">
            Go to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  const isExpired = new Date(giveaway.ends_at) <= new Date();
  const canDraw = isOwner && isExpired && (giveaway.status === "active" || giveaway.status === "locked");

  return (
    <main>
      {/* Breadcrumb / Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <Link href={isOwner ? "/dashboard" : "/"} className="muted">
          ← {isOwner ? "Dashboard" : "Home"}
        </Link>
        <StatusBadge status={giveaway.status} />
      </div>

      {/* Notifications */}
      {error && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #ef4444",
            background: "rgba(239, 68, 68, 0.1)",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "#fca5a5", fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      {successMessage && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #10b981",
            background: "rgba(16, 185, 129, 0.1)",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "#34d399", fontSize: "0.9rem" }}>{successMessage}</p>
        </div>
      )}

      {/* Header Info */}
      <section className="card" style={{ marginBottom: "20px" }}>
        <h1 style={{ marginBottom: "8px" }}>{giveaway.title}</h1>
        {giveaway.description && (
          <p style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "16px" }}>
            {giveaway.description}
          </p>
        )}

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.88rem" }}>
          <div>
            <span className="muted">Winners:</span> <strong>{giveaway.winners_count}</strong>
          </div>
          <div>
            <span className="muted">Starts:</span>{" "}
            <strong>{new Date(giveaway.starts_at).toLocaleString()}</strong>
          </div>
          <div>
            <span className="muted">Ends:</span>{" "}
            <strong style={{ color: isExpired ? "#f87171" : "#38bdf8" }}>
              {new Date(giveaway.ends_at).toLocaleString()} {isExpired ? "(Ended)" : ""}
            </strong>
          </div>
          <div>
            <span className="muted">Anti-Farm:</span>{" "}
            <strong>{giveaway.exclude_high_risk ? "High Risk Excluded ✓" : "All Eligible"}</strong>
          </div>
        </div>
      </section>

      {/* Prize Showcase Card */}
      {giveaway.prize && (
        <section className="card" style={{ marginBottom: "20px", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
            <span className="badge" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8" }}>
              🎁 Prize Details
            </span>
            <span
              className="badge"
              style={{
                background:
                  giveaway.prize.verification_status === "verified"
                    ? "rgba(16, 185, 129, 0.2)"
                    : "rgba(148, 163, 184, 0.15)",
                color: giveaway.prize.verification_status === "verified" ? "#34d399" : "#94a3b8",
              }}
            >
              {giveaway.prize.verification_status.toUpperCase()}
            </span>
          </div>

          <h2 style={{ fontSize: "1.3rem", color: "#f8fafc" }}>{giveaway.prize.title}</h2>
          {giveaway.prize.description && <p className="muted">{giveaway.prize.description}</p>}

          {giveaway.prize.estimated_value && (
            <div style={{ marginTop: "12px", fontSize: "1.1rem", fontWeight: 700, color: "#38bdf8" }}>
              Value: {giveaway.prize.estimated_value} {giveaway.prize.currency || "TON"}
            </div>
          )}
        </section>
      )}

      {/* Requirements / Channels Checklist */}
      <section className="card" style={{ marginBottom: "20px" }}>
        <h2>Requirements to Enter ({giveaway.requirements?.length || 0})</h2>
        <p className="muted" style={{ marginBottom: "14px" }}>
          You must be a member of the following channels to be eligible to win:
        </p>

        {(!giveaway.requirements || giveaway.requirements.length === 0) ? (
          <p className="muted" style={{ fontStyle: "italic" }}>
            No subscription requirements. Open to all participants!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {giveaway.requirements.map((req, idx) => {
              const channelName = req.config.username
                ? `@${req.config.username}`
                : String(req.config.chat_id || "");

              return (
                <div
                  key={req.id || idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{channelName}</span>
                    <span className="muted" style={{ marginLeft: "8px", fontSize: "0.8rem" }}>
                      Channel #{idx + 1}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => openTelegramChannel(channelName)}
                  >
                    Open Channel ↗
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Participant View: Entry Flow */}
      {!isOwner && (
        <section className="card" style={{ marginBottom: "20px", textAlign: "center", padding: "28px 20px" }}>
          {myEntry ? (
            <div>
              <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>🎉</div>
              <h2>You Are In This Giveaway!</h2>
              <p className="muted" style={{ marginBottom: "16px" }}>
                Your participation has been recorded and conditions evaluated.
              </p>

              <div
                style={{
                  maxWidth: "460px",
                  margin: "0 auto",
                  padding: "16px",
                  background: "rgba(0,0,0,0.3)",
                  borderRadius: "12px",
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <span className="muted">Eligibility:</span>
                  <span
                    className={`badge ${
                      myEntry.eligibility_status === "eligible"
                        ? "badge-completed"
                        : myEntry.eligibility_status === "rejected"
                        ? "badge-cancelled"
                        : "badge-drawing"
                    }`}
                  >
                    {myEntry.eligibility_status.toUpperCase()}
                  </span>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <span className="muted">Ticket ID:</span>
                  <div className="hash-value" style={{ fontSize: "0.8rem", marginTop: "2px" }}>
                    {myEntry.id}
                  </div>
                </div>

                <div style={{ fontSize: "0.85rem" }}>
                  <span className="muted">Draw Time:</span>{" "}
                  <strong>{new Date(giveaway.ends_at).toLocaleString()}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h2>Ready to Win?</h2>
              <p className="muted" style={{ marginBottom: "20px" }}>
                Make sure you have subscribed to all channels above before entering.
              </p>
              <button
                type="button"
                disabled={actionLoading || giveaway.status !== "active"}
                onClick={handleParticipate}
                style={{ padding: "14px 28px", fontSize: "1.05rem" }}
              >
                {actionLoading
                  ? "Checking Eligibility..."
                  : giveaway.status !== "active"
                  ? `Giveaway is ${giveaway.status}`
                  : "🎁 Participate in Giveaway"}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Organizer View: Campaign Analytics */}
      {isOwner && analytics && (
        <section className="card" style={{ marginBottom: "20px" }}>
          <h2>Campaign Analytics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Entries</span>
              <span className="stat-value">{analytics.participants_total}</span>
              <span className="stat-hint">Registered users</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Eligible</span>
              <span className="stat-value" style={{ color: "#34d399" }}>
                {analytics.eligible}
              </span>
              <span className="stat-hint">Fulfilled requirements</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Rejected</span>
              <span className="stat-value" style={{ color: "#f87171" }}>
                {analytics.rejected}
              </span>
              <span className="stat-hint">Failed requirements</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">High Risk</span>
              <span className="stat-value" style={{ color: "#fb7185" }}>
                {analytics.risk?.high || 0}
              </span>
              <span className="stat-hint">Suspicious farm accounts</span>
            </div>
          </div>
        </section>
      )}

      {/* Action Navigation Bar for Organizer */}
      {isOwner && (
        <section
          className="card"
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link href={`/giveaways/${giveaway.id}/participants`} className="button button-secondary">
              👥 View Participants &amp; Anti-Farm ({analytics?.participants_total || 0})
            </Link>
            <Link href={`/giveaways/${giveaway.id}/results`} className="button button-secondary">
              🎲 Draw &amp; Verification Manifest
            </Link>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {giveaway.status === "draft" && (
              <>
                <button
                  type="button"
                  className="button-success"
                  disabled={actionLoading}
                  onClick={handlePublish}
                >
                  🚀 Publish Giveaway
                </button>
                <button
                  type="button"
                  className="button-danger"
                  disabled={actionLoading}
                  onClick={handleCancel}
                >
                  Cancel
                </button>
              </>
            )}

            {canDraw && (
              <button
                type="button"
                className="button-success"
                disabled={actionLoading}
                onClick={handleRunDraw}
                style={{ boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)" }}
              >
                🎲 Execute Provably Fair Draw
              </button>
            )}

            {giveaway.status === "completed" && (
              <Link href={`/giveaways/${giveaway.id}/results`} className="button button-success">
                ✓ View Winners &amp; Proof
              </Link>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
