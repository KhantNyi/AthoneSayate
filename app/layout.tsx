import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "athonesayate Expense Tracker",
  description: "A practical expense tracker dashboard built with Next.js and Supabase."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
