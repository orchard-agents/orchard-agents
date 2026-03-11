import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orchard Street Agent",
  description: "Web-based AI agent for managing Twitter presence"
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
