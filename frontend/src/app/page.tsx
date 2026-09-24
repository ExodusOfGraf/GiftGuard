"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useI18n } from "../lib/i18n";
import { hapticImpact } from "../lib/telegram";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const [lookupId, setLookupId] = useState("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupId.trim();
    if (clean) {
      hapticImpact("medium");
      router.push(`/giveaways/${clean}/results`);
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section style={{ textAlign: "center", padding: "28px 4px 20px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 14px",
            borderRadius: "9999px",
            background: "rgba(56, 189, 248, 0.1)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            color: "#38bdf8",
            fontSize: "0.82rem",
            fontWeight: 700,
            marginBottom: "14px",
          }}
        >
          {t.heroBadge}
        </div>

        <h1 style={{ maxWidth: "700px", margin: "0 auto 12px" }}>
          {t.heroTitle}
        </h1>

        <p style={{ maxWidth: "560px", margin: "0 auto 24px", fontSize: "1rem" }}>
          {t.heroSubtitle}
        </p>

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexDirection: "column" }}>
          <Link
            className="button button-full"
            href="/dashboard"
            onClick={() => hapticImpact("light")}
            style={{ fontSize: "1rem" }}
          >
            {t.heroBtnDashboard}
          </Link>
          <Link
            className="button button-secondary button-full"
            href="/giveaways/new"
            onClick={() => hapticImpact("light")}
            style={{ fontSize: "0.95rem" }}
          >
            {t.heroBtnCreate}
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <div className="grid" style={{ margin: "24px 0" }}>
        <div className="card">
          <div style={{ fontSize: "1.75rem", marginBottom: "8px" }}>🤖</div>
          <h2>{t.featureAntiFarmTitle}</h2>
          <p style={{ fontSize: "0.9rem" }}>{t.featureAntiFarmDesc}</p>
        </div>

        <div className="card">
          <div style={{ fontSize: "1.75rem", marginBottom: "8px" }}>🎲</div>
          <h2>{t.featureDrawTitle}</h2>
          <p style={{ fontSize: "0.9rem" }}>{t.featureDrawDesc}</p>
        </div>

        <div className="card">
          <div style={{ fontSize: "1.75rem", marginBottom: "8px" }}>🎁</div>
          <h2>{t.featurePrizeTitle}</h2>
          <p style={{ fontSize: "0.9rem" }}>{t.featurePrizeDesc}</p>
        </div>
      </div>

      {/* Quick Verifier Lookup Card */}
      <section className="card" style={{ margin: "16px auto 0" }}>
        <h3>{t.verifierCardTitle}</h3>
        <p className="muted" style={{ marginBottom: "12px", fontSize: "0.85rem" }}>
          {t.verifierCardDesc}
        </p>
        <form onSubmit={handleLookup} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input
            type="text"
            placeholder={t.verifierPlaceholder}
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            style={{ marginBottom: 0 }}
            required
          />
          <button type="submit" className="button button-full">
            {t.verifierBtnSubmit}
          </button>
        </form>
      </section>
    </main>
  );
}
