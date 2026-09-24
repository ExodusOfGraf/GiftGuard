"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTelegram, TelegramUser } from "../lib/telegram";

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    const tg = getTelegram();
    if (tg?.initDataUnsafe?.user) {
      setUser(tg.initDataUnsafe.user);
      setIsTelegram(true);
    } else if (tg?.initData) {
      setIsTelegram(true);
    }
  }, []);

  return (
    <nav>
      <Link href="/" className="nav-brand">
        <span style={{ fontSize: "1.3rem" }}>🛡️</span>
        <span>GiftGuard</span>
      </Link>

      <div className="nav-links">
        <Link
          href="/dashboard"
          className={`nav-link ${pathname === "/dashboard" ? "active" : ""}`}
        >
          Dashboard
        </Link>
        <Link
          href="/giveaways/new"
          className={`nav-link ${pathname === "/giveaways/new" ? "active" : ""}`}
        >
          + Create
        </Link>

        {isTelegram ? (
          <span
            style={{
              fontSize: "0.8rem",
              padding: "4px 8px",
              borderRadius: "6px",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              fontWeight: 600,
            }}
          >
            {user?.username ? `@${user.username}` : user ? user.first_name : "Telegram"}
          </span>
        ) : (
          <span
            style={{
              fontSize: "0.75rem",
              padding: "3px 8px",
              borderRadius: "6px",
              background: "rgba(148, 163, 184, 0.1)",
              color: "#94a3b8",
            }}
          >
            Web
          </span>
        )}
      </div>
    </nav>
  );
}
