import type { Discount, Product, SiteContent, Variant } from "@/lib/types";

const img = (name: string) => `/images/${name}`;
const r50 = (n: number) => Math.round(n / 50) * 50;

// Attar sizes: every scent ships as 1ml / 3ml / 6ml / 12ml. `base6` is the 6ml price.
const variantsFor = (base6: number): Variant[] => [
  { size: "1ml", price: r50(base6 * 0.2) },
  { size: "3ml", price: r50(base6 * 0.55) },
  { size: "6ml", price: base6 },
  { size: "12ml", price: r50(base6 * 1.85) },
];

type Base = Omit<Product, "variants" | "price" | "maxPrice" | "active" | "section" | "sub" | "added" | "gallery"> & { base6: number };

const base: Base[] = [
  { id: "luxury-mens-cologne", title: "Luxury Men's Cologne", arabic: "عطر الرجال", image: img("product-1.jpg"), hover: img("prod-7.jpeg"), base6: 3500, category: "Men's Perfume", family: "Oud & Amber", tags: ["best seller", "premium", "cologne"], bestseller: true, stock: 30, description: "Premium luxury fragrance for the elite — an opulent oud heart wrapped in amber and warm spice.", lasting: 12, projection: "Strong", concentration: "Extrait de Parfum", origin: "Assam & Cambodia oud", rating: 4.8, reviews: 42 },
  { id: "elegant-womens-perfume", title: "Elegant Women's Perfume", arabic: "عطر الأناقة", image: img("product-2.jpg"), hover: img("prod-8.jpeg"), base6: 2200, category: "Women's Perfume", family: "Rose & Musk", tags: ["best seller", "elegant"], bestseller: true, stock: 25, description: "A delicate and feminine scent that captivates — rose absolute over musk and soft vanilla.", lasting: 8, projection: "Moderate", concentration: "Eau de Parfum", origin: "Ta'if rose", rating: 4.7, reviews: 31 },
  { id: "unisex-signature-scent", title: "Unisex Signature Scent", arabic: "العطر المميز", image: img("product-3.jpg"), hover: img("prod-9.jpeg"), base6: 2800, category: "Unisex", family: "Woods & Incense", tags: ["signature", "versatile"], stock: 4, description: "A versatile fragrance perfect for any occasion — bergamot, cedar and a whisper of incense.", lasting: 10, projection: "Moderate", concentration: "Eau de Parfum", origin: "Somali frankincense", rating: 4.6, reviews: 18 },
  { id: "classic-mens-cologne", title: "Classic Men's Cologne", arabic: "الكلاسيك", image: img("prod-4.jpeg"), hover: img("product-1.jpg"), base6: 2300, category: "Men's Perfume", family: "Citrus & Leather", tags: ["classic", "timeless", "cologne"], stock: 45, description: "Timeless classic fragrance for distinguished men — bergamot, tobacco leaf and worn leather.", lasting: 9, projection: "Moderate", concentration: "Eau de Parfum", origin: "Sicilian bergamot", rating: 4.5, reviews: 27 },
  { id: "floral-womens-perfume", title: "Floral Women's Perfume", arabic: "الزهري", image: img("prod-5.jpeg"), hover: img("product-2.jpg"), base6: 2400, category: "Women's Perfume", family: "White Florals", tags: ["floral", "fresh"], stock: 38, description: "Fresh floral notes that bloom throughout the day — jasmine, tuberose and green stems.", lasting: 7, projection: "Soft", concentration: "Eau de Toilette", origin: "Grasse jasmine", rating: 4.4, reviews: 22 },
  { id: "modern-unisex-fragrance", title: "Modern Unisex Fragrance", arabic: "العصري", image: img("prod-6.jpeg"), hover: img("product-3.jpg"), base6: 2600, category: "Unisex", family: "Woods & Incense", tags: ["modern", "contemporary"], stock: 42, description: "Contemporary scent for the modern individual — vetiver, mineral musk and dry cedar.", lasting: 8, projection: "Moderate", concentration: "Eau de Parfum", origin: "Haitian vetiver", rating: 4.6, reviews: 15 },
  { id: "premium-mens-cologne", title: "Premium Men's Cologne", arabic: "الفاخر", image: img("prod-7.jpeg"), hover: img("prod-4.jpeg"), base6: 2500, category: "Men's Perfume", family: "Oud & Amber", tags: ["best seller", "men", "cologne"], bestseller: true, stock: 50, description: "A sophisticated and bold fragrance for the modern gentleman — smoky oud and labdanum.", lasting: 10, projection: "Strong", concentration: "Extrait de Parfum", origin: "Cambodian oud", rating: 4.9, reviews: 55 },
  { id: "romantic-womens-perfume", title: "Romantic Women's Perfume", arabic: "الرومانسي", image: img("prod-8.jpeg"), hover: img("product-2.jpg"), base6: 2100, category: "Women's Perfume", family: "Rose & Musk", tags: ["romantic", "enchanting"], stock: 50, description: "Romantic and enchanting fragrance — lychee, peony and a powdery musk drydown.", lasting: 7, projection: "Soft", concentration: "Eau de Parfum", origin: "Bulgarian rose", rating: 4.5, reviews: 29 },
];

export const products: Product[] = base.map(({ base6, ...p }, i) => {
  const variants = variantsFor(base6);
  const prices = variants.map((v) => v.price);
  return {
    ...p,
    variants,
    price: Math.min(...prices),
    maxPrice: Math.max(...prices),
    active: true,
    section: "oil-fragrances",
    sub: "",
    added: base.length - i,
    gallery: [p.image, p.hover, p.image],
  };
});

// Owner-set sale rules. A product rule beats a category rule, which beats a storewide rule;
// within a level the bigger saving wins.
export const discounts: Discount[] = [
  { id: "d-rose-week", name: "Rose Week", scope: "category", target: "Women's Perfume", type: "percent", value: 15, sizes: [], starts: "", ends: "", active: true },
  { id: "d-premium-12ml", name: "12ml Collector Offer", scope: "product", target: "premium-mens-cologne", type: "fixed", value: 500, sizes: ["12ml"], starts: "", ends: "", active: true },
];

export const siteContent: SiteContent = {
  hero: {
    eyebrow: "Maison de Parfum · Bangladesh",
    titleLine1: "A Small Attempt to Share",
    titleLine2: "the Elegance of the Sunnah",
    subtitle: "An exquisite collection of authentic fragrances — classic to contemporary. Find the scent that becomes your signature.",
    image: img("prod-4.jpeg"),
  },
  trust: [
    { icon: "shield-check", title: "100% Authentic", sub: "Sourced & sealed" },
    { icon: "truck", title: "Nationwide Delivery", sub: "1–5 days across BD" },
    { icon: "banknote", title: "Cash on Delivery", sub: "Pay at your door" },
    { icon: "undo-2", title: "7-Day Returns", sub: "Easy & fair" },
  ],
  manifesto: {
    eyebrow: "The House",
    title: "A fragrance is a memory you can wear.",
    body: "Every bottle in the Misk BD collection is chosen for its character — the way it opens, the way it lingers, the way it becomes unmistakably yours. We source authentic scents and present them the way they deserve to be met: unhurried, and with intent.",
    image: img("prod-6.jpeg"),
    quote: "Scent is the closest thing we have to time travel.",
  },
  sectionsMeta: { eyebrow: "Our Collections", title: "Explore the House" },
  sections: [
    { id: "oil-fragrances", name: "Oil Fragrances", blurb: "Concentrated alcohol-free attars in 1ml to 12ml bottles.", image: img("prod-7.jpeg"), children: [] },
    { id: "natural-oils", name: "Natural Oils", blurb: "Pure botanical oils, distilled and left unblended.", image: img("prod-5.jpeg"), children: [] },
    { id: "misk-originals", name: "Misk Originals", blurb: "Signature blends composed in-house by Misk BD.", image: img("product-1.jpg"), children: [] },
    { id: "solid-perfumes", name: "Solid Perfumes", blurb: "Balm-style fragrance that travels well and wears close to the skin.", image: img("prod-6.jpeg"), children: [] },
    { id: "bakhoor-and-burners", name: "Bakhoor and Burners", blurb: "Everything for the ritual of incense, from burners to charcoal.", image: img("prod-9.jpeg"), children: [{ id: "incense-burner", name: "Incense Burner" }, { id: "incense-cones", name: "Incense Cones" }, { id: "bakhoor", name: "Bakhoor" }, { id: "oud", name: "Oud" }, { id: "charcoal", name: "Charcoal" }] },
    { id: "misk-special", name: "Misk Special", blurb: "Limited editions, gift sets and seasonal selections.", image: img("product-3.jpg"), children: [] },
  ],
  categories: [
    { name: "Men's Perfume", image: img("prod-7.jpeg") },
    { name: "Women's Perfume", image: img("prod-8.jpeg") },
    { name: "Unisex", image: img("prod-9.jpeg") },
    { name: "Premium", image: img("prod-4.jpeg") },
  ],
  testimonials: [
    { quote: "Absolutely love the fragrances from Misk BD! The quality is exceptional and the scents last all day. My favourite perfume house now.", name: "Sarah Johnson", location: "Dhaka, Bangladesh", rating: 5 },
    { quote: "Great collection of premium perfumes. Fast delivery and excellent customer service. Highly recommended.", name: "Ahmed Rahman", location: "Chittagong, Bangladesh", rating: 5 },
    { quote: "Authentic products, wonderful packaging. The gift sets make perfect presents. Very satisfied.", name: "Mohammad Hassan", location: "Rajshahi, Bangladesh", rating: 5 },
  ],
  cta: {
    eyebrow: "Your Signature Awaits",
    title: "Find the fragrance that becomes you.",
    body: "Browse the complete collection and discover scents chosen to match your character — and remembered long after you leave.",
  },
  footer: {
    description: "Your trusted destination for authentic attar & perfume. Discover scents chosen for their character — and remembered long after you leave.",
    address: "12 Gulshan Ave, Dhaka 1212",
    phone: "+880 1344 460 349",
    whatsapp: "8801344460349",
    email: "contact@miskbd.com",
    facebook: "https://www.facebook.com/miskbdperfume",
    instagram: "https://www.instagram.com/misk.bd",
  },
};
