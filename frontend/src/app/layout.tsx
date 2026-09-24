import "./globals.css";
import Script from "next/script";
import { Navbar } from "../components/Navbar";
import { BottomNav } from "../components/BottomNav";
import { I18nProvider } from "../lib/i18n";

export const metadata = {
  title: "GiftGuard — Provably Fair Telegram Giveaways",
  description:
    "Verifiable Telegram Gifts & NFT giveaways with anti-farm protection and reproducible draw proof.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="theme-color" content="#090d16" />
      </head>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js?63" strategy="beforeInteractive" />
        <I18nProvider>
          <div className="app-container">
            <Navbar />
            <div className="content-container">{children}</div>
            <BottomNav />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
