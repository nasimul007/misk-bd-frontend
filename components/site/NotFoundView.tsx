import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "./Logo";

/** The "page not found" screen: a way back, a search box, and the places people usually want. */
export function NotFoundView({ withLogo = false }: { withLogo?: boolean }) {
  return (
    <div className="alignment" style={{ padding: "72px 24px 96px", textAlign: "center", color: "var(--lux-ink)", minHeight: withLogo ? "100vh" : undefined }}>
      {withLogo && <Link href="/" aria-label="MISK BD home" style={{ display: "inline-flex", marginBottom: 40 }}><Logo size={56} /></Link>}
      <span className="lux-eyebrow">Error 404</span>
      <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3.2rem)", fontWeight: 500, margin: "14px 0 12px" }}>We couldn&apos;t find that page</h1>
      <p style={{ color: "var(--lux-ink-muted)", maxWidth: 460, margin: "0 auto 28px", lineHeight: 1.7 }}>
        The link may be old, or the product may no longer be available. Try searching, or head back to the collection.
      </p>
      <form action="/shop" method="get" role="search" className="flex items-center gap-2" style={{ maxWidth: 420, margin: "0 auto 28px" }}>
        <input name="q" type="search" aria-label="Search the shop" placeholder="Search for a fragrance" className="lux-input" />
        <button type="submit" className="lux-btn-fill lux-focus inline-flex items-center gap-2" style={{ padding: "0.7rem 1.2rem" }}><Search size={16} aria-hidden /> Search</button>
      </form>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="lux-btn lux-focus">Shop all</Link>
        <Link href="/shop?best=1" className="lux-btn lux-focus">Best sellers</Link>
        <Link href="/track" className="lux-btn lux-focus">Track my order</Link>
        <Link href="/" className="lux-btn lux-focus">Home</Link>
      </div>
    </div>
  );
}
