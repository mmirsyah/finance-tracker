// src/app/layout.tsx

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

import NextTopLoader from 'nextjs-toploader';
// Perbaikan: Ganti import ke 'sonner'
import { Toaster } from 'sonner';

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
      <body className={`${inter.className} bg-background`}>

        <NextTopLoader
          color= 'bg-primary'
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
        />

        {/* AppLayout sudah tidak ada di sini lagi */}
        {children}

        {/* Perbaikan: Gunakan Toaster dari sonner. 
            Atribut 'richColors' akan memberikan warna otomatis (hijau untuk sukses, merah untuk error) */}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
};