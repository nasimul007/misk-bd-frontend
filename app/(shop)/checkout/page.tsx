import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";

export const metadata: Metadata = { title: "Checkout — MISK BD" };

export default function CheckoutPage() {
  return (
    <div className="alignment" style={{ padding: "20px 24px 60px", color: "var(--lux-ink)" }}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2" style={{ padding: "12px 0", fontSize: 14, color: "var(--lux-ink-muted)" }}>
        <Link href="/">Home</Link><ChevronRight size={13} /><Link href="/cart">Cart</Link><ChevronRight size={13} /><span style={{ color: "var(--lux-ink)" }}>Checkout</span>
      </nav>
      <h1 className="font-display" style={{ fontSize: 32, fontWeight: 500, margin: "6px 0 26px", letterSpacing: "0.02em" }}>Checkout</h1>
      <CheckoutForm />
    </div>
  );
}
