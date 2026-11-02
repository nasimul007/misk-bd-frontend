import { TRUST_ICON_NAMES } from "@/lib/trust-icon-names";
import type { SiteContent } from "@/lib/types";

// Validation for the owner-editable storefront blocks. Everything arrives from a browser, so each block is
// rebuilt field by field: wrong types become empty strings, lengths are capped, images must be site paths
// and links must be https. The same function checks data on the way in and again when it is read back.

export const BLOCK_KEYS = ["hero", "trust", "manifesto", "sectionsMeta", "categories", "testimonials", "cta", "footer", "policy"] as const;
export type BlockKey = (typeof BLOCK_KEYS)[number];

type Parsed<K extends BlockKey> = SiteContent[K];
export type BlockResult<K extends BlockKey = BlockKey> = { ok: true; data: Parsed<K> } | { ok: false; error: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const imageOk = (v: string) => v === "" || (v.length <= 300 && /^\/[\w./-]+$/.test(v) && !v.includes(".."));
const urlOk = (v: string) => v === "" || (v.length <= 300 && /^https:\/\/[^\s<>"']+$/.test(v));

export function parseBlock(key: string, raw: unknown): BlockResult {
  const d = obj(raw);
  switch (key) {
    case "hero": {
      const image = str(d.image, 300);
      if (!imageOk(image)) return { ok: false, error: "The hero image must be uploaded or a file already on the site." };
      const data = { eyebrow: str(d.eyebrow, 80), titleLine1: str(d.titleLine1, 80), titleLine2: str(d.titleLine2, 80), subtitle: str(d.subtitle, 300), image };
      if (!data.titleLine1) return { ok: false, error: "Enter the first headline line." };
      return { ok: true, data };
    }
    case "trust": {
      const data = arr(d.items ?? raw, 6).map((i) => {
        const o = obj(i);
        const icon = str(o.icon, 30);
        return { icon: TRUST_ICON_NAMES.includes(icon) ? icon : "shield-check", title: str(o.title, 40), sub: str(o.sub, 60) };
      });
      if (data.some((t) => !t.title)) return { ok: false, error: "Every trust item needs a title." };
      return { ok: true, data };
    }
    case "manifesto": {
      const image = str(d.image, 300);
      if (!imageOk(image)) return { ok: false, error: "The image must be uploaded or a file already on the site." };
      const data = { eyebrow: str(d.eyebrow, 60), title: str(d.title, 120), body: str(d.body, 1200), image, quote: str(d.quote, 200) };
      if (!data.title) return { ok: false, error: "Enter a title." };
      return { ok: true, data };
    }
    case "sectionsMeta":
      return { ok: true, data: { eyebrow: str(d.eyebrow, 60), title: str(d.title, 120) } };
    case "categories": {
      const data = arr(d.items ?? raw, 12).map((i) => {
        const o = obj(i);
        return { name: str(o.name, 40), image: str(o.image, 300) };
      });
      if (data.some((c) => !c.name)) return { ok: false, error: "Every category needs a name." };
      if (data.some((c) => !imageOk(c.image))) return { ok: false, error: "Category images must be uploaded or files already on the site." };
      if (new Set(data.map((c) => c.name.toLowerCase())).size !== data.length) return { ok: false, error: "Category names must be different." };
      return { ok: true, data };
    }
    case "testimonials": {
      const data = arr(d.items ?? raw, 12).map((i) => {
        const o = obj(i);
        const rating = typeof o.rating === "number" ? o.rating : Number(o.rating);
        return { quote: str(o.quote, 400), name: str(o.name, 60), location: str(o.location, 60), rating: Number.isFinite(rating) ? Math.min(5, Math.max(1, Math.round(rating))) : 5 };
      });
      if (data.some((t) => !t.quote || !t.name)) return { ok: false, error: "Every testimonial needs a quote and a name." };
      return { ok: true, data };
    }
    case "cta": {
      const data = { eyebrow: str(d.eyebrow, 60), title: str(d.title, 120), body: str(d.body, 400) };
      if (!data.title) return { ok: false, error: "Enter a title." };
      return { ok: true, data };
    }
    case "footer": {
      const data = {
        description: str(d.description, 300), address: str(d.address, 160), phone: str(d.phone, 30),
        whatsapp: str(d.whatsapp, 20).replace(/\D/g, ""), email: str(d.email, 120), facebook: str(d.facebook, 300), instagram: str(d.instagram, 300),
      };
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { ok: false, error: "Enter a valid email address." };
      if (!urlOk(data.facebook) || !urlOk(data.instagram)) return { ok: false, error: "Social links must start with https://." };
      return { ok: true, data };
    }
    case "policy": {
      const when = str(d.customerCancel, 12);
      const days = typeof d.returnDays === "number" ? d.returnDays : Number(d.returnDays);
      if (when !== "pending" && when !== "confirmed" && when !== "off") return { ok: false, error: "Choose when customers may cancel." };
      if (!Number.isInteger(days) || days < 0 || days > 60) return { ok: false, error: "The return window must be a whole number of days, 0 to 60." };
      return { ok: true, data: { customerCancel: when, returnDays: days } };
    }
    default:
      return { ok: false, error: "Unknown content block." };
  }
}
