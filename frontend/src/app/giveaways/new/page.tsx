"use client";

import React, { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, PrizeType } from "../../../lib/api";
import { hapticNotification, hapticImpact } from "../../../lib/telegram";
import { useI18n } from "../../../lib/i18n";

export default function NewGiveaway() {
  const router = useRouter();
  const { t, locale } = useI18n();
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
  const [selectedDurationDays, setSelectedDurationDays] = useState<number | "custom">(3);
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
      hapticImpact("light");
    }
    setChannelInput("");
  };

  const removeChannel = (idx: number) => {
    hapticImpact("light");
    setChannels(channels.filter((_, i) => i !== idx));
  };

  const handleSelectDuration = (days: number | "custom") => {
    hapticImpact("light");
    setSelectedDurationDays(days);
    if (days !== "custom") {
      const start = new Date(startsAt);
      const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      setEndsAt(formatDateForInput(end));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError(t.createErrTitle);
      return;
    }
    if (!prizeTitle.trim()) {
      setError(t.createErrPrize);
      return;
    }

    setSubmitting(true);
    setError(null);
    hapticImpact("medium");

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
      <div style={{ marginBottom: "16px" }}>
        <Link
          href="/dashboard"
          className="muted"
          onClick={() => hapticImpact("light")}
          style={{ display: "inline-block", marginBottom: "6px" }}
        >
          {t.gwBackDashboard}
        </Link>
        <h1>{t.createTitle}</h1>
        <p className="muted">{t.createSubtitle}</p>
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
          <p style={{ color: "#fca5a5", fontSize: "0.9rem" }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Campaign details */}
        <section className="card" style={{ marginBottom: "16px" }}>
          <h2>{t.createSec1Title}</h2>

          <div className="form-group">
            <label>{t.createFieldTitle}</label>
            <input
              type="text"
              required
              placeholder={t.createFieldTitlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t.createFieldDesc}</label>
            <textarea
              placeholder={t.createFieldDescPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Quick Duration Selector Pills */}
          <div className="form-group">
            <label>{locale === "ru" ? "Длительность розыгрыша" : "Giveaway Duration"}</label>
            <div className="segmented-grid segmented-grid-4">
              <div
                className={`segmented-item ${selectedDurationDays === 1 ? "active" : ""}`}
                onClick={() => handleSelectDuration(1)}
              >
                <span className="segmented-icon">⚡</span>
                <span>{locale === "ru" ? "24 часа" : "24 Hours"}</span>
              </div>
              <div
                className={`segmented-item ${selectedDurationDays === 3 ? "active" : ""}`}
                onClick={() => handleSelectDuration(3)}
              >
                <span className="segmented-icon">🗓️</span>
                <span>{locale === "ru" ? "3 дня" : "3 Days"}</span>
              </div>
              <div
                className={`segmented-item ${selectedDurationDays === 7 ? "active" : ""}`}
                onClick={() => handleSelectDuration(7)}
              >
                <span className="segmented-icon">📅</span>
                <span>{locale === "ru" ? "7 дней" : "7 Days"}</span>
              </div>
              <div
                className={`segmented-item ${selectedDurationDays === "custom" ? "active" : ""}`}
                onClick={() => handleSelectDuration("custom")}
              >
                <span className="segmented-icon">⚙️</span>
                <span>{locale === "ru" ? "Вручную" : "Custom"}</span>
              </div>
            </div>
          </div>

          {/* Date inputs (responsive row that cleanly stacks on phone) */}
          <div className="form-row form-row-2">
            <div className="form-group">
              <label>{t.createFieldStartsAt}</label>
              <input
                type="datetime-local"
                required
                value={startsAt}
                onChange={(e) => {
                  setStartsAt(e.target.value);
                  setSelectedDurationDays("custom");
                }}
              />
            </div>
            <div className="form-group">
              <label>{t.createFieldEndsAt}</label>
              <input
                type="datetime-local"
                required
                value={endsAt}
                onChange={(e) => {
                  setEndsAt(e.target.value);
                  setSelectedDurationDays("custom");
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t.createFieldWinners}</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={100}
              required
              value={winnersCount}
              onChange={(e) => setWinnersCount(Math.max(1, Math.min(100, Number(e.target.value))))}
            />
          </div>
        </section>

        {/* Section 2: Prize details */}
        <section className="card" style={{ marginBottom: "16px" }}>
          <h2>{t.createSec2Title}</h2>

          <div className="form-group">
            <label>{t.createFieldPrizeType}</label>
            <div className="segmented-grid segmented-grid-4">
              <div
                className={`segmented-item ${prizeType === "telegram_gift" ? "active" : ""}`}
                onClick={() => {
                  hapticImpact("light");
                  setPrizeType("telegram_gift");
                }}
              >
                <span className="segmented-icon">🎁</span>
                <span>TG Gift</span>
              </div>
              <div
                className={`segmented-item ${prizeType === "telegram_collectible" ? "active" : ""}`}
                onClick={() => {
                  hapticImpact("light");
                  setPrizeType("telegram_collectible");
                }}
              >
                <span className="segmented-icon">🌟</span>
                <span>Collectible</span>
              </div>
              <div
                className={`segmented-item ${prizeType === "ton_nft" ? "active" : ""}`}
                onClick={() => {
                  hapticImpact("light");
                  setPrizeType("ton_nft");
                }}
              >
                <span className="segmented-icon">🖼️</span>
                <span>TON NFT</span>
              </div>
              <div
                className={`segmented-item ${prizeType === "custom" ? "active" : ""}`}
                onClick={() => {
                  hapticImpact("light");
                  setPrizeType("custom");
                }}
              >
                <span className="segmented-icon">🎯</span>
                <span>{locale === "ru" ? "Свой приз" : "Custom"}</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>{t.createFieldPrizeTitle}</label>
            <input
              type="text"
              required
              placeholder={t.createFieldPrizeTitlePlaceholder}
              value={prizeTitle}
              onChange={(e) => setPrizeTitle(e.target.value)}
            />
          </div>

          <div className="form-row form-row-prize">
            <div className="form-group">
              <label>{t.createFieldPrizeValue}</label>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="e.g. 72"
                value={prizeValue}
                onChange={(e) => setPrizeValue(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t.createFieldPrizeCurrency}</label>
              <input
                type="text"
                placeholder="TON"
                value={prizeCurrency}
                onChange={(e) => setPrizeCurrency(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>{t.createFieldPrizeNotes}</label>
            <input
              type="text"
              placeholder={t.createFieldPrizeNotesPlaceholder}
              value={prizeDesc}
              onChange={(e) => setPrizeDesc(e.target.value)}
            />
          </div>
        </section>

        {/* Section 3: Requirements / Channels */}
        <section className="card" style={{ marginBottom: "16px" }}>
          <h2>{t.createSec3Title}</h2>
          <p className="muted" style={{ marginBottom: "12px", fontSize: "0.85rem" }}>
            {t.createSec3Desc}
          </p>

          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "stretch" }}>
            <input
              type="text"
              placeholder={t.createFieldChannelPlaceholder}
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addChannel();
                }
              }}
              style={{ marginBottom: 0, flex: 1 }}
            />
            <button
              type="button"
              className="button-secondary"
              onClick={addChannel}
              style={{ whiteSpace: "nowrap", minHeight: "46px" }}
            >
              {t.createBtnAddChannel}
            </button>
          </div>

          {channels.length === 0 ? (
            <p className="muted" style={{ fontStyle: "italic", fontSize: "0.82rem" }}>
              {t.createNoChannels}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {channels.map((ch, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    background: "rgba(0,0,0,0.25)",
                    borderRadius: "8px",
                  }}
                >
                  <span style={{ fontWeight: 600, color: "#38bdf8", fontSize: "0.9rem" }}>{ch}</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    style={{ color: "#f87171", padding: "4px 10px", minHeight: "32px" }}
                    onClick={() => removeChannel(idx)}
                  >
                    {t.createBtnRemove}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 4: Anti-Fraud Rules (Modern Telegram Toggle Switch) */}
        <section className="card" style={{ marginBottom: "20px" }}>
          <h2>{t.createSec4Title}</h2>

          <div
            className="switch-container"
            onClick={() => {
              hapticImpact("light");
              setExcludeHighRisk(!excludeHighRisk);
            }}
          >
            <div className="switch-label-group">
              <span className="switch-title">{t.createExcludeHighRiskLabel}</span>
              <span className="switch-desc">{t.createExcludeHighRiskDesc}</span>
            </div>
            <div className={`switch-track ${excludeHighRisk ? "active" : ""}`}>
              <div className="switch-thumb" />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button type="submit" className="button button-full" disabled={submitting}>
            {submitting ? t.createBtnSubmitting : t.createBtnSubmit}
          </button>
          <Link
            href="/dashboard"
            className="button button-secondary button-full"
            onClick={() => hapticImpact("light")}
          >
            {t.btnCancel}
          </Link>
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
