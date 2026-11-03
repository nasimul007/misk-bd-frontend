"use client";

// The last resort: even the root layout failed, so this brings its own <html> and plain styles.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#140d0a", color: "#f3ebdd", fontFamily: "system-ui, sans-serif", minHeight: "100vh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
        <div>
          <h1 style={{ fontWeight: 500, letterSpacing: "0.04em" }}>MISK BD</h1>
          <p style={{ opacity: 0.8, maxWidth: 380, margin: "12px auto 24px", lineHeight: 1.6 }}>Something went wrong on our side. Please try again in a moment.</p>
          <button type="button" onClick={reset} style={{ padding: "12px 28px", borderRadius: 999, border: "1px solid #c9a25a", background: "#c9a25a", color: "#140d0a", fontSize: 15, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
