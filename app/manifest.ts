import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Maison de Parfum`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#140d0a",
    theme_color: "#140d0a",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
