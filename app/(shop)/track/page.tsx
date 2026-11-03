import type { Metadata } from "next";
import { TrackOrder } from "@/components/track/TrackOrder";

export const metadata: Metadata = { title: "Track my order — MISK BD", robots: { index: false, follow: false }, description: "See where your Misk BD order is, with your order number and phone number." };

export default function TrackPage() {
  return (
    <div className="alignment" style={{ padding: "40px 24px 72px", color: "var(--lux-ink)" }}>
      <header style={{ textAlign: "center", margin: "8px 0 32px" }}>
        <span className="lux-eyebrow">Your parcel</span>
        <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3rem)", margin: "12px 0 0", fontWeight: 500 }}>Track my order</h1>
        <p style={{ color: "var(--lux-ink-muted)", margin: "12px auto 0", maxWidth: 520 }}>Enter your order number and the phone number you ordered with. Signed-in customers can also pick from their own orders.</p>
      </header>
      <TrackOrder />
    </div>
  );
}
