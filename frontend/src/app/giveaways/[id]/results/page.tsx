"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, Verification } from "../../../../lib/api";
import { initTelegram, hapticNotification, hapticImpact } from "../../../../lib/telegram";

export default function ResultsPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const loadVerification = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api<Verification>(`/api/public/giveaways/${id}/verification`);
      setData(res);
      setVerificationResult(res.verified);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification data not available";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initTelegram();
    loadVerification();
  }, [id]);

  const handleVerify = async () => {
    setVerifying(true);
    hapticImpact("medium");
    try {
      const res = await api<{ giveaway_id: string; verified: boolean }>(
        `/api/public/giveaways/${id}/verify`,
        { method: "POST" }
      );
      setVerificationResult(res.verified);
      if (res.verified) {
        hapticNotification("success");
      } else {
        hapticNotification("error");
      }
    } catch (err: unknown) {
      hapticNotification("error");
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
    } finally {
      setVerifying(false);
    }
  };

  const copyToClipboard = (fieldName: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    hapticImpact("light");
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <main style={{ maxWidth: "780px" }}>
      <div style={{ marginBottom: "20px" }}>
        <Link href={`/giveaways/${id}`} className="muted" style={{ display: "inline-block", marginBottom: "8px" }}>
          ← Back to Giveaway
        </Link>
        <h1>Provably Fair Results</h1>
        <p className="muted">
          Public mathematical verification manifest for winner selection using cryptographic commitments.
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

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <p>Loading cryptographic manifest...</p>
        </div>
      ) : !data ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          <h2>Manifest Not Available</h2>
          <p className="muted">This giveaway may not have a published draw record yet.</p>
        </div>
      ) : (
        <>
          {/* Winners Section */}
          <section className="card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2>🏆 Winning Participants</h2>
              <span className="badge badge-completed">
                {data.winners.length} {data.winners.length === 1 ? "Winner Selected" : "Winners Selected"}
              </span>
            </div>

            {data.winners.length === 0 ? (
              <p className="muted" style={{ fontStyle: "italic", padding: "12px 0" }}>
                Draw is pending or completed with zero eligible participants.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {data.winners.map((w) => (
                  <div
                    key={w.position}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 18px",
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.25)",
                      borderRadius: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 800,
                          color: "#34d399",
                          minWidth: "32px",
                        }}
                      >
                        #{w.position}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                          Telegram ID: {w.telegram_id}
                        </div>
                        <div className="muted" style={{ fontSize: "0.78rem" }}>
                          Ticket: {w.participation_id}
                        </div>
                      </div>
                    </div>

                    <span className="badge badge-completed" style={{ fontSize: "0.7rem" }}>
                      WINNER ✓
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Verification Status & Interactive Verifier */}
          <section className="card" style={{ marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2>Fair Draw Verification</h2>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  Algorithm: <code>{data.algorithm}</code> • Eligible Pool: {data.participants_count} tickets
                </p>
              </div>

              <button
                type="button"
                className="button-success"
                disabled={verifying}
                onClick={handleVerify}
              >
                {verifying ? "Checking Hashes..." : "🔄 Verify Draw Math"}
              </button>
            </div>

            {/* Verification State Banner */}
            <div
              style={{
                padding: "14px 18px",
                borderRadius: "10px",
                background:
                  verificationResult === true
                    ? "rgba(16, 185, 129, 0.15)"
                    : verificationResult === false
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(245, 158, 11, 0.15)",
                border: `1px solid ${
                  verificationResult === true
                    ? "rgba(16, 185, 129, 0.4)"
                    : verificationResult === false
                    ? "rgba(239, 68, 68, 0.4)"
                    : "rgba(245, 158, 11, 0.4)"
                }`,
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "1.6rem" }}>
                {verificationResult === true ? "✅" : verificationResult === false ? "❌" : "⏳"}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  {verificationResult === true
                    ? "Cryptographically Valid (Fair & Authentic)"
                    : verificationResult === false
                    ? "Verification Mismatch Detected"
                    : "Draw Pending Completion"}
                </div>
                <p className="muted" style={{ fontSize: "0.82rem", color: "#e2e8f0" }}>
                  {verificationResult === true
                    ? "All pre-commitments, snapshot hashes, entropy inputs, and winner selections match the deterministic protocol."
                    : "The revealed seed or draw outputs do not align with the committed proof."}
                </p>
              </div>
            </div>

            {/* 4-Step Verification Checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>Pre-commitment hash published prior to draw execution</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>Participant tickets canonicalized &amp; frozen in snapshot hash</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>Final seed derived from SHA-256(secret_seed + snapshot + entropy)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "0.9rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>HMAC-SHA256 rejection sampling eliminates modulo bias</span>
              </div>
            </div>

            {/* Cryptographic Manifest Hashes */}
            <h3 style={{ marginBottom: "12px" }}>Cryptographic Hashes</h3>

            {/* Commitment Hash */}
            <div className="hash-box">
              <div className="hash-box-label">
                <span>Commitment Hash = SHA256(secret_seed)</span>
                <button
                  type="button"
                  className="button-secondary button-sm"
                  onClick={() => copyToClipboard("commitment", data.commitment_hash)}
                >
                  {copiedField === "commitment" ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="hash-value">{data.commitment_hash}</div>
            </div>

            {/* Participant Snapshot Hash */}
            {data.participant_snapshot_hash && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>Participant Snapshot Hash</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("snapshot", data.participant_snapshot_hash || "")}
                  >
                    {copiedField === "snapshot" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="hash-value">{data.participant_snapshot_hash}</div>
              </div>
            )}

            {/* External Entropy */}
            {data.external_entropy && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>External Entropy ({data.entropy_provider || "provider"})</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("entropy", data.external_entropy || "")}
                  >
                    {copiedField === "entropy" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="hash-value">{data.external_entropy}</div>
              </div>
            )}

            {/* Revealed Secret Seed */}
            {data.secret_seed && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>Revealed Secret Seed</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("secret", data.secret_seed || "")}
                  >
                    {copiedField === "secret" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="hash-value">{data.secret_seed}</div>
              </div>
            )}

            {/* Final Derived Seed */}
            {data.final_seed && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>Final Seed = SHA256(Secret + Snapshot + Entropy)</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("final", data.final_seed || "")}
                  >
                    {copiedField === "final" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="hash-value">{data.final_seed}</div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
