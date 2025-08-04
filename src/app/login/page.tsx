// src/app/login/page.tsx

"use client";
import { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Jika pengguna berhasil login, arahkan ke halaman transaksi
        router.push('/dashboard');
      }
    });

    return () => {
      // Hentikan listener saat komponen dilepas
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Money Management</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          // BARIS DI BAWAH INI KITA HAPUS UNTUK MEMPERBAIKI ERROR
          // redirectTo={`${window.location.origin}/auth/callback`} 
        />
      </div>
    </div>
  );
}