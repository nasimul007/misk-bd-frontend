"use client";

import { setCurrency, useCurrency } from "@/lib/currency";
import type { Currency } from "@/lib/format";

const options: { id: Currency; label: string; name: string }[] = [
  { id: "BDT", label: "৳", name: "Bangladeshi Taka" },
  { id: "USD", label: "$", name: "US Dollar" },
];

/** BDT / USD display switch. The charged amount is always BDT. */
export function CurrencyToggle() {
  const current = useCurrency();
  return (
    <div role="group" aria-label="Display currency" className="inline-flex" style={{ borderRadius: 999, border: "1px solid var(--lux-line)", padding: 2 }}>
      {options.map((o) => {
        const on = o.id === current;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            aria-label={`Show prices in ${o.name}`}
            onClick={() => setCurrency(o.id)}
            className="lux-focus"
            style={{ width: 28, height: 26, borderRadius: 999, border: 0, cursor: "pointer", fontSize: 13, fontWeight: 600, background: on ? "var(--lux-gold)" : "transparent", color: on ? "var(--lux-bg)" : "var(--lux-ink-muted)", transition: "background var(--dur-mid) var(--ease-lux)" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
