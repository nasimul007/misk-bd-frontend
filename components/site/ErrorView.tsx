"use client";

import Link from "next/link";

/** Shown when something breaks while rendering. Never prints the error itself: it can contain internal details. */
export function ErrorView({ reset, withLogo = false }: { reset: () => void; withLogo?: boolean }) {
  return (
    <div style={{ padding: "72px 24px 96px", textAlign: "center", color: "var(--lux-ink)", minHeight: withLogo ? "100vh" : undefined }}>
      <span className="lux-eyebrow">Something went wrong</span>
      <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3rem)", fontWeight: 500, margin: "14px 0 12px" }}>We hit a problem</h1>
      <p style={{ color: "var(--lux-ink-muted)", maxWidth: 440, margin: "0 auto 28px", lineHeight: 1.7 }}>
        That wasn&apos;t supposed to happen. Please try again. If it keeps happening, message us and we&apos;ll sort it out. Your bag and any orders you placed are safe.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="lux-btn-fill lux-focus">Try again</button>
        <Link href="/" className="lux-btn lux-focus">Back to home</Link>
        <Link href="/track" className="lux-btn lux-focus">Track my order</Link>
      </div>
    </div>
  );
}
