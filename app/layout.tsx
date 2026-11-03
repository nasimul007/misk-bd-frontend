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

// Applies the saved day/night mode before first paint to avoid a flash.
const modeScript = `try{if(localStorage.getItem("misk_mode")==="day")document.body.dataset.lux="day"}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bodoni.variable} ${poppins.variable}`}>
      <body data-lux="oxblood" className="lux-shell min-h-screen" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: modeScript }} />
        {children}
      </body>
    </html>
  );
}
