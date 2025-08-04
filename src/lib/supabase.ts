// src/lib/supabase.ts

import { createBrowserClient } from '@supabase/ssr'

// Definisikan tipe untuk variabel environment agar lebih aman
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Pastikan variabel environment ada sebelum membuat client
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL atau Anon Key belum diset di .env.local')
}

// Kita menggunakan createBrowserClient karena ini akan digunakan di Client Components ("use client")
// Ini adalah cara modern yang direkomendasikan oleh Supabase untuk Next.js App Router
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)