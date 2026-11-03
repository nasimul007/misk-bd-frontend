import type { MetadataRoute } from "next";
import { getProducts, getSiteContent } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

// Public pages only. Private ones (cart, checkout, accounts, orders, admin) are left out on purpose.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, content] = await Promise.all([getProducts(), getSiteContent()]);
  const page = (path: string, priority: number, changeFrequency: "daily" | "weekly" | "monthly" = "weekly"): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, changeFrequency, priority });
  return [
    page("/", 1, "daily"),
    page("/shop", 0.9, "daily"),
    page("/shop?best=1", 0.7),
    ...content.sections.map((s) => page(`/shop?section=${s.id}`, 0.7)),
    ...products.map((p) => ({ ...page(`/product/${p.id}`, 0.8), lastModified: new Date(p.added) })),
    ...["authenticity", "shipping", "returns", "about", "warranty", "terms", "privacy"].map((p) => page(`/${p}`, 0.4, "monthly")),
  ];
}
