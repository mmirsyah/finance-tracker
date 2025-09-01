// src/app/page.tsx

"use client"; // Menandakan ini adalah Client Component

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const checkSessionAndRedirect = async () => {
      // Cek sesi pengguna di sisi klien
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Jika sudah login, ganti halaman ke dashboard
        router.replace('/dashboard');
      } else {
        // Jika belum login, ganti halaman ke login
        router.replace('/login');
      }
    };

    checkSessionAndRedirect();
  }, [router]);

  // Tampilkan halaman loading sederhana selagi proses redirect berjalan di latar belakang
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background-dark">
      <p className="text-gray-500 animate-pulse">Loading...</p>
    </div>
  );
};