"use client";

import { useSyncExternalStore } from "react";

const KEY = "misk_mode";
type Mode = "night" | "day";

const Sun = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M4.4 4.4l1.4 1.4M18.2 18.2l1.4 1.4M2.5 12h2M19.5 12h2M4.4 19.6l1.4-1.4M18.2 5.8l1.4-1.4" />
  </svg>
);
const Moon = ({ s = 13 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.4 6.4 0 0 0 10.5 10.5z" />
  </svg>
);

// The <body data-lux> attribute is the source of truth, so every toggle stays in sync.
function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.body, { attributes: true, attributeFilter: ["data-lux"] });
  return () => obs.disconnect();
}
const getMode = (): Mode => (document.body.dataset.lux === "day" ? "day" : "night");

/** Day / Night sliding switch. Drives `data-lux` on <body> and remembers the choice. */
export function ModeToggle() {
  const mode = useSyncExternalStore(subscribe, getMode, () => "night" as Mode);

  const change = (next: Mode) => {
    document.body.dataset.lux = next === "day" ? "day" : "oxblood";
    try { localStorage.setItem(KEY, next); } catch {}
  };

  const day = mode === "day";
  const W = 62, H = 30, PAD = 3, KNOB = H - PAD * 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={day}
      aria-label={day ? "Switch to night mode" : "Switch to day mode"}
      onClick={() => change(day ? "night" : "day")}
      className="lux-focus"
      style={{ position: "relative", width: W, height: H, flex: "none", padding: 0, cursor: "pointer", borderRadius: 999, border: "1px solid var(--lux-line)", background: day ? "var(--lux-gold-soft)" : "color-mix(in oklch, var(--lux-bg-3) 60%, transparent)", transition: "background var(--dur-mid) var(--ease-lux)" }}
    >
      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--lux-ink)", opacity: 0.7, display: "inline-flex" }}><Moon s={12} /></span>
      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--lux-gold)", opacity: 0.7, display: "inline-flex" }}><Sun s={12} /></span>
      <span style={{ position: "absolute", top: PAD, left: PAD, width: KNOB, height: KNOB, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", transform: day ? `translateX(${W - KNOB - PAD * 2}px)` : "translateX(0)", transition: "transform var(--dur-mid) var(--ease-lux), background var(--dur-mid) ease", background: day ? "var(--lux-gold)" : "var(--lux-ink)", color: day ? "var(--lux-bg)" : "var(--lux-gold)", boxShadow: "0 2px 8px -2px rgba(0,0,0,0.5)" }}>
        {day ? <Sun s={13} /> : <Moon s={12} />}
      </span>
    </button>
  );
}
