"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, Participant } from "../../../../lib/api";
import { RiskBadge } from "../../../../components/RiskBadge";
import { ParticipantModal } from "../../../../components/ParticipantModal";
import { initTelegram, hapticImpact } from "../../../../lib/telegram";

export default function ParticipantsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [items, setItems] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [eligibilityFilter, setEligibilityFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  // Selected participant for modal
  const [selected, setSelected] = useState<Participant | null>(null);

  useEffect(() => {
    initTelegram();
    if (!id) return;
    setLoading(true);

    let url = `/api/giveaways/${id}/participants?limit=200`;
    if (eligibilityFilter !== "all") {
      url += `&eligibility_status=${eligibilityFilter}`;
    }
    if (riskFilter !== "all") {
      url += `&risk_level=${riskFilter}`;
    }

    api<Participant[]>(url)
      .then((data) => {
        setItems(data);
        setError(null);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load participants";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [id, eligibilityFilter, riskFilter]);

  const handleSelect = (participant: Participant) => {
    hapticImpact("light");
    setSelected(participant);
  };

  // Client-side search filter
  const filtered = items.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const uname = (p.user.username || "").toLowerCase();
    const fname = (p.user.first_name || "").toLowerCase();
    const tid = String(p.user.telegram_id);
    return uname.includes(q) || fname.includes(q) || tid.includes(q);
  });

  return (
    <main>
      <div style={{ marginBottom: "20px" }}>
        <Link href={`/giveaways/${id}`} className="muted" style={{ display: "inline-block", marginBottom: "8px" }}>
          ← Back to Giveaway
        </Link>
        <h1>Anti-Farm Inspector</h1>
        <p className="muted">
          Inspect behavioral risk scoring, burst anomalies, and requirement checks for each participant.
        </p>
      </div>

      {error && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #ef4444",
            background: "rgba(239, 68, 68, 0.1)",
            marginBottom: "20px",
          }}
        >
          <p style={{ color: "#fca5a5" }}>{error}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="card" style={{ marginBottom: "20px", padding: "16px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <input
              type="text"
              placeholder="Search by @username or Telegram ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <select
              value={eligibilityFilter}
              onChange={(e) => setEligibilityFilter(e.target.value)}
              style={{ width: "auto", marginBottom: 0 }}
            >
              <option value="all">All Eligibility</option>
              <option value="eligible">Eligible ✓</option>
              <option value="rejected">Rejected ✗</option>
              <option value="pending">Pending ⏳</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{ width: "auto", marginBottom: 0 }}
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk (0–29)</option>
              <option value="medium">Medium Risk (30–59)</option>
              <option value="high">High Risk (60–100)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Participants Table */}
      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Analyzing participant signals...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2>No participants found</h2>
          <p className="muted">
            {items.length === 0
              ? "No one has entered this giveaway yet."
              : "No participants match the active filter criteria."}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Participant</th>
                <th>Joined</th>
                <th>Eligibility</th>
                <th>Risk Score</th>
                <th>Inspection</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const userTitle = p.user.username
                  ? `@${p.user.username}`
                  : p.user.first_name || `ID ${p.user.telegram_id}`;
                const signalCount = p.metadata?.risk_signals?.length || 0;

                return (
                  <tr
                    key={p.id}
                    className="clickable-row"
                    onClick={() => handleSelect(p)}
                  >
                    <td>
                      <div style={{ fontWeight: 600 }}>{userTitle}</div>
                      <div className="muted" style={{ fontSize: "0.78rem" }}>
                        ID: {p.user.telegram_id}
                      </div>
                    </td>
                    <td>
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        {new Date(p.joined_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          p.eligibility_status === "eligible"
                            ? "badge-completed"
                            : p.eligibility_status === "rejected"
                            ? "badge-cancelled"
                            : "badge-drawing"
                        }`}
                      >
                        {p.eligibility_status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <RiskBadge score={p.risk_score} level={p.risk_level} />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-secondary button-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelect(p);
                        }}
                      >
                        {signalCount > 0 ? `${signalCount} Signals →` : "Clean →"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Anti-Farm Inspector Modal */}
      <ParticipantModal participant={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
