"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, Participant } from "../../../../lib/api";
import { RiskBadge } from "../../../../components/RiskBadge";
import { ParticipantModal } from "../../../../components/ParticipantModal";
import { initTelegram, hapticImpact } from "../../../../lib/telegram";
import { useI18n } from "../../../../lib/i18n";

export default function ParticipantsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { t, locale } = useI18n();

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
      <div style={{ marginBottom: "16px" }}>
        <Link
          href={`/giveaways/${id}`}
          className="muted"
          onClick={() => hapticImpact("light")}
          style={{ display: "inline-block", marginBottom: "6px" }}
        >
          {t.gwBackGiveaway}
        </Link>
        <h1>{t.partTitle}</h1>
        <p className="muted">{t.partSubtitle}</p>
      </div>

      {error && (
        <div
          className="card"
          style={{
            borderLeft: "4px solid #ef4444",
            background: "rgba(239, 68, 68, 0.1)",
            marginBottom: "16px",
          }}
        >
          <p style={{ color: "#fca5a5" }}>{error}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <section className="card" style={{ marginBottom: "16px", padding: "14px" }}>
        <div className="form-group">
          <input
            type="text"
            placeholder={t.partSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="form-row form-row-2" style={{ marginBottom: 0 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              value={eligibilityFilter}
              onChange={(e) => {
                hapticImpact("light");
                setEligibilityFilter(e.target.value);
              }}
            >
              <option value="all">{t.partFilterAllEligibility}</option>
              <option value="eligible">{t.partFilterEligible}</option>
              <option value="pending">{t.partFilterPending}</option>
              <option value="rejected">{t.partFilterRejected}</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              value={riskFilter}
              onChange={(e) => {
                hapticImpact("light");
                setRiskFilter(e.target.value);
              }}
            >
              <option value="all">{t.partFilterAllRisk}</option>
              <option value="low">{t.partFilterRiskLow}</option>
              <option value="medium">{t.partFilterRiskMedium}</option>
              <option value="high">{t.partFilterRiskHigh}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Loading & Empty State */}
      {loading && (
        <div className="card" style={{ textAlign: "center", padding: "36px" }}>
          <p>{t.btnLoading}</p>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "36px 16px" }}>
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>👥</div>
          <p className="muted">{t.partNoFound}</p>
        </div>
      )}

      {/* Participants: Mobile Cards (Default on small screens) */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((item) => {
            const signalsCount = item.metadata?.risk_signals?.length || 0;
            return (
              <div
                key={item.id}
                className="card card-interactive"
                onClick={() => handleSelect(item)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  gap: "10px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#f8fafc", wordBreak: "break-all" }}>
                    {item.user.username ? `@${item.user.username}` : item.user.first_name || `ID ${item.user.telegram_id}`}
                  </div>
                  <div className="muted" style={{ fontSize: "0.75rem" }}>
                    ID: {item.user.telegram_id} • {new Date(item.joined_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <span
                    className={`badge ${
                      item.eligibility_status === "eligible"
                        ? "badge-completed"
                        : item.eligibility_status === "pending"
                        ? "badge-drawing"
                        : "badge-cancelled"
                    }`}
                  >
                    {item.eligibility_status === "eligible"
                      ? locale === "ru"
                        ? "ДОПУЩЕН"
                        : "ELIGIBLE"
                      : item.eligibility_status === "pending"
                      ? locale === "ru"
                        ? "ОЖИДАЕТ"
                        : "PENDING"
                      : locale === "ru"
                      ? "ОТКЛОНЕН"
                      : "REJECTED"}
                  </span>
                  <RiskBadge score={item.risk_score} level={item.risk_level} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Participant Modal / Inspector Sheet */}
      <ParticipantModal participant={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
