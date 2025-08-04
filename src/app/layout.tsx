// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import AppLayout from "@/components/layout/AppLayout";
import NextTopLoader from 'nextjs-toploader'; // <-- Import komponen

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Your journey to financial freedom",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        {/* === TAMBAHKAN LOADER DI SINI === */}
        <NextTopLoader
          color="#2563EB" // Warna biru, bisa Anda sesuaikan
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
};