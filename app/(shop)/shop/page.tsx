import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProducts, getSiteContent } from "@/lib/data";
import { facetsOf, filterProducts, parseQuery, priceBounds } from "@/lib/catalogue";
import { ProductCard } from "@/components/ui/ProductCard";
import { ShopControls } from "@/components/shop/ShopControls";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";

export const metadata = { title: "Shop — MISK BD", description: "Browse authentic attar, oud and perfumes from MISK BD. Filter by collection, size and price. Delivered across Bangladesh.", alternates: { canonical: "/shop" } };

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <div className="alignment" style={{ padding: "16px 24px 40px" }}>
      <Suspense fallback={<ProductGridSkeleton />}>
        <Shop searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Shop({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const [raw, all, content] = await Promise.all([searchParams, getProducts(), getSiteContent()]);
  const { sections } = content;
  const facets = facetsOf(all);
  const query = parseQuery(raw, sections, facets);
  const list = filterProducts(all, query);
  const bounds = priceBounds(all, query.size, query.unit);
  const activeSec = sections.find((s) => s.id === query.section);
  const activeSub = activeSec?.children.find((c) => c.id === query.sub);
  const sectionEmpty = !!activeSec && !all.some((p) => p.section === activeSec.id && (!activeSub || p.sub === activeSub.id));

  const crumb = { display: "flex", gap: 8, alignItems: "center", padding: "12px 0", fontSize: 14, color: "var(--lux-ink-muted)" } as const;
  const title = (eyebrow: string, h: string, blurb?: string) => (
    <div style={{ padding: "4px 0 18px" }}>
      <span className="lux-eyebrow">{eyebrow}</span>
      <h1 className="font-display" style={{ fontSize: "clamp(1.8rem,4vw,2.6rem)", color: "var(--lux-ink)", margin: "8px 0 0", fontWeight: 500 }}>{h}</h1>
      {blurb && <p style={{ color: "var(--lux-ink-muted)", fontSize: 14, margin: "8px 0 0", maxWidth: 520 }}>{blurb}</p>}
    </div>
  );

  return (
    <>
      <nav aria-label="Breadcrumb" style={crumb}>
        <Link href="/">Home</Link>
        <ChevronRight size={13} />
        <span style={{ color: "var(--lux-ink)" }}>{query.best ? "Best Sellers" : "Shop"}</span>
        {!query.best && query.category && <><ChevronRight size={13} /><span style={{ color: "var(--lux-gold)" }}>{query.category}</span></>}
        {!query.best && activeSec && <><ChevronRight size={13} /><span style={{ color: activeSub ? undefined : "var(--lux-gold)" }}>{activeSec.name}</span></>}
        {!query.best && activeSub && <><ChevronRight size={13} /><span style={{ color: "var(--lux-gold)" }}>{activeSub.name}</span></>}
      </nav>

      {!query.best && !activeSec && <h1 className="sr-only">{query.category ? `${query.category} fragrances` : query.q ? `Search results for ${query.q}` : "Shop all fragrances"}</h1>}

      {query.best && title("Maison Selections", "Best Sellers", "The scents our patrons return to — our most-loved fragrances, gathered in one place.")}
      {!query.best && activeSec && title(activeSub ? activeSec.name : "Collection", activeSub ? activeSub.name : activeSec.name, activeSub ? undefined : activeSec.blurb)}

      <ShopControls query={query} sections={sections} bounds={bounds} facets={facets} hasSale={all.some((p) => p.onSale)}>
        <div style={{ paddingBottom: 16, fontSize: 14, color: "var(--lux-ink-muted)" }} aria-live="polite">
          <span style={{ color: "var(--lux-ink)", fontWeight: 600 }}>{list.length}</span> product{list.length !== 1 ? "s" : ""}
        </div>
        {list.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {list.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="lux-surface" style={{ borderRadius: 22, padding: "64px 24px", textAlign: "center" }}>
            <p className="font-display" style={{ fontSize: 18, color: "var(--lux-ink)" }}>{sectionEmpty ? "Coming soon" : "No products found"}</p>
            <p style={{ color: "var(--lux-ink-muted)", fontSize: 14 }}>
              {sectionEmpty && activeSec ? `We're curating ${activeSub?.name ?? activeSec.name} — new pieces arrive soon.` : "Try broadening your search or clearing the filters."}
            </p>
          </div>
        )}
      </ShopControls>
    </>
  );
}
