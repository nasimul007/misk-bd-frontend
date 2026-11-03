import type { Metadata } from "next";
import { Bodoni_Moda, Poppins } from "next/font/google";
import "./globals.css";
import { DEFAULT_SHARE_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins-nf",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MISK BD — Maison de Parfum, Bangladesh",
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_BD", title: "MISK BD — Maison de Parfum, Bangladesh", description: SITE_DESCRIPTION, images: [{ url: DEFAULT_SHARE_IMAGE, alt: "MISK BD attar and perfume" }] },
  twitter: { card: "summary_large_image", title: "MISK BD — Maison de Parfum, Bangladesh", description: SITE_DESCRIPTION, images: [DEFAULT_SHARE_IMAGE] },
};

// Applies the saved day/night mode before first paint to avoid a flash. The browser runs this script while it
// parses the page (it sits first inside <body>), so the right colours are there before anything is drawn.
// It is written as markup inside a hidden element rather than as a <script> element in the component, because
// React warns whenever it creates a script element itself on the client, and it never needs to: a later
// re-render must not (and cannot) run it again.
const modeScript = `<script>try{if(localStorage.getItem("misk_mode")==="day")document.body.dataset.lux="day"}catch(e){}</script>`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodoni.variable} ${poppins.variable}`}>
      <body data-lux="oxblood" className="lux-shell min-h-screen" suppressHydrationWarning>
        <div hidden suppressHydrationWarning dangerouslySetInnerHTML={{ __html: modeScript }} />
        <a href="#main" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
