import type { Metadata } from "next";
import { Bodoni_Moda, Poppins } from "next/font/google";
import "./globals.css";

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
  title: "MISK BD — Maison de Parfum, Bangladesh",
  description:
    "A small attempt to share the elegance of the Sunnah. Authentic attar, oud and perfumes from Dhaka.",
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
