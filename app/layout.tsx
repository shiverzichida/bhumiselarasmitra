import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PT. Bhumi Selaras Mitra | Forwarding Terminal Kijing Mempawah",
  description: "Layanan trucking, dokumen ekspor-impor, customs clearance, stuffing, dan forwarding kontainer dari Terminal Kijing, Pelabuhan Mempawah.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
