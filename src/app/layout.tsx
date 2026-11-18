import type { Metadata } from "next";
import { Inter, Playfair_Display, Nunito } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const nunito = Nunito({ subsets: ["latin"], variable: "--font-nunito", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Euclid Engine | Math Worksheet Generator",
  description: "Generate fresh, mathematically correct math worksheets with answer keys. Pick topics, set difficulty, preview, and print PDFs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} ${nunito.variable} h-full antialiased`}
    >
      <head>
        {/* Throwaway probe branch, never merged: ?probe=360 lays the page out
            as if the screen were 360 CSS px wide. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var m=/[?&]probe=(\\d+)/.exec(location.search);if(m){sessionStorage.setItem('probe',m[1]);}var w=+(sessionStorage.getItem('probe')||0);if(w){document.documentElement.style.zoom=String(window.innerWidth/w);}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
