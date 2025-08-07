// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import AppLayout from "@/components/layout/AppLayout";
import NextTopLoader from 'nextjs-toploader';
import { Toaster } from 'react-hot-toast'; // <-- 1. Import Toaster

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
        {/* === LOADER === */}
        <NextTopLoader
          color="#2563EB"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />
        {/* === 2. TAMBAHKAN TOASTER DI SINI === */}
        <Toaster 
          position="top-center"
          reverseOrder={false}
        />
        <AppLayout>
          {children}
        </AppLayout>
      </body>
    </html>
  );
};