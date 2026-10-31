/** Stock status pill. Tone derives from the stock level. */
export function StockPill({ stock }: { stock: number }) {
  const state = stock <= 0 ? "danger" : stock <= 5 ? "warning" : "success";
  const c = `var(--lux-${state})`;
  const text = state === "danger" ? "Out of stock" : state === "warning" ? `Only ${stock} left` : "In stock";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", borderRadius: "var(--radius-pill)", border: `1px solid color-mix(in oklch, ${c} 25%, transparent)`, background: `color-mix(in oklch, ${c} 10%, transparent)`, color: c, padding: "0.25rem 0.75rem", fontSize: "0.75rem", fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c }} />
      {text}
    </span>
  );
}
