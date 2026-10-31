import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { TRUST_ICONS } from "@/lib/trust-icons";
import { getBestSellers, getSiteContent } from "@/lib/data";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductCard } from "@/components/ui/ProductCard";
import { Testimonial } from "@/components/ui/Testimonial";


const scrim = "linear-gradient(180deg, transparent 40%, var(--lux-scrim) 100%)";

export default async function HomePage() {
  const [content, bestSellers] = await Promise.all([getSiteContent(), getBestSellers(4)]);
  const { hero, trust, manifesto, sectionsMeta, sections, categories, testimonials, cta } = content;

  return (
    <>
      {/* HERO */}
      <section style={{ position: "relative", minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden" }}>
        <Image src={hero.image} alt="" fill priority sizes="100vw" style={{ objectFit: "cover" }} />
        <div style={{ position: "absolute", inset: 0, background: "var(--hero-veil)" }} />
        <div style={{ position: "absolute", inset: 24, borderRadius: 18, border: "1px solid var(--lux-line)", pointerEvents: "none" }} />
        <div className="alignment" style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 22, padding: "96px 24px" }}>
          <Eyebrow>{hero.eyebrow}</Eyebrow>
          <h1 className="font-display" style={{ color: "var(--lux-ink)", fontWeight: 500, lineHeight: 1.02, letterSpacing: "-0.02em", fontSize: "var(--text-hero)", margin: 0, textWrap: "balance" }}>
            {hero.titleLine1}<br /><span style={{ fontStyle: "italic" }}>{hero.titleLine2}</span>
          </h1>
          <p style={{ maxWidth: 560, color: "var(--lux-ink-muted)", fontSize: "var(--text-lead)", lineHeight: 1.7 }}>{hero.subtitle}</p>
          <div className="flex flex-wrap items-center justify-center gap-4" style={{ marginTop: 8 }}>
            <Button variant="outline" href="/shop">Explore the Collection</Button>
            <Link href="/shop?best=1" className="inline-flex items-center gap-2" style={{ color: "var(--lux-ink)", fontSize: 14, letterSpacing: "0.02em" }}>
              Discover best sellers <span style={{ color: "var(--lux-gold)" }}>&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section style={{ borderBottom: "1px solid var(--lux-line)" }}>
        <div className="alignment" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 4, padding: "10px 24px" }}>
          {trust.map((t) => {
            const Icon = TRUST_ICONS[t.icon] ?? ShieldCheck;
            return (
              <div key={t.title} className="flex items-center gap-3" style={{ padding: "16px 12px" }}>
                <span className="lux-glass" style={{ width: 40, height: 40, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "var(--lux-gold)", flex: "none" }}><Icon size={18} /></span>
                <div><div style={{ color: "var(--lux-ink)", fontWeight: 500, fontSize: 14 }}>{t.title}</div><div style={{ color: "var(--lux-ink-muted)", fontSize: 12 }}>{t.sub}</div></div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="py-14 md:py-[88px]">
        <div className="alignment">
          <SectionHeading eyebrow={sectionsMeta.eyebrow} title={sectionsMeta.title} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))", gap: 20 }}>
            {sections.map((s) => (
              <div key={s.id} className="lux-surface" style={{ borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <Link href={`/shop?section=${s.id}`} aria-label={`Browse ${s.name}`} style={{ position: "relative", display: "block", aspectRatio: "16/10", overflow: "hidden", background: "var(--lux-bg-3)" }}>
                  <Image src={s.image} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" style={{ objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, var(--lux-scrim) 100%)" }} />
                </Link>
                <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                  <Link href={`/shop?section=${s.id}`} className="font-display flex items-center justify-between gap-2" style={{ color: "var(--lux-ink)", fontSize: 20, textDecoration: "none" }}>{s.name}<span style={{ color: "var(--lux-gold)" }}>&rarr;</span></Link>
                  <p style={{ margin: 0, color: "var(--lux-ink-muted)", fontSize: 14, lineHeight: 1.6 }}>{s.blurb}</p>
                  {s.children.length > 0 && (
                    <div className="flex flex-wrap gap-2" style={{ marginTop: "auto", paddingTop: 6 }}>
                      {s.children.map((c) => <Link key={c.id} href={`/shop?section=${s.id}&sub=${c.id}`} style={{ padding: "6px 12px", borderRadius: 999, border: "1px solid var(--lux-line)", color: "var(--lux-ink)", fontSize: 12.5 }}>{c.name}</Link>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="py-14 md:py-[104px]">
        <div className="alignment grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr] md:gap-16">
          <div>
            <SectionHeading eyebrow={manifesto.eyebrow} title={manifesto.title} align="left" />
            <p style={{ maxWidth: 520, color: "var(--lux-ink-muted)", lineHeight: 1.7, fontSize: "var(--text-lead)", marginTop: -16 }}>{manifesto.body}</p>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "relative", aspectRatio: "4/5", borderRadius: 18, overflow: "hidden", border: "1px solid var(--lux-line)" }}>
              <Image src={manifesto.image} alt="Amber bottle in warm light" fill sizes="(max-width: 768px) 100vw, 40vw" style={{ objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: scrim }} />
            </div>
            <div className="lux-glass lux-glass--gold" style={{ position: "absolute", bottom: -24, left: -16, maxWidth: 210, padding: "16px 20px", borderRadius: 18 }}>
              <p className="font-display" style={{ fontStyle: "italic", color: "var(--lux-ink)", fontSize: 18, lineHeight: 1.3, margin: 0 }}>&ldquo;{manifesto.quote}&rdquo;</p>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section style={{ padding: "80px 0" }}>
        <div className="alignment">
          <SectionHeading eyebrow="The Collections" title="Shop by Category" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {categories.map((c) => (
              <Link key={c.name} href={`/shop?category=${encodeURIComponent(c.name)}`} style={{ position: "relative", display: "block", aspectRatio: "4/5", borderRadius: 18, overflow: "hidden", border: "1px solid var(--lux-line)" }}>
                <Image src={c.image} alt={c.name} fill sizes="(max-width: 768px) 100vw, 25vw" style={{ objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, var(--lux-scrim) 100%)" }} />
                <div className="flex items-center justify-between" style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 16 }}>
                  <h3 className="font-display" style={{ color: "#F5EEE3", fontSize: 18, margin: 0 }}>{c.name}</h3>
                  <span style={{ color: "var(--lux-gold)" }}>&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section style={{ padding: "80px 0" }}>
        <div className="alignment">
          <SectionHeading eyebrow="Maison Selections" title="Best Sellers" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 20 }}>
            {bestSellers.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section style={{ padding: "80px 0" }}>
        <div className="alignment">
          <SectionHeading eyebrow="In Their Words" title="What Our Patrons Say" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {testimonials.map((t) => <Testimonial key={t.name} {...t} />)}
          </div>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section style={{ padding: "96px 0" }}>
        <div className="alignment">
          <div className="lux-surface lux-glass--gold" style={{ position: "relative", overflow: "hidden", borderRadius: 26, padding: "80px 32px", textAlign: "center" }}>
            <Eyebrow>{cta.eyebrow}</Eyebrow>
            <h2 className="font-display" style={{ maxWidth: 640, margin: "20px auto 0", color: "var(--lux-ink)", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.01em", fontSize: "var(--text-display)", textWrap: "balance" }}>{cta.title}</h2>
            <p style={{ maxWidth: 520, margin: "20px auto 0", color: "var(--lux-ink-muted)", lineHeight: 1.7, fontSize: "var(--text-lead)" }}>{cta.body}</p>
            <div className="flex justify-center" style={{ marginTop: 36 }}><Button variant="outline" href="/shop">Shop the Collection</Button></div>
          </div>
        </div>
      </section>
    </>
  );
}
