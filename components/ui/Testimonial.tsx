import type { Testimonial as T } from "@/lib/types";

const Star = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--lux-gold)" aria-hidden>
    <path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2z" />
  </svg>
);

/** Serif italic quote card with gold stars and an initial avatar. */
export function Testimonial({ quote, name, location, rating = 5 }: T) {
  return (
    <figure className="lux-surface" style={{ display: "flex", flexDirection: "column", height: "100%", borderRadius: "var(--radius-panel)", padding: 28, margin: 0 }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="var(--lux-gold)" style={{ opacity: 0.85 }} aria-hidden>
        <path d="M9.5 4C6.5 4 4 6.5 4 9.5c0 2.6 1.9 4.8 4.4 5.3-.1 2-1 3.4-2.7 4.4l.9 1.3c2.8-1.5 4.4-4 4.4-7.6V9.5C11 6.5 9.5 4 9.5 4zm9 0C15.5 4 13 6.5 13 9.5c0 2.6 1.9 4.8 4.4 5.3-.1 2-1 3.4-2.7 4.4l.9 1.3c2.8-1.5 4.4-4 4.4-7.6V9.5C20 6.5 18.5 4 18.5 4z" />
      </svg>
      <blockquote className="font-display" style={{ margin: "20px 0 0", flex: 1, color: "var(--lux-ink)", fontSize: "1.15rem", fontStyle: "italic", lineHeight: 1.6 }}>
        &ldquo;{quote}&rdquo;
      </blockquote>
      <div style={{ display: "flex", gap: 4, marginTop: 24 }} aria-label={`${rating} out of 5`}>
        {Array.from({ length: rating }).map((_, i) => <Star key={i} />)}
      </div>
      <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--lux-line)" }}>
        <div className="font-display lux-glass" style={{ display: "flex", height: 44, width: 44, alignItems: "center", justifyContent: "center", borderRadius: "50%", color: "var(--lux-gold)" }}>
          {name.charAt(0)}
        </div>
        <div>
          <p style={{ margin: 0, color: "var(--lux-ink)", fontWeight: 500 }}>{name}</p>
          {location && <p style={{ margin: 0, color: "var(--lux-ink-muted)", fontSize: "0.875rem" }}>{location}</p>}
        </div>
      </figcaption>
    </figure>
  );
}
