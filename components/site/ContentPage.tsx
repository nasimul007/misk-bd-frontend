import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { contentPages, type ContentTopic } from "@/lib/content-pages";

export function ContentPage({ topic }: { topic: ContentTopic }) {
  const c = contentPages[topic];
  return (
    <div className="alignment" style={{ padding: "16px 24px 72px", color: "var(--lux-ink)", maxWidth: 820 }}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2" style={{ padding: "12px 0", fontSize: 14, color: "var(--lux-ink-muted)" }}>
        <Link href="/">Home</Link><ChevronRight size={13} /><span style={{ color: "var(--lux-ink)" }}>{c.title}</span>
      </nav>
      <header style={{ textAlign: "center", margin: "24px 0 40px" }}>
        <Eyebrow>{c.eyebrow}</Eyebrow>
        <h1 className="font-display" style={{ fontSize: "clamp(2rem,5vw,3rem)", margin: "12px 0 0", fontWeight: 500 }}>{c.title}</h1>
        <div className="lux-rule" style={{ maxWidth: 110, margin: "20px auto 0" }} />
      </header>
      {c.points.length > 0 && (
        <ul className="lux-surface lux-glass--gold" style={{ borderRadius: 18, padding: 24, marginBottom: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16, listStyle: "none" }}>
          {c.points.map((pt) => (
            <li key={pt} className="flex items-center gap-[10px]" style={{ fontSize: 14 }}>
              <Check size={16} color="var(--lux-gold)" aria-hidden /> {pt}
            </li>
          ))}
        </ul>
      )}
      {c.body.map((para, i) => (
        <p key={i} style={{ color: "var(--lux-ink-muted)", lineHeight: 1.8, fontSize: 16, marginBottom: 18 }}>{para}</p>
      ))}
      <div style={{ marginTop: 28 }}><Button variant="outline" href="/shop">Explore the Collection</Button></div>
    </div>
  );
}
