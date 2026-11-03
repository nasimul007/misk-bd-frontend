import type { Metadata } from "next";
import { NotFoundView } from "@/components/site/NotFoundView";

export const metadata: Metadata = { title: "Page not found — MISK BD", robots: { index: false } };

// Addresses that match no page at all. This sits outside the shop layout, so it brings its own logo.
export default function NotFound() {
  return <NotFoundView withLogo />;
}
