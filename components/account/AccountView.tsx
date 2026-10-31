"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MapPin, Package, Plus, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, ariaFor } from "@/components/checkout/Field";
import { saveAddresses, signIn, signOut, useAddresses, useSession, type Session } from "@/lib/auth";
import { bdLocal } from "@/lib/checkout";
import { useMoney } from "@/lib/currency";
import { lookupOrdersAction } from "@/app/actions/orders";
import { orderTokens, type Order } from "@/lib/orders";

type Tab = "orders" | "profile" | "addresses";
const tabs: { id: Tab; label: string; Icon: typeof Package }[] = [
  { id: "orders", label: "Orders", Icon: Package },
  { id: "profile", label: "Profile", Icon: User },
  { id: "addresses", label: "Addresses", Icon: MapPin },
];

function useOrders(): Order[] | undefined {
  const raw = useSyncExternalStore(orderTokens.subscribe, orderTokens.read, () => undefined);
  const refs = useMemo(() => (raw === undefined ? undefined : orderTokens.parse(raw)), [raw]);
  const [loaded, setLoaded] = useState<{ raw: string | null; orders: Order[] } | null>(null);

  useEffect(() => {
    if (!refs || refs.length === 0) return;
    let live = true;
    lookupOrdersAction(refs).then((orders) => live && setLoaded({ raw: raw ?? null, orders }));
    return () => { live = false; };
  }, [refs, raw]);

  if (!refs) return undefined;
  if (refs.length === 0) return [];
  return loaded?.raw === (raw ?? null) ? loaded.orders : undefined;
}

const date = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

function Orders() {
  const money = useMoney();
  const orders = useOrders();
  if (orders === undefined) return null;
  if (orders.length === 0) {
    return (
      <div className="lux-surface" style={{ borderRadius: 18, padding: 32, textAlign: "center" }}>
        <p style={{ margin: 0, color: "var(--lux-ink-muted)" }}>You haven&apos;t placed an order yet.</p>
        <div style={{ marginTop: 18 }}><Button variant="outline" href="/shop">Explore the Collection</Button></div>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3.5" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {orders.map((o) => {
        const first = o.items[0];
        const count = o.items.reduce((n, i) => n + i.qty, 0);
        return (
          <li key={o.id} className="lux-surface flex flex-wrap items-center gap-4" style={{ borderRadius: 16, padding: 18 }}>
            {first && <Image src={first.image} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />}
            <div style={{ flex: 1, minWidth: 140 }}>
              <Link href={`/order/${o.id}`} style={{ fontWeight: 600 }}>{o.id}</Link>
              <div style={{ fontSize: 13, color: "var(--lux-ink-muted)" }}>{date(o.placedAt)} · {count} item{count === 1 ? "" : "s"}</div>
            </div>
            <Badge tone={o.status === "delivered" ? "success" : o.status === "cancelled" || o.status === "returned" ? "danger" : "warning"}>{o.status}</Badge>
            <div className="font-display" style={{ fontSize: 18, color: "var(--lux-gold)", minWidth: 90, textAlign: "right" }}>{money(o.totals.total)}</div>
            <Button variant="ghost" size="sm" href="/shop">Reorder</Button>
          </li>
        );
      })}
    </ul>
  );
}

function Profile({ session }: { session: Session }) {
  const [name, setName] = useState(session.name);
  const [phone, setPhone] = useState(session.phone);
  const [email, setEmail] = useState(session.email);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const save = () => {
    const e: Record<string, string> = {};
    if (phone.trim() && !/^01[3-9]\d{8}$/.test(bdLocal(phone))) e.phone = "Enter a valid 11-digit Bangladeshi number.";
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email address.";
    setErrors(e);
    if (Object.keys(e).length) { setSaved(false); return; }
    signIn({ ...session, name: name.trim(), phone: phone.trim() ? bdLocal(phone) : "", email: email.trim() });
    setSaved(true);
  };
  const change = (set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => { set(e.target.value); setSaved(false); };

  return (
    <form className="lux-surface flex flex-col gap-4" style={{ borderRadius: 18, padding: 24, maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      <Field id="ac-name" label="Full name"><input id="ac-name" autoComplete="name" className="lux-input" value={name} onChange={change(setName)} maxLength={80} /></Field>
      <Field id="ac-phone" label="Phone" error={errors.phone}><input id="ac-phone" type="tel" autoComplete="tel" className="lux-input" value={phone} onChange={change(setPhone)} {...ariaFor("ac-phone", errors.phone)} /></Field>
      <Field id="ac-email" label="Email" error={errors.email}><input id="ac-email" type="email" autoComplete="email" className="lux-input" value={email} onChange={change(setEmail)} {...ariaFor("ac-email", errors.email)} /></Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm">Save changes</Button>
        {saved && <span role="status" style={{ fontSize: 13, color: "var(--lux-success)" }}>Saved</span>}
      </div>
    </form>
  );
}

function Addresses() {
  const list = useAddresses();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const add = () => {
    if (text.trim().length < 8) { setError("Enter the full address."); return; }
    saveAddresses([...list, { id: `a${Date.now().toString(36)}`, label: label.trim() || "Address", text: text.trim() }]);
    setLabel(""); setText(""); setError(""); setAdding(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
      {list.map((a, i) => (
        <div key={a.id} className="lux-surface" style={{ borderRadius: 16, padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{a.label}</span>
            <span className="flex items-center gap-2">
              {i === 0 && <Badge tone="gold">Default</Badge>}
              <button type="button" aria-label={`Remove ${a.label}`} onClick={() => saveAddresses(list.filter((x) => x.id !== a.id))} className="lux-focus" style={{ border: 0, background: "transparent", color: "var(--lux-ink-muted)", cursor: "pointer", display: "inline-flex" }}><Trash2 size={15} /></button>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--lux-ink-muted)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{a.text}</p>
        </div>
      ))}
      {adding ? (
        <form className="lux-surface flex flex-col gap-3" style={{ borderRadius: 16, padding: 20 }} onSubmit={(e) => { e.preventDefault(); add(); }} noValidate>
          <Field id="ad-label" label="Label"><input id="ad-label" className="lux-input" placeholder="Home, Office…" maxLength={30} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field id="ad-text" label="Address" error={error}><textarea id="ad-text" rows={3} className="lux-input" maxLength={300} placeholder="House, road, area, district" value={text} onChange={(e) => setText(e.target.value)} {...ariaFor("ad-text", error)} /></Field>
          <div className="flex gap-2"><Button type="submit" size="sm">Save</Button><Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setError(""); }}>Cancel</Button></div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="lux-glass lux-focus flex items-center justify-center gap-2" style={{ borderRadius: 16, padding: 20, border: "1px dashed var(--lux-line)", color: "var(--lux-ink-muted)", cursor: "pointer", minHeight: 110 }}>
          <Plus size={18} aria-hidden /> Add address
        </button>
      )}
    </div>
  );
}

export function AccountView() {
  const router = useRouter();
  const session = useSession();
  const [tab, setTab] = useState<Tab>("orders");
  const leaving = useRef(false); // signing out goes home, not back to the login page

  useEffect(() => {
    if (session === null && !leaving.current) router.replace("/login");
  }, [session, router]);

  if (!session) return <div className="alignment" style={{ padding: "48px 24px", minHeight: "50vh" }} aria-busy="true" />;

  const who = session.name || session.email || (session.phone ? `0${session.phone.replace(/^0/, "")}` : "Welcome");
  return (
    <div className="alignment" style={{ padding: "24px 24px 60px", color: "var(--lux-ink)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 24 }}>
        <div>
          <span className="lux-eyebrow">Maison de Parfum</span>
          <h1 className="font-display" style={{ fontSize: 30, margin: "8px 0 0", fontWeight: 500 }}>My Account</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--lux-ink-muted)" }}>{who}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { leaving.current = true; router.push("/"); signOut(); }}>Sign out</Button>
      </div>
      <div className="grid items-start gap-[18px] md:grid-cols-[220px_1fr] md:gap-7">
        <div role="tablist" aria-label="Account sections" aria-orientation="vertical" className="lux-surface flex flex-col gap-1" style={{ borderRadius: 18, padding: 14 }}>
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="lux-focus flex items-center gap-3"
              style={{ padding: "12px 14px", borderRadius: 12, border: "none", cursor: "pointer", textAlign: "left", fontSize: 14, background: tab === id ? "var(--lux-gold-soft)" : "transparent", color: tab === id ? "var(--lux-gold)" : "var(--lux-ink)" }}>
              <Icon size={17} aria-hidden /> {label}
            </button>
          ))}
        </div>
        <div role="tabpanel">
          {tab === "orders" && <Orders />}
          {tab === "profile" && <Profile session={session} />}
          {tab === "addresses" && <Addresses />}
        </div>
      </div>
    </div>
  );
}
