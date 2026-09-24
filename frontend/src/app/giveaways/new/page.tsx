"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, PrizeType } from "../../../lib/api";
import { hapticNotification } from "../../../lib/telegram";

export default function NewGiveaway() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const now = new Date();
  const defaultStart = new Date(now.getTime() + 5 * 60 * 1000); // 5 mins in future
  const defaultEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days in future

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(formatDateForInput(defaultStart));
  const [endsAt, setEndsAt] = useState(formatDateForInput(defaultEnd));
  const [winnersCount, setWinnersCount] = useState(1);
  const [excludeHighRisk, setExcludeHighRisk] = useState(true);

  // Prize State
  const [prizeType, setPrizeType] = useState<PrizeType>("telegram_gift");
  const [prizeTitle, setPrizeTitle] = useState("");
  const [prizeValue, setPrizeValue] = useState("");
  const [prizeCurrency, setPrizeCurrency] = useState("TON");
  const [prizeDesc, setPrizeDesc] = useState("");

  // Channels Requirements State
  const [channels, setChannels] = useState<string[]>([]);
  const [channelInput, setChannelInput] = useState("");

  const addChannel = () => {
    let clean = channelInput.trim();
    if (!clean) return;
    if (!clean.startsWith("@") && !clean.startsWith("-100") && isNaN(Number(clean))) {
      clean = `@${clean}`;
    }
    if (!channels.includes(clean)) {
      setChannels([...channels, clean]);
    }
    setChannelInput("");
  };

  const removeChannel = (idx: number) => {
    setChannels(channels.filter((_, i) => i !== idx));
  };

  const setPresetDuration = (days: number) => {
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setEndsAt(formatDateForInput(end));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a giveaway title");
      return;
    }
    if (!prizeTitle.trim()) {
      setError("Please specify a prize title");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Giveaway draft
      const giveaway = await api<{ id: string }>("/api/giveaways", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          starts_at: new Date(startsAt).toISOString(),
          ends_at: new Date(endsAt).toISOString(),
          winners_count: Number(winnersCount),
          exclude_high_risk: excludeHighRisk,
        }),
      });

      // 2. Set Prize
      await api(`/api/giveaways/${giveaway.id}/prize`, {
        method: "POST",
        body: JSON.stringify({
          type: prizeType,
          title: prizeTitle.trim(),
          description: prizeDesc.trim(),
          estimated_value: prizeValue ? Number(prizeValue) : null,
          currency: prizeCurrency || "TON",
        }),
      });

      // 3. Add Requirements
      for (const ch of channels) {
        await api(`/api/giveaways/${giveaway.id}/requirements`, {
          method: "POST",
          body: JSON.stringify({
            type: "required_channel_subscription",
            config: ch.startsWith("-100") ? { chat_id: ch } : { username: ch.replace(/^@/, "") },
          }),
        });
      }

      hapticNotification("success");
      router.push(`/giveaways/${giveaway.id}`);
    } catch (err: unknown) {
      hapticNotification("error");
      const message = err instanceof Error ? err.message : "Failed to create giveaway";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ maxWidth: "680px" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href="/dashboard" className="muted" style={{ display: "inline-block", marginBottom: "8px" }}>
          ← Back to Dashboard
        </Link>
        <h1>Create Giveaway</h1>
        <p className="muted">Configure terms, prize metadata, channels, and anti-fraud rules.</p>
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
          <div style={{ fontWeight: 600, color: "#f87171", marginBottom: "4px" }}>Error</div>
          <p style={{ color: "#fca5a5", fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Campaign details */}
        <section className="card" style={{ marginBottom: "20px" }}>
          <h2>1. Campaign Details</h2>

          <label>Giveaway Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Plush Pepe NFT Giveaway #42"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label>Description</label>
          <textarea
            placeholder="Explain the giveaway terms and context for participants..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label>Starts At (UTC) *</label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <label>Ends At (UTC) *</label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <span className="muted" style={{ alignSelf: "center", fontSize: "0.8rem" }}>
              Quick presets:
            </span>
            <button type="button" className="button-secondary button-sm" onClick={() => setPresetDuration(1)}>
              +24h
            </button>
            <button type="button" className="button-secondary button-sm" onClick={() => setPresetDuration(3)}>
              +3 days
            </button>
            <button type="button" className="button-secondary button-sm" onClick={() => setPresetDuration(7)}>
              +7 days
            </button>
          </div>

          <label>Winners Count (1 – 100) *</label>
          <input
            type="number"
            min={1}
            max={100}
            required
            value={winnersCount}
            onChange={(e) => setWinnersCount(Math.max(1, Math.min(100, Number(e.target.value))))}
          />
        </section>

        {/* Section 2: Prize details */}
        <section className="card" style={{ marginBottom: "20px" }}>
          <h2>2. Prize Information</h2>

          <label>Prize Type *</label>
          <select value={prizeType} onChange={(e) => setPrizeType(e.target.value as PrizeType)}>
            <option value="telegram_gift">Telegram Gift</option>
            <option value="telegram_collectible">Telegram Collectible</option>
            <option value="ton_nft">TON NFT</option>
            <option value="custom">Custom Prize</option>
          </select>

          <label>Prize Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Plush Pepe #7421"
            value={prizeTitle}
            onChange={(e) => setPrizeTitle(e.target.value)}
          />

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <div>
              <label>Estimated Value</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 72"
                value={prizeValue}
                onChange={(e) => setPrizeValue(e.target.value)}
              />
            </div>
            <div>
              <label>Currency</label>
              <input
                type="text"
                placeholder="TON"
                value={prizeCurrency}
                onChange={(e) => setPrizeCurrency(e.target.value)}
              />
            </div>
          </div>

          <label>Prize Notes / Description</label>
          <input
            type="text"
            placeholder="Optional details about delivery or collectible attributes"
            value={prizeDesc}
            onChange={(e) => setPrizeDesc(e.target.value)}
          />
        </section>

        {/* Section 3: Requirements / Channels */}
        <section className="card" style={{ marginBottom: "20px" }}>
          <h2>3. Channel Subscription Requirements</h2>
          <p className="muted" style={{ marginBottom: "14px" }}>
            Add channels that users must join to qualify. The bot must be an administrator in these channels to verify membership.
          </p>

          <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
            <input
              type="text"
              placeholder="e.g. @channel_username"
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addChannel();
                }
              }}
              style={{ marginBottom: 0 }}
            />
            <button type="button" className="button-secondary" onClick={addChannel}>
              + Add
            </button>
          </div>

          {channels.length === 0 ? (
            <p className="muted" style={{ fontStyle: "italic", fontSize: "0.85rem" }}>
              No channels added yet. (Anyone can participate without subscription requirements)
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {channels.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "8px",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#38bdf8" }}>{ch}</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    style={{ color: "#f87171" }}
                    onClick={() => removeChannel(idx)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Anti-Fraud Rules */}
        <section className="card" style={{ marginBottom: "24px" }}>
          <h2>4. Anti-Fraud &amp; Fairness Rules</h2>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "12px",
              background: "rgba(56, 189, 248, 0.05)",
              borderRadius: "8px",
              border: "1px solid rgba(56, 189, 248, 0.2)",
            }}
          >
            <input
              type="checkbox"
              id="excludeHighRisk"
              checked={excludeHighRisk}
              onChange={(e) => setExcludeHighRisk(e.target.checked)}
              style={{ width: "20px", height: "20px", marginTop: "2px", accentColor: "#38bdf8" }}
            />
            <label htmlFor="excludeHighRisk" style={{ margin: 0, cursor: "pointer", color: "#f1f5f9" }}>
              <div style={{ fontWeight: 700, marginBottom: "2px" }}>
                Exclude HIGH-Risk Participants from Winning Pool
              </div>
              <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
                Accounts that score ≥60 in Anti-Farm evaluation (burst registrations, speed anomalies, duplicate behavioral clusters) will not be eligible for winner selection.
              </p>
            </label>
          </div>
        </section>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <Link href="/dashboard" className="button button-secondary">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}>
            {submitting ? "Creating Draft..." : "Create Draft Giveaway →"}
          </button>
        </div>
      </form>
    </main>
  );
}

function formatDateForInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
