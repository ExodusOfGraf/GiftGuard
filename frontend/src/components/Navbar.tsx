"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getTelegram,
  TelegramUser,
  hapticImpact,
  getEffectiveUser,
  getEffectiveInitData,
  waitForTelegram,
} from "../lib/telegram";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useI18n } from "../lib/i18n";

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const sync = () => {
      const u = getEffectiveUser();
      const initData = getEffectiveInitData();
      if (u) {
        setUser(u);
        setIsTelegram(true);
      } else if (initData || getTelegram()) {
        setIsTelegram(true);
      }
    };

    sync();
    waitForTelegram(800).then(() => {
      sync();
    });
  }, []);

  return (
    <header className="app-header">
      <div className="header-inner">
        <Link
          href="/"
          className="nav-brand"
          onClick={() => hapticImpact("light")}
        >
          <span className="brand-icon">🛡️</span>
          <span className="brand-text">GiftGuard</span>
        </Link>

        {/* Desktop links */}
        <div className="desktop-links">
          <Link
            href="/dashboard"
            className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
            onClick={() => hapticImpact("light")}
          >
            {t.navDashboard}
          </Link>
          <Link
            href="/giveaways/new"
            className={`nav-link ${pathname === "/giveaways/new" ? "active" : ""}`}
            onClick={() => hapticImpact("light")}
          >
            {t.navCreate}
          </Link>
        </div>

        {/* Right side controls: User badge & Language Switcher */}
        <div className="header-right">
          <LanguageSwitcher />

          {isTelegram ? (
            <span className="user-badge tg-badge" title="Telegram User">
              {user?.username ? `@${user.username}` : user ? user.first_name : "TG"}
            </span>
          ) : (
            <span className="user-badge web-badge" title="Web Mode">
              {t.navWebUser}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
