"use client";

import { useEffect, useSyncExternalStore } from "react";
import { meAction, signOutAction } from "@/app/actions/auth";
import type { AuthUser } from "@/lib/server/auth";

// Who is signed in. The truth lives in the httpOnly session cookie on the server; this is a client-side
// copy so the header and account pages can render without each asking again.

export type Session = AuthUser;

let state: Session | null | undefined; // undefined = not asked yet
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
};

export function setSession(next: Session | null) {
  state = next;
  emit();
}

function load() {
  if (started) return;
  started = true;
  meAction().then(setSession, () => setSession(null));
}

/** `undefined` until the server has answered, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const session = useSyncExternalStore(subscribe, () => state, () => undefined);
  useEffect(load, []);
  return session;
}

export async function signOut() {
  await signOutAction();
  setSession(null);
}
