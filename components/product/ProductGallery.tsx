"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, ZoomIn } from "lucide-react";

/** Main image + thumbnails, with a click-to-zoom lightbox (Esc or backdrop closes). */
export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!zoom) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [zoom]);

  const thumbs = (size: number, outline: (on: boolean) => string, fade: boolean) =>
    images.map((g, n) => (
      <button key={n} type="button" onClick={() => setI(n)} aria-label={`View image ${n + 1} of ${title}`} aria-current={n === i} style={{ position: "relative", width: size, aspectRatio: "1", flex: "none", borderRadius: size > 60 ? 12 : 10, overflow: "hidden", padding: 0, border: "none", cursor: "pointer", outline: outline(n === i), outlineOffset: 2, opacity: fade && n !== i ? 0.55 : 1 }}>
        <Image src={g} alt="" fill sizes={`${size}px`} style={{ objectFit: "cover" }} />
      </button>
    ));

  return (
    <div className="flex flex-col gap-3.5">
      <button type="button" onClick={() => setZoom(true)} aria-label={`Zoom ${title}`} className="glass-card" style={{ position: "relative", aspectRatio: "4/3", borderRadius: 16, overflow: "hidden", padding: 0, border: "1px solid var(--lux-line-soft)", cursor: "zoom-in", display: "block" }}>
        <Image src={images[i]} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 55vw" style={{ objectFit: "cover" }} />
        <span className="inline-flex items-center gap-1.5" style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(20,16,12,0.55)", color: "#F5EEE3", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999, padding: "6px 12px", fontSize: 12, backdropFilter: "blur(8px)" }}><ZoomIn size={13} /> Zoom</span>
      </button>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
        {images.map((g, n) => (
          <button key={n} type="button" onClick={() => setI(n)} aria-label={`View image ${n + 1} of ${title}`} aria-current={n === i} style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", padding: 0, border: "none", cursor: "pointer", outline: n === i ? "2px solid var(--lux-gold)" : "none", outlineOffset: 2, opacity: n === i ? 1 : 0.55 }}>
            <Image src={g} alt="" fill sizes="120px" style={{ objectFit: "cover" }} />
          </button>
        ))}
      </div>

      {zoom && (
        <div role="dialog" aria-modal="true" aria-label={`${title} image`} onClick={() => setZoom(false)} className="flex items-center justify-center" style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(18,14,10,0.86)", padding: 32, cursor: "zoom-out", backdropFilter: "blur(6px)" }}>
          <button type="button" onClick={() => setZoom(false)} aria-label="Close" className="inline-flex items-center justify-center" style={{ position: "absolute", top: 24, right: 24, background: "rgba(255,255,255,0.1)", border: "none", color: "#F5EEE3", borderRadius: "50%", width: 44, height: 44, cursor: "pointer" }}><X size={22} /></button>
          <div style={{ position: "relative", width: "min(1000px, 92vw)", height: "86vh" }} onClick={(e) => e.stopPropagation()}>
            <Image src={images[i]} alt={title} fill sizes="92vw" style={{ objectFit: "contain" }} />
          </div>
          <div className="flex gap-2.5" style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)" }} onClick={(e) => e.stopPropagation()}>
            {thumbs(54, (on) => (on ? "2px solid var(--lux-gold)" : "1px solid rgba(255,255,255,0.25)"), false)}
          </div>
        </div>
      )}
    </div>
  );
}
