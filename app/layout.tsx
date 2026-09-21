import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { HeaderBehavior } from "../components/HeaderBehavior";
import { ScrollReset } from "../components/ScrollReset";

const manrope = Manrope({
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-plex",
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
});

const baseUrl = "https://bnbtokenmaker.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: "BNB Token Maker — Create a BEP-20 Token on BNB Smart Chain",
  description:
    "Create a BEP-20 token on BNB Smart Chain in minutes. A no-code generator with full control over supply, ownership and security. No smart contracts required.",
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const themeInit = `(function(){try{var t=localStorage.getItem('btm-theme')||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t)}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
        <meta name="theme-color" content="#f7f6f2" />
      </head>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <HeaderBehavior />
        <ScrollReset />
      </body>
    </html>
  );
}