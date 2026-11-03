import type { Metadata } from "next";
import { NotFoundView } from "@/components/site/NotFoundView";

export const metadata: Metadata = { title: "Page not found — MISK BD", robots: { index: false } };

// A page inside the shop that called notFound() (for example a product that was removed). Shown inside the normal header and footer.
export default function NotFound() {
  return <NotFoundView />;
}
