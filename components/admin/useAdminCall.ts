"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Reply = { ok: boolean; error?: string };

/** Runs a server action with a busy flag, an error message and a refresh of the page's data on success. */
export function useAdminCall() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const run = async (call: () => Promise<Reply>, success = "Saved."): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const r = await call();
      if (r.ok) { setNote(success); router.refresh(); setBusy(false); return true; }
      setError(r.error ?? "That didn't work.");
    } catch {
      setError("We couldn't reach the server. Please try again.");
    }
    setBusy(false);
    return false;
  };
  return { run, busy, error, note, clear: () => { setError(""); setNote(""); } };
}
