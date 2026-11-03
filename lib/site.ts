/** The public address of the site, used for absolute links in the sitemap, share cards and structured data. */
export const SITE_URL = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");
export const SITE_NAME = "MISK BD";
export const SITE_DESCRIPTION = "A small attempt to share the elegance of the Sunnah. Authentic attar, oud and perfumes from Dhaka, delivered across Bangladesh.";
/** Shown when a page is shared and has no picture of its own. */
export const DEFAULT_SHARE_IMAGE = "/images/prod-4.jpeg";

/** JSON for a <script type="application/ld+json">. "<" is escaped so no field can close the tag early. */
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
