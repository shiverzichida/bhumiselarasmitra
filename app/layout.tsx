import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bhumi Docs Workspace",
  description: "Production-ready shipment document workspace for Bill of Lading, Shipping Instruction, and Invoice.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
