import type { ReactNode } from "react";

/** Label + control + inline error. The control gets its id, so the label is announced with it. */
export function Field({ id, label, error, className = "", children }: { id: string; label: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="lux-label" style={{ display: "block", marginBottom: 6, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</label>
      {children}
      {error && <p id={`${id}-err`} role="alert" style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--lux-warning)" }}>{error}</p>}
    </div>
  );
}

/** aria wiring shared by every checkout control. */
export const ariaFor = (id: string, error?: string) => ({ "aria-invalid": error ? true : undefined, "aria-describedby": error ? `${id}-err` : undefined }) as const;
