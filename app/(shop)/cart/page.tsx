import type { Metadata } from "next";
import { CartPage } from "@/components/cart/CartPage";

export const metadata: Metadata = { title: "Your Cart — MISK BD" };

export default function Page() {
  return <CartPage />;
}
