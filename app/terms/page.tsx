import type { Metadata } from "next";
import { ContentPage } from "@/components/site/ContentPage";
import { contentPages } from "@/lib/content-pages";

const page = contentPages.terms;

export const metadata: Metadata = { title: `${page.title} — MISK BD`, description: page.description };

export default function Page() {
  return <ContentPage topic="terms" />;
}
