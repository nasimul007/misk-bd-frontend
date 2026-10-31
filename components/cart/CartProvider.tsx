"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart";
import { CartDrawer } from "./CartDrawer";
import { CartToast } from "./CartToast";

/** Loads the saved cart after hydration and hosts the drawer and toast. Mount once, in the layout. */
export function CartProvider() {
  useEffect(() => {
    useCart.persist.rehydrate();
  }, []);
  return (
    <>
      <CartToast />
      <CartDrawer />
    </>
  );
}
