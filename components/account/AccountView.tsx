"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MapPin, Package, Plus, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, ariaFor } from "@/components/checkout/Field";
import { addAddressAction, listAddressesAction, myOrdersAction, removeAddressAction, updateProfileAction, type AddressDto } from "@/app/actions/auth";
import { setSession, signOut, useSession, type Session } from "@/lib/auth";
import { useMoney } from "@/lib/currency";
import { orderTokens, type Order } from "@/lib/orders";

type Tab = "orders" | "profile" | "addresses";
const tabs: { id: Tab; label: string; Icon: typeof Package }[] = [
  { id: "orders", label: "Orders", Icon: Package },
  { id: "profile", label: "Profile", Icon: User },
  { id: "addresses", label: "Addresses", Icon: MapPin },
];

function useOrders(): Order[] | undefined {
  const raw = useSyncExternalStore(orderTokens.subscribe, orderTokens.read, () => undefined);
  const [loaded, setLoaded] = useState<{ raw: string | null; orders: Order[] } | null>(null);

  useEffect(() => {
    if (raw === undefined) return;
    let live = true;
    myOrdersAction(orderTokens.parse(raw)).then((orders) => live && setLoaded({ raw, orders }));
    return () => { live = false; };
  }, [raw]);

  return raw !== undefined && loaded?.raw === raw ? loaded.orders : undefined;
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
  const [email, setEmail] = useState(session.email);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await updateProfileAction(name, email);
      if (r.ok) { setSession(r.user); setSaved(true); } else { setError(r.error); setSaved(false); }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
  };

  return (
    <form className="lux-surface flex flex-col gap-4" style={{ borderRadius: 18, padding: 24, maxWidth: 520 }} onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
      <Field id="ac-name" label="Full name"><input id="ac-name" autoComplete="name" className="lux-input" value={name} onChange={(e) => { setName(e.target.value); setSaved(false); }} maxLength={80} /></Field>
      <Field id="ac-phone" label="Phone"><input id="ac-phone" className="lux-input" value={session.phone || "Not added"} readOnly disabled style={{ opacity: 0.7 }} /></Field>
      <Field id="ac-email" label="Email" error={error}><input id="ac-email" type="email" autoComplete="email" className="lux-input" value={email} onChange={(e) => { setEmail(e.target.value); setSaved(false); }} {...ariaFor("ac-email", error)} /></Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>
        {saved && <span role="status" style={{ fontSize: 13, color: "var(--lux-success)" }}>Saved</span>}
      </div>
    </form>
  );
}

function Addresses() {
  const [list, setList] = useState<AddressDto[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    listAddressesAction().then((l) => live && setList(l));
    return () => { live = false; };
  }, []);

  const apply = async (call: () => Promise<{ ok: true; addresses: AddressDto[] } | { ok: false; error: string }>) => {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const r = await call();
      if (r.ok) { setList(r.addresses); return true; }
      setError(r.error);
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
    return false;
  };
  const add = async () => {
    if (await apply(() => addAddressAction(label, text))) { setLabel(""); setText(""); setAdding(false); }
  };

  if (list === null) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px,1fr))", gap: 16 }}>
      {list.map((a) => (
        <div key={a.id} className="lux-surface" style={{ borderRadius: 16, padding: 20 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{a.label}</span>
            <span className="flex items-center gap-2">
              {a.isDefault && <Badge tone="gold">Default</Badge>}
              <button type="button" aria-label={`Remove ${a.label}`} onClick={() => apply(() => removeAddressAction(a.id))} className="lux-focus" style={{ border: 0, background: "transparent", color: "var(--lux-ink-muted)", cursor: "pointer", display: "inline-flex" }}><Trash2 size={15} /></button>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14, color: "var(--lux-ink-muted)", lineHeight: 1.6, whiteSpace: "pre-line" }}>{a.text}</p>
        </div>
      ))}
      {adding ? (
        <form className="lux-surface flex flex-col gap-3" style={{ borderRadius: 16, padding: 20 }} onSubmit={(e) => { e.preventDefault(); add(); }} noValidate>
          <Field id="ad-label" label="Label"><input id="ad-label" className="lux-input" placeholder="Home, Office…" maxLength={40} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
          <Field id="ad-text" label="Address" error={error}><textarea id="ad-text" rows={3} className="lux-input" maxLength={255} placeholder="House, road, area, district" value={text} onChange={(e) => setText(e.target.value)} {...ariaFor("ad-text", error)} /></Field>
          <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy}>Save</Button><Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setError(""); }}>Cancel</Button></div>
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

  const who = session.name || session.email || session.phone || "Welcome";
  return (
    <div className="alignment" style={{ padding: "24px 24px 60px", color: "var(--lux-ink)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3" style={{ marginBottom: 24 }}>
        <div>
          <span className="lux-eyebrow">Maison de Parfum</span>
          <h1 className="font-display" style={{ fontSize: 30, margin: "8px 0 0", fontWeight: 500 }}>My Account</h1>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--lux-ink-muted)" }}>{who}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { leaving.current = true; router.push("/"); void signOut(); }}>Sign out</Button>
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
