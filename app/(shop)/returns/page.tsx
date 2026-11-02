import type { Metadata } from "next";
import { ContentPage } from "@/components/site/ContentPage";
import { returnsPage } from "@/lib/content-pages";
import { getSiteContent } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const page = returnsPage((await getSiteContent()).policy);
  return { title: `${page.title} — MISK BD`, description: page.description };
}

export default async function Page() {
  return <ContentPage topic="returns" data={returnsPage((await getSiteContent()).policy)} />;
}
