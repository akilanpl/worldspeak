import Link from "next/link";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import SwRegister from "./sw-register";

export const metadata: Metadata = {
  title: "WorldSpeak — essential communication board",
  description: "Local, offline bilingual (English/Tamil) essential communication: point, preview, then speak.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">Skip to communication board</a>
        <SwRegister />
        <div className="app">
          <header className="app-header">
            <div>
              <h1>WorldSpeak</h1>
              <p>Point, preview, then speak — your words, your control.</p>
            </div>
            <nav aria-label="Primary">
              <Link href="/" prefetch={false}>Board</Link> · <Link href="/perception" prefetch={false}>Camera</Link> · <Link href="/video" prefetch={false}>Video</Link>{" "}
              · <a href="/offline">Offline</a> · <a href="/history">History</a>{" "}
              · <a href="/favorites">Favorites</a> · <a href="/settings">Settings</a> ·{" "}
              <a href="/sign-in">Sign in</a>
            </nav>
          </header>
          <main id="main">{children}</main>
          <footer className="app-footer">
            <p className="status">
              Guest/offline board + optional private account · Tamil text review-pending · Speech uses this device&apos;s voices.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
