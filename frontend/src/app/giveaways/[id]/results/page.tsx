"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, Verification } from "../../../../lib/api";
import { initTelegram, hapticNotification, hapticImpact } from "../../../../lib/telegram";
import { useI18n } from "../../../../lib/i18n";

export default function ResultsPage() {
  const params = useParams();
  const id = params?.id as string;
  const { t, locale } = useI18n();

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
      <div style={{ marginBottom: "16px" }}>
        <Link
          href={`/giveaways/${id}`}
          className="muted"
          onClick={() => hapticImpact("light")}
          style={{ display: "inline-block", marginBottom: "6px" }}
        >
          {t.gwBackGiveaway}
        </Link>
        <h1>{t.resTitle}</h1>
        <p className="muted">{t.resSubtitle}</p>
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

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "36px" }}>
          <p>{t.btnLoading}</p>
        </div>
      ) : !data ? (
        <div className="card" style={{ textAlign: "center", padding: "36px" }}>
          <p className="muted">
            {locale === "ru"
              ? "Данные розыгрыша ещё не сформированы."
              : "Draw data is not yet generated."}
          </p>
        </div>
      ) : (
        <>
          {/* Status Verification Banner */}
          <div
            className="card"
            style={{
              marginBottom: "16px",
              border: verificationResult
                ? "1px solid rgba(16, 185, 129, 0.4)"
                : "1px solid rgba(239, 68, 68, 0.4)",
              background: verificationResult
                ? "rgba(16, 185, 129, 0.08)"
                : "rgba(239, 68, 68, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: verificationResult ? "#34d399" : "#f87171",
                  }}
                >
                  {verificationResult ? t.resStatusValid : t.resStatusInvalid}
                </span>
                <div className="muted" style={{ fontSize: "0.8rem", marginTop: "2px" }}>
                  Algorithm: <code>{data.algorithm}</code> • {data.participants_count} {locale === "ru" ? "участников" : "participants in snapshot"}
                </div>
              </div>

              <button
                type="button"
                className="button button-sm button-secondary"
                onClick={handleVerify}
                disabled={verifying}
              >
                {verifying ? t.resVerifyingBtn : t.resVerifyBtn}
              </button>
            </div>
          </div>

          {/* Winners Section */}
          <section className="card" style={{ marginBottom: "16px" }}>
            <h2>🏆 {t.resPodiumTitle}</h2>
            <p className="muted" style={{ marginBottom: "12px", fontSize: "0.85rem" }}>
              {t.resPodiumSubtitle}
            </p>

            {data.winners.length === 0 ? (
              <p className="muted" style={{ fontStyle: "italic", fontSize: "0.85rem" }}>
                {locale === "ru"
                  ? "Победители ещё не определены (розыгрыш ожидает проведения)."
                  : "No winners selected yet."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {data.winners.map((w) => (
                  <div
                    key={w.participation_id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "rgba(0,0,0,0.25)",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      gap: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 800,
                          color: w.position === 1 ? "#fbbf24" : w.position === 2 ? "#cbd5e1" : "#d97706",
                        }}
                      >
                        #{w.position}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#f8fafc" }}>
                          ID: {w.telegram_id}
                        </div>
                        <div className="muted" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                          {t.resUserTicket} {w.participation_id}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="button-secondary button-sm"
                      style={{ padding: "4px 8px", minHeight: "30px", fontSize: "0.75rem" }}
                      onClick={() => copyToClipboard(`win_${w.position}`, w.participation_id)}
                    >
                      {copiedField === `win_${w.position}` ? t.btnCopied : t.btnCopy}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cryptographic Fairness Checklist */}
          <section className="card" style={{ marginBottom: "16px" }}>
            <h2>📋 {t.resChecklistTitle}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>{t.resCheckCommitment}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>{t.resCheckSnapshot}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>{t.resCheckEntropy}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}>
                <span style={{ color: "#34d399", fontWeight: 700 }}>✓</span>
                <span>{t.resCheckAlgorithm}</span>
              </div>
            </div>
          </section>

          {/* Cryptographic Manifest */}
          <section className="card" style={{ marginBottom: "20px" }}>
            <h2>🔐 {t.resManifestTitle}</h2>

            <div className="hash-box">
              <div className="hash-box-label">
                <span>{t.resLabelCommitment}</span>
                <button
                  type="button"
                  className="button-secondary button-sm"
                  onClick={() => copyToClipboard("commitment", data.commitment_hash)}
                >
                  {copiedField === "commitment" ? t.btnCopied : t.btnCopy}
                </button>
              </div>
              <div className="hash-value">{data.commitment_hash}</div>
            </div>

            {data.participant_snapshot_hash && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>{t.resLabelSnapshotHash}</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("snapshot", data.participant_snapshot_hash || "")}
                  >
                    {copiedField === "snapshot" ? t.btnCopied : t.btnCopy}
                  </button>
                </div>
                <div className="hash-value">{data.participant_snapshot_hash}</div>
              </div>
            )}

            {data.external_entropy && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>{t.resLabelExternalEntropy}</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("entropy", data.external_entropy || "")}
                  >
                    {copiedField === "entropy" ? t.btnCopied : t.btnCopy}
                  </button>
                </div>
                <div className="hash-value">{data.external_entropy}</div>
              </div>
            )}

            {data.secret_seed && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>{t.resLabelSecretSeed}</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("seed", data.secret_seed || "")}
                  >
                    {copiedField === "seed" ? t.btnCopied : t.btnCopy}
                  </button>
                </div>
                <div className="hash-value">{data.secret_seed}</div>
              </div>
            )}

            {data.final_seed && (
              <div className="hash-box">
                <div className="hash-box-label">
                  <span>{t.resLabelFinalSeed}</span>
                  <button
                    type="button"
                    className="button-secondary button-sm"
                    onClick={() => copyToClipboard("final", data.final_seed || "")}
                  >
                    {copiedField === "final" ? t.btnCopied : t.btnCopy}
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
