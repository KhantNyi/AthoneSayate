import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "./skin.css";

// One sans for body and headings (skin.css aliases --font-display to it),
// plus a mono for labels, deltas and chart axes.
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap"
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap"
});

// Self-hosted (variable weight, SIL OFL): Google Fonts now serves this family
// from extension-less "kit" URLs that next/font/google cannot parse.
const notoSansMyanmar = localFont({
  src: "./fonts/noto-sans-myanmar-wght.woff2",
  weight: "100 900",
  variable: "--font-myanmar",
  display: "swap"
});

export const metadata: Metadata = {
  title: "athonesayate Expense Tracker",
  description: "A practical expense tracker dashboard built with Next.js and Supabase.",
  applicationName: "Athonesayate",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Athonesayate"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }
  ]
};

const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem("athonesayate-theme");
    var dark = stored !== "light";
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${notoSansMyanmar.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
