import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_Myanmar } from "next/font/google";
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

const notoSansMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  weight: ["400", "500", "600", "700"],
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
