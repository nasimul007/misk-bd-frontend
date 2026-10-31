"use client";

import { useSyncExternalStore } from "react";
import { money, type Currency } from "@/lib/format";

const KEY = "misk_currency";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(): Currency {
  try {
    return localStorage.getItem(KEY) === "USD" ? "USD" : "BDT";
  } catch {
    return "BDT";
  }
}

export function setCurrency(next: Currency) {
  try { localStorage.setItem(KEY, next); } catch {}
  listeners.forEach((l) => l());
}

/** Display currency. Prices are always stored and charged in BDT; USD is a reference view. */
export const useCurrency = (): Currency => useSyncExternalStore(subscribe, read, () => "BDT" as Currency);

/** `money` bound to the shopper's chosen display currency. */
export function useMoney() {
  const currency = useCurrency();
  return (amount: number) => money(amount, currency);
}
