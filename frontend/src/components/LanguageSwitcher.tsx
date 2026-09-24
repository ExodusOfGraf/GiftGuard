"use client";

import React from "react";
import { useI18n, Locale } from "../lib/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "rgba(255, 255, 255, 0.08)",
        borderRadius: "9999px",
        padding: "3px",
        border: "1px solid rgba(148, 163, 184, 0.2)",
      }}
    >
      <button
        type="button"
        onClick={() => setLocale("ru")}
        style={{
          border: "none",
          background: locale === "ru" ? "var(--accent)" : "transparent",
          color: locale === "ru" ? "#ffffff" : "var(--text-secondary)",
          padding: "4px 9px",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.15s ease",
          minHeight: "unset",
          lineHeight: 1,
        }}
        aria-label="Переключить на русский"
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        style={{
          border: "none",
          background: locale === "en" ? "var(--accent)" : "transparent",
          color: locale === "en" ? "#ffffff" : "var(--text-secondary)",
          padding: "4px 9px",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 700,
          cursor: "pointer",
          transition: "all 0.15s ease",
          minHeight: "unset",
          lineHeight: 1,
        }}
        aria-label="Switch to English"
      >
        EN
      </button>
    </div>
  );
}
