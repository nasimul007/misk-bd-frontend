"use client";

import { useState, type ReactNode } from "react";

/** A footer contact line that copies its value when tapped, with a brief "Copied!" note. */
export function CopyText({ value, label, children }: { value: string; label: string; children: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { void navigator.clipboard?.writeText(value); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" onClick={copy} aria-label={label} style={{ color: "var(--lux-ink-muted)", fontSize: 14, background: "none", border: "none", padding: 0, font: "inherit", textAlign: "left", cursor: "pointer", display: "flex", gap: 10, alignItems: "center" }}>
      {children} <span style={{ fontSize: 11, color: "var(--lux-gold)" }}>{copied ? "Copied!" : "(tap to copy)"}</span>
    </button>
  );
}
