import "./globals.css";
import Script from "next/script";
import { Navbar } from "../components/Navbar";

export const metadata = {
  title: "GiftGuard — Provably Fair Telegram Giveaways",
  description: "Verifiable Telegram Gifts & NFT giveaways with anti-farm protection and reproducible draw proof.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <Script src="https://telegram.org/js/telegram-web-app.js?63" strategy="beforeInteractive" />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
