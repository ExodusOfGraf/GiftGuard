"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "../lib/i18n";
import { hapticImpact } from "../lib/telegram";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  const handleNavClick = () => {
    hapticImpact("light");
  };

  return (
    <nav className="bottom-nav" aria-label="Mobile Navigation">
      <Link
        href="/"
        className={`bottom-nav-item ${pathname === "/" ? "active" : ""}`}
        onClick={handleNavClick}
      >
        <span className="bottom-nav-icon">🛡️</span>
        <span className="bottom-nav-label">{t.navHome}</span>
      </Link>

      <Link
        href="/dashboard"
        className={`bottom-nav-item ${pathname === "/dashboard" ? "active" : ""}`}
        onClick={handleNavClick}
      >
        <span className="bottom-nav-icon">📋</span>
        <span className="bottom-nav-label">{t.navDashboard}</span>
      </Link>

      <Link
        href="/giveaways/new"
        className={`bottom-nav-item ${pathname === "/giveaways/new" ? "active" : ""}`}
        onClick={handleNavClick}
      >
        <span className="bottom-nav-icon">➕</span>
        <span className="bottom-nav-label">{t.navCreate}</span>
      </Link>
    </nav>
  );
}
