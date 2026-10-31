"use client";

import { useMemo, useSyncExternalStore } from "react";

// Demo sign-in. There is no server yet, so nothing here is verified: the "session" is just a profile
// kept in this browser. The real flow (OTP via SMS, password hashing, Google OAuth, httpOnly cookie)
// belongs on the backend; swap this module's functions for API calls and the UI stays as is.

export type Session = { name: string; phone: string; email: string; method: "phone" | "email" | "google" };
export type Address = { id: string; label: string; text: string };

const SESSION_KEY = "misk_session_v1";
const ADDRESS_KEY = "misk_addresses_v1";
const EVENT = "misk-local";

const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
};
const readKey = (key: string) => (): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const writeKey = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
    window.dispatchEvent(new Event(EVENT));
  } catch {}
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

/** `undefined` until the browser has been read, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const raw = useSyncExternalStore(subscribe, readKey(SESSION_KEY), () => undefined);
  return useMemo(() => {
    if (raw === undefined) return undefined;
    try {
      const s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== "object") return null;
      const method = s.method === "email" || s.method === "google" ? s.method : "phone";
      return { name: str(s.name, 80), phone: str(s.phone, 30), email: str(s.email, 120), method } as Session;
    } catch {
      return null;
    }
  }, [raw]);
}

export const signIn = (session: Session) => writeKey(SESSION_KEY, JSON.stringify(session));
export const signOut = () => writeKey(SESSION_KEY, null);

export function useAddresses(): Address[] {
  const raw = useSyncExternalStore(subscribe, readKey(ADDRESS_KEY), () => null);
  return useMemo(() => {
    try {
      const list = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];
      return list
        .filter((a) => a && typeof a.id === "string" && typeof a.text === "string")
        .map((a) => ({ id: a.id as string, label: str(a.label, 30) || "Address", text: str(a.text, 300) }));
    } catch {
      return [];
    }
  }, [raw]);
}

export const saveAddresses = (list: Address[]) => writeKey(ADDRESS_KEY, JSON.stringify(list.slice(0, 10)));
