"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [lookupId, setLookupId] = useState("");

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = lookupId.trim();
    if (clean) {
      router.push(`/giveaways/${clean}/results`);
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section style={{ textAlign: "center", padding: "40px 10px 30px" }}>
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
            fontSize: "0.85rem",
            fontWeight: 700,
            marginBottom: "18px",
          }}
        >
          🛡️ Cloudflare for Telegram Giveaways
        </div>

        <h1 style={{ fontSize: "2.4rem", maxWidth: "700px", margin: "0 auto 16px" }}>
          Verifiable Telegram Gifts &amp; NFT Giveaways
        </h1>

        <p style={{ maxWidth: "600px", margin: "0 auto 28px", fontSize: "1.1rem" }}>
          Protect expensive gift campaigns from multi-account farms, ensure provably fair winner selection, and analyze real user quality.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="button" href="/dashboard" style={{ padding: "12px 24px", fontSize: "1rem" }}>
            Organizer Dashboard →
          </Link>
          <Link
            className="button button-secondary"
            href="/giveaways/new"
            style={{ padding: "12px 20px", fontSize: "1rem" }}
          >
            + Create Giveaway
          </Link>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <div className="grid" style={{ margin: "40px 0 30px" }}>
        <div className="card">
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🤖</div>
          <h2>Anti-Farm Protection</h2>
          <p>
            Rule-based behavioral engine assigns each participant an explainable risk score (0–100) analyzing registration bursts, speed anomalies, and duplicate patterns.
          </p>
        </div>

        <div className="card">
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎲</div>
          <h2>Provably Fair Draw</h2>
          <p>
            Cryptographic commitment-reveal protocol (SHA-256, frozen participant snapshots, HMAC-SHA256 rejection sampling). Anyone can verify the exact draw result.
          </p>
        </div>

        <div className="card">
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🎁</div>
          <h2>Prize Transparency</h2>
          <p>
            Verifiable metadata for Telegram Gifts, collectible NFTs, and TON assets. Know what you are giving away and who received it.
          </p>
        </div>
      </div>

      {/* Quick Verifier Lookup Card */}
      <section className="card" style={{ maxWidth: "680px", margin: "20px auto 0" }}>
        <h3>Verify Any Giveaway Result</h3>
        <p className="muted" style={{ marginBottom: "14px" }}>
          Enter a Giveaway UUID to inspect its cryptographic manifest, participant snapshot hash, and deterministic winner selection.
        </p>
        <form onSubmit={handleLookup} style={{ display: "flex", gap: "10px", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "260px" }}>
            <input
              type="text"
              placeholder="e.g. 8f31d044-8848-43f9-..."
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              style={{ marginBottom: 0 }}
              required
            />
          </div>
          <button type="submit">Verify Draw →</button>
        </form>
      </section>
    </main>
  );
}
