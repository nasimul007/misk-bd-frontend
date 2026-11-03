import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, ShieldCheck } from "lucide-react";
import { getProduct, getProductSlugs, getRelated, getReviews, getSiteContent } from "@/lib/data";
import { Badge } from "@/components/ui/Badge";
import { unitOf } from "@/lib/units";
import { ProductCard } from "@/components/ui/ProductCard";
import { ProductBuy } from "@/components/product/ProductBuy";
import { Reviews, Stars } from "@/components/product/Reviews";
import { ProductGallery } from "@/components/product/ProductGallery";

export async function generateStaticParams() {
  return (await getProductSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return product ? { title: `${product.title} — MISK BD`, description: product.description } : {};
}

export default async function ProductPage({ params }: PageProps<"/product/[slug]">) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [content, related, reviews] = await Promise.all([getSiteContent(), getRelated(slug), getReviews(slug)]);
  const sec = content.sections.find((s) => s.id === product.section);
  const sub = sec?.children.find((c) => c.id === product.sub);

  const specs = ([
    ["Collection", sec ? (sub ? `${sec.name} › ${sub.name}` : sec.name) : ""],
    ["Scent family", product.family],
    ["Concentration", product.concentration],
    ["Longevity", product.lasting > 0 ? `${product.lasting} hours` : ""],
    ["Sillage / projection", product.projection],
    ["Key sourcing", product.origin],
    [unitOf(product.unit).measured ? "Available sizes" : "Available options", product.variants.map((v) => v.size).join(" · ")],
  ] as const).filter(([, v]) => v);
  const showSpecs = sec?.showSpecs !== false;

  const crumb = { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "12px 0", fontSize: 14, color: "var(--lux-ink-muted)" } as const;

  return (
    <div className="alignment" style={{ padding: "12px 24px 60px", color: "var(--lux-ink)" }}>
      <nav aria-label="Breadcrumb" style={crumb}>
        <Link href="/">Home</Link><ChevronRight size={13} />
        <Link href="/shop">Shop</Link>
        {sec && <><ChevronRight size={13} /><Link href={`/shop?section=${sec.id}`}>{sec.name}</Link></>}
        {sub && <><ChevronRight size={13} /><Link href={`/shop?section=${sec!.id}&sub=${sub.id}`}>{sub.name}</Link></>}
        <ChevronRight size={13} /><span style={{ color: "var(--lux-ink)", fontWeight: 500 }}>{product.title}</span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr] lg:gap-12">
        <ProductGallery images={product.gallery} title={product.title} />

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--lux-ink-muted)" }}>{product.category}</span>
              {product.tags.slice(0, 2).map((t) => <Badge key={t} tone="glass">{t}</Badge>)}
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h1 className="font-display" style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.1, margin: 0, textWrap: "balance" }}>{product.title}</h1>
              <span dir="rtl" lang="ar" className="font-display" style={{ fontSize: 22, color: "var(--lux-gold)" }}>{product.arabic}</span>
            </div>
            {product.reviews > 0 ? (
              <a href="#reviews" className="flex items-center gap-2" style={{ fontSize: 14, color: "var(--lux-ink-muted)", textDecoration: "none" }} aria-label={`Rated ${product.rating} out of 5 from ${product.reviews} review${product.reviews === 1 ? "" : "s"}. Read the reviews.`}>
                <Stars value={product.rating} />
                {product.rating.toFixed(1)} &middot; {product.reviews} review{product.reviews === 1 ? "" : "s"}
              </a>
            ) : (
              <span style={{ fontSize: 14, color: "var(--lux-ink-muted)" }}>No reviews yet</span>
            )}
          </div>

          <ProductBuy product={product} intro={<p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--lux-ink-muted)", margin: 0 }}>{product.description}</p>} />

          <div className="lux-glass lux-glass--gold flex items-start gap-3.5" style={{ borderRadius: 16, padding: "18px 20px" }}>
            <span style={{ color: "var(--lux-gold)", flex: "none", marginTop: 2 }}><ShieldCheck size={22} /></span>
            <div>
              <div style={{ fontWeight: 600, color: "var(--lux-ink)", marginBottom: 4 }}>Authenticity guaranteed</div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "var(--lux-ink-muted)" }}>Sourced from verified houses, sealed and batch-checked. Every order ships with a Misk BD authenticity card. <Link href="/authenticity" className="lux-link">Read our guarantee</Link>.</p>
            </div>
          </div>

          {showSpecs && <div className="glass-card" style={{ borderRadius: 16, padding: 24 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: 13, fontWeight: 400, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--lux-ink-muted)" }}>Specifications</h2>
            <dl style={{ margin: 0 }}>
              {specs.map(([k, v], i) => (
                <div key={k} className="flex justify-between gap-4" style={{ padding: "11px 0", borderTop: i ? "1px solid var(--lux-line-soft)" : "none" }}>
                  <dt style={{ color: "var(--lux-ink-muted)", fontSize: 14 }}>{k}</dt>
                  <dd style={{ margin: 0, color: "var(--lux-ink)", fontSize: 14, fontWeight: 500, textAlign: "right" }}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>}

          <ul className="flex flex-wrap gap-x-6 gap-y-2" style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 13, color: "var(--lux-ink-muted)" }}>
            {["100% authentic", "Cash on delivery", "Nationwide shipping", "7-day returns"].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check size={14} color="var(--lux-success)" /> {f}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="alignment" style={{ padding: "0 24px" }}><Reviews reviews={reviews} average={product.rating} count={product.reviews} /></div>

      {related.length > 0 && (
        <section style={{ marginTop: 72 }}>
          <h2 className="font-display" style={{ fontSize: 24, fontWeight: 500, color: "var(--lux-ink)", marginBottom: 20 }}>You may also like</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20 }}>
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
