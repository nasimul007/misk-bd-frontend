"use client";

import { ErrorView } from "@/components/site/ErrorView";

export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView reset={reset} withLogo />;
}
