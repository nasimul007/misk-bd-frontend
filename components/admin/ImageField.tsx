"use client";

import Image from "next/image";
import { useRef, useState } from "react";

/** Preview plus upload button. The value is a site path such as /uploads/abc.webp or /images/logo.png. */
export function ImageField({ value, onChange, size = 84, label = "Image" }: { value: string; onChange: (url: string) => void; size?: number; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File | undefined) => {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/admin/upload", { method: "POST", body });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && json.url) onChange(json.url); else setError(json.error ?? "The upload failed.");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="flex flex-col items-start gap-1.5" style={{ width: size + 8 }}>
      <button type="button" aria-label={`${label}: ${value ? "replace" : "upload"}`} onClick={() => input.current?.click()} disabled={busy} className="lux-focus"
        style={{ width: size, height: size, borderRadius: 12, border: "1px dashed var(--lux-line)", background: "var(--lux-bg-3)", overflow: "hidden", cursor: "pointer", position: "relative", padding: 0, color: "var(--lux-ink-muted)", fontSize: 12 }}>
        {value ? <Image src={value} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover" }} unoptimized={value.startsWith("/uploads/")} /> : (busy ? "Uploading…" : "Upload")}
        {value && busy && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", color: "#fff" }}>Uploading…</span>}
      </button>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => upload(e.target.files?.[0])} />
      {error && <span role="alert" style={{ fontSize: 12, color: "var(--lux-warning)", maxWidth: size + 120 }}>{error}</span>}
    </div>
  );
}
