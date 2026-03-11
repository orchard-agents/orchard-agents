import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Twitter MCP",
  description: "Twitter MCP server"
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
