import { createClient } from '@supabase/supabase-js'

// Pastikan variabel env ini ada di .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL atau Anon Key belum diset di .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
