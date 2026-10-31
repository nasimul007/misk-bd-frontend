"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Truck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { computeTotals, dialFor, emptyForm, estimateFor, bdLocal, validate, type CheckoutForm as Form } from "@/lib/checkout";
import { paymentsFor, type PaymentId } from "@/lib/config";
import { countries, dialCodes, geo } from "@/lib/data/geo";
import { useCurrency, useMoney } from "@/lib/currency";
import { money as bdt } from "@/lib/format";
import { newOrderId, orderStore, type Order } from "@/lib/orders";
import { Field, ariaFor } from "./Field";

const card = { borderRadius: 18, padding: 24 } as const;
const h = { fontSize: 18, fontWeight: 500, margin: "0 0 18px" } as const;

export function CheckoutForm() {
  const money = useMoney();
  const currency = useCurrency();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const clear = useCart((s) => s.clear);
  const [f, setF] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [placing, setPlacing] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const errors = validate(f);
  const err = (k: keyof Form) => (touched ? errors[k] : undefined);
  const ok = Object.keys(errors).length === 0;

  const t = computeTotals(items, { intl: f.intl, division: f.division });
  const methods = paymentsFor(f.intl);
  const districts = f.division ? Object.keys(geo[f.division] ?? {}) : [];
  const thanas = f.division && f.district ? (geo[f.division]?.[f.district] ?? []) : [];

  const toggleIntl = (intl: boolean) => setF({ ...emptyForm, name: f.name, email: f.email, street: f.street, intl, pay: intl ? "stripe" : "bkash" });
  const pickCountry = (country: string) => setF((p) => ({ ...p, country, dial: dialFor(country) }));

  const place = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!ok || placing || items.length === 0) return;
    setPlacing(true);
    const digits = f.phone.replace(/\D/g, "");
    const order: Order = {
      id: newOrderId(),
      placedAt: new Date().toISOString(),
      items,
      totals: t,
      pay: f.pay as PaymentId,
      intl: f.intl,
      name: f.name.trim(),
      phone: f.intl ? `${f.dial} ${digits}` : `+880 ${bdLocal(f.phone).slice(1)}`,
      email: f.email.trim(),
      country: f.intl ? f.country : "Bangladesh",
      division: f.intl ? f.country : f.division,
      address: f.intl
        ? [f.street.trim(), f.city.trim(), f.region.trim(), f.postal.trim(), f.country].join(", ")
        : [f.street.trim(), f.thana, f.district, f.division].join(", "),
    };
    orderStore.save(order);
    clear();
    router.push(`/order/${order.id}`);
  };

  if (!hydrated) return <div style={{ minHeight: "50vh" }} aria-busy="true" />;
  if (items.length === 0) {
    return (
      <div style={{ padding: "60px 0", textAlign: "center" }}>
        <p className="font-display" style={{ fontSize: 24 }}>Your bag is empty</p>
        <div className="flex justify-center" style={{ marginTop: 20 }}><Link href="/shop" className="lux-btn lux-focus">Browse the collection</Link></div>
      </div>
    );
  }

  return (
    <form onSubmit={place} noValidate className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
      <div className="flex flex-col gap-6">
        <section className="lux-surface" style={card}>
          <h2 className="font-display" style={h}>1 &middot; Contact</h2>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field id="ck-name" label="Full name *" error={err("name")}>
              <input id="ck-name" className="lux-input" autoComplete="name" placeholder="Your name" value={f.name} onChange={(e) => set("name", e.target.value)} {...ariaFor("ck-name", err("name"))} />
            </Field>
            <Field id="ck-phone" label="Phone *" error={err("phone")}>
              <div className="flex gap-2">
                {f.intl ? (
                  <select aria-label="Country code" className="lux-input" style={{ width: 120, flex: "none" }} value={f.dial} onChange={(e) => set("dial", e.target.value)}>
                    <option value="">Code</option>
                    {dialCodes.map((d) => <option key={d.country} value={d.code}>{d.code} {d.country}</option>)}
                  </select>
                ) : (
                  <div className="lux-input flex items-center" style={{ width: "auto", flex: "none", color: "var(--lux-ink-muted)" }}>+880</div>
                )}
                <input id="ck-phone" type="tel" inputMode="tel" autoComplete="tel-national" className="lux-input" style={{ minWidth: 0 }} placeholder={f.intl ? "Number" : "01XXX XXXXXX"} value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^\d\s()+-]/g, ""))} {...ariaFor("ck-phone", err("phone"))} />
              </div>
            </Field>
            <Field id="ck-email" label="Email (optional)" error={err("email")} className="sm:col-span-2">
              <input id="ck-email" type="email" autoComplete="email" className="lux-input" placeholder="you@example.com" value={f.email} onChange={(e) => set("email", e.target.value)} {...ariaFor("ck-email", err("email"))} />
            </Field>
          </div>
        </section>

        <section className="lux-surface" style={card}>
          <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 18 }}>
            <h2 className="font-display" style={{ ...h, margin: 0 }}>2 &middot; Delivery address</h2>
            <label className="flex cursor-pointer items-center gap-2" style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>
              <input type="checkbox" checked={f.intl} onChange={(e) => toggleIntl(e.target.checked)} style={{ accentColor: "var(--lux-gold)" }} /> International buyer
            </label>
          </div>
          {!f.intl ? (
            <div className="grid gap-3.5 sm:grid-cols-3">
              <Field id="ck-div" label="Division *" error={err("division")}>
                <select id="ck-div" className="lux-input" value={f.division} onChange={(e) => setF((p) => ({ ...p, division: e.target.value, district: "", thana: "" }))} {...ariaFor("ck-div", err("division"))}>
                  <option value="">Select</option>
                  {Object.keys(geo).map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field id="ck-dist" label="District *" error={err("district")}>
                <select id="ck-dist" className="lux-input" disabled={!f.division} value={f.district} onChange={(e) => setF((p) => ({ ...p, district: e.target.value, thana: "" }))} {...ariaFor("ck-dist", err("district"))}>
                  <option value="">Select</option>
                  {districts.map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field id="ck-thana" label="Upazila / Thana *" error={err("thana")}>
                <select id="ck-thana" className="lux-input" disabled={!f.district} value={f.thana} onChange={(e) => set("thana", e.target.value)} {...ariaFor("ck-thana", err("thana"))}>
                  <option value="">Select</option>
                  {thanas.map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
              <Field id="ck-street" label="Street address *" error={err("street")} className="sm:col-span-3">
                <input id="ck-street" autoComplete="street-address" className="lux-input" placeholder="House, road, area" value={f.street} onChange={(e) => set("street", e.target.value)} {...ariaFor("ck-street", err("street"))} />
              </Field>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field id="ck-country" label="Country *" error={err("country")} className="sm:col-span-2">
                <select id="ck-country" className="lux-input" value={f.country} onChange={(e) => pickCountry(e.target.value)} {...ariaFor("ck-country", err("country"))}>
                  <option value="">Select country</option>
                  {countries.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field id="ck-region" label="State / Province *" error={err("region")}>
                <input id="ck-region" className="lux-input" value={f.region} onChange={(e) => set("region", e.target.value)} {...ariaFor("ck-region", err("region"))} />
              </Field>
              <Field id="ck-city" label="City *" error={err("city")}>
                <input id="ck-city" autoComplete="address-level2" className="lux-input" value={f.city} onChange={(e) => set("city", e.target.value)} {...ariaFor("ck-city", err("city"))} />
              </Field>
              <Field id="ck-postal" label="Postal code *" error={err("postal")}>
                <input id="ck-postal" autoComplete="postal-code" className="lux-input" value={f.postal} onChange={(e) => set("postal", e.target.value)} {...ariaFor("ck-postal", err("postal"))} />
              </Field>
              <Field id="ck-street" label="Street address *" error={err("street")} className="sm:col-span-2">
                <input id="ck-street" autoComplete="street-address" className="lux-input" placeholder="House / apartment, street" value={f.street} onChange={(e) => set("street", e.target.value)} {...ariaFor("ck-street", err("street"))} />
              </Field>
            </div>
          )}
          {(f.division || (f.intl && f.country)) && (
            <p className="flex items-center gap-2" style={{ margin: "14px 0 0", fontSize: 13, color: "var(--lux-ink-muted)" }}>
              <Truck size={14} /> Estimated delivery: {estimateFor(f.intl, f.division)} &middot; {t.shipping === 0 ? "Free shipping" : `Shipping ${money(t.shipping)}`}
            </p>
          )}
        </section>

        <section className="lux-surface" style={card}>
          <h2 className="font-display" style={h}>3 &middot; Payment</h2>
          <div role="radiogroup" aria-label="Payment method" className="flex flex-col gap-2.5">
            {methods.map((p) => {
              const on = f.pay === p.id;
              return (
                <label key={p.id} className="flex cursor-pointer items-center gap-3.5" style={{ padding: "14px 16px", borderRadius: 12, border: on ? "1px solid var(--lux-gold)" : "1px solid var(--lux-line)", background: on ? "var(--lux-gold-soft)" : "transparent" }}>
                  <input type="radio" name="pay" checked={on} onChange={() => set("pay", p.id)} style={{ accentColor: "var(--lux-gold)" }} />
                  <div style={{ flex: 1 }}>
                    <div className="flex items-center gap-2" style={{ fontWeight: 600 }}>
                      {p.label}
                      {p.tag && <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lux-gold)", border: "1px solid var(--lux-line)", borderRadius: 999, padding: "2px 8px" }}>{p.tag}</span>}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>{p.note}</div>
                  </div>
                </label>
              );
            })}
          </div>
          {err("pay") && <p role="alert" style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--lux-warning)" }}>{err("pay")}</p>}
          <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--lux-ink-muted)" }}>Payments are simulated for now &mdash; no money is taken and nothing is sent to a payment provider.</p>
        </section>
      </div>

      <aside className="lux-surface lux-glass--gold lg:sticky lg:top-24" style={card} aria-label="Order review">
        <h2 className="font-display" style={h}>Order review</h2>
        <ul className="flex flex-col gap-3" style={{ listStyle: "none", padding: 0, margin: "0 0 16px", maxHeight: 220, overflowY: "auto" }}>
          {items.map((i) => (
            <li key={i.key} className="flex items-center gap-3">
              <span style={{ position: "relative", width: 48, height: 48, flex: "none", borderRadius: 8, overflow: "hidden" }}><Image src={i.image} alt="" fill sizes="48px" style={{ objectFit: "cover" }} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "var(--lux-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{i.title}</div>
                <div style={{ fontSize: 12, color: "var(--lux-ink-muted)" }}>{i.size} &middot; &times; {i.qty}</div>
              </div>
              <div className="flex flex-col items-end">
                {i.original > i.price && <s style={{ fontSize: 11, color: "var(--lux-ink-muted)" }}>{money(i.original * i.qty)}</s>}
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--lux-gold)" }}>{money(i.price * i.qty)}</span>
              </div>
            </li>
          ))}
        </ul>
        {([["Subtotal", money(t.listTotal), false], ...(t.savings > 0 ? [["Discounts", `−${money(t.savings)}`, true]] : []), ["Shipping", !(f.division || f.intl) ? "Set by address" : t.shipping === 0 ? "Free" : money(t.shipping), false], ["VAT (incl.)", money(t.vat), false]] as [string, string, boolean][]).map(([k, v, good]) => (
          <div key={k} className="flex justify-between" style={{ fontSize: 14, padding: "5px 0", color: good ? "var(--lux-success)" : "var(--lux-ink-muted)" }}><span>{k}</span><span>{v}</span></div>
        ))}
        <div className="flex items-baseline justify-between" style={{ borderTop: "1px solid var(--lux-line)", marginTop: 10, paddingTop: 14 }}>
          <span style={{ fontWeight: 500 }}>Total</span>
          <span className="font-display" style={{ fontSize: 24, color: "var(--lux-gold)" }}>{money(t.total)}</span>
        </div>
        {currency === "USD" && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "var(--lux-ink-muted)", textAlign: "right" }}>Shown in USD for reference. You are charged {bdt(t.total)}.</p>}
        {t.savings > 0 && <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--lux-success)", textAlign: "right" }}>You save {money(t.savings)} on this order</p>}
        <button type="submit" disabled={placing} className="lux-btn-fill lux-focus" style={{ width: "100%", padding: "0.95rem", marginTop: 18 }}>{placing ? "Placing order…" : "Place order"}</button>
        {touched && !ok && <p role="alert" style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--lux-warning)", textAlign: "center" }}>Please fix the highlighted fields.</p>}
        <p className="flex items-center justify-center gap-1.5" style={{ fontSize: 12, color: "var(--lux-ink-muted)", textAlign: "center", marginTop: 12 }}><Lock size={12} /> Secure checkout</p>
      </aside>
    </form>
  );
}
