import { Star } from "lucide-react";
import type { ReviewView } from "@/lib/data";

/** Read-only star row (aria-hidden; the number next to it carries the meaning). */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const on = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" style={{ color: "var(--lux-gold)" }} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={size} fill={i < on ? "currentColor" : "none"} />)}
    </span>
  );
}

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });

/** Verified-buyer reviews for a product. Only people with a delivered order can write one, so every entry is a real purchase. */
export function Reviews({ reviews, average, count }: { reviews: ReviewView[]; average: number; count: number }) {
  return (
    <section id="reviews" aria-labelledby="reviews-h" style={{ marginTop: 56, maxWidth: 820 }}>
      <h2 id="reviews-h" className="font-display" style={{ fontSize: 24, fontWeight: 500, color: "var(--lux-ink)", margin: "0 0 6px" }}>Reviews</h2>
      {count === 0 ? (
        <p style={{ color: "var(--lux-ink-muted)", fontSize: 15, margin: 0 }}>No reviews yet. After your order is delivered you can rate it from your order page.</p>
      ) : (
        <>
          <div className="flex items-center gap-2.5" style={{ color: "var(--lux-ink-muted)", fontSize: 15, marginBottom: 18 }}>
            <Stars value={average} size={18} /> <strong style={{ color: "var(--lux-ink)" }}>{average.toFixed(1)}</strong> out of 5 &middot; {count} review{count === 1 ? "" : "s"}
          </div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {reviews.map((r) => (
              <li key={r.id} className="lux-surface" style={{ borderRadius: 14, padding: "16px 18px" }}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars value={r.rating} />
                  <span className="sr-only">{r.rating} out of 5 stars</span>
                  <strong style={{ fontSize: 14 }}>{r.author}</strong>
                  <span style={{ fontSize: 12, color: "var(--lux-gold)" }}>Verified buyer</span>
                  <span style={{ fontSize: 12.5, color: "var(--lux-ink-muted)" }}>{date(r.at)}</span>
                </div>
                {r.comment && <p style={{ margin: "8px 0 0", fontSize: 14.5, lineHeight: 1.7, color: "var(--lux-ink-muted)" }}>{r.comment}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
