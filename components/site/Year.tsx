"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Current year. Empty during prerender, filled on the client, so no stale date is baked in. */
export function Year() {
  const year = useSyncExternalStore(subscribe, () => String(new Date().getFullYear()), () => "");
  return <span>{year}</span>;
}
