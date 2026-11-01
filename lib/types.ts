export type Variant = { size: string; price: number };

export type Product = {
  id: string; // public slug
  title: string;
  arabic: string;
  image: string;
  hover: string;
  price: number; // lowest variant price (BDT)
  maxPrice: number; // highest variant price (BDT)
  category: string;
  family: string;
  tags: string[];
  bestseller?: boolean;
  stock: number;
  description: string;
  lasting: number;
  projection: string;
  concentration: string;
  origin: string;
  rating: number;
  reviews: number;
  variants: Variant[];
  active: boolean;
  section: string;
  sub: string;
  added: number; // higher = newer
  gallery: string[];
};

export type Discount = {
  id: string;
  name: string;
  scope: "product" | "category" | "all";
  target: string;
  type: "percent" | "fixed";
  value: number;
  sizes: string[];
  starts: string; // YYYY-MM-DD or ""
  ends: string;
  active: boolean;
};

export type PriceInfo = { size: string; original: number; price: number; saving: number; pct: number; rule: Discount | null };
export type CardPrice = { price: number; maxPrice: number; compareAt?: number; discountLabel?: string };
export type PricedProduct = Product & { card: CardPrice; onSale: boolean; sizes: PriceInfo[] };

export type Section = {
  id: string;
  name: string;
  blurb: string;
  image: string;
  count?: number; // active products in this section
  showSpecs?: boolean; // show the fragrance details table on product pages
  children: { id: string; name: string }[];
};

export type Category = { name: string; image: string };
export type Testimonial = { quote: string; name: string; location: string; rating: number };
export type TrustItem = { icon: string; title: string; sub: string };

export type SiteContent = {
  hero: { eyebrow: string; titleLine1: string; titleLine2: string; subtitle: string; image: string };
  trust: TrustItem[];
  manifesto: { eyebrow: string; title: string; body: string; image: string; quote: string };
  sectionsMeta: { eyebrow: string; title: string };
  sections: Section[];
  categories: Category[];
  testimonials: Testimonial[];
  cta: { eyebrow: string; title: string; body: string };
  footer: {
    description: string;
    address: string;
    phone: string;
    whatsapp: string;
    email: string;
    facebook: string;
    instagram: string;
  };
};
