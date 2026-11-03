"use client";

import { ErrorView } from "@/components/site/ErrorView";

export default function ShopError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} />;
}
