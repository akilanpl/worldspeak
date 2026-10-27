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
              <Link href="/" prefetch={false} className="nav-link">Board</Link> · <Link href="/perception" prefetch={false} className="nav-link">Camera</Link> · <Link href="/video" prefetch={false} className="nav-link">Video</Link>{" "}
              · <a href="/offline" className="nav-link">Offline</a> · <a href="/history" className="nav-link">History</a>{" "}
              · <a href="/favorites" className="nav-link">Favorites</a> · <a href="/settings" className="nav-link">Settings</a> ·{" "}
              <a href="/sign-in" className="nav-link">Sign in</a>
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
