
-- Buat tabel untuk menyimpan langganan push notification
CREATE TABLE public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tambahkan komentar untuk menjelaskan tujuan tabel
COMMENT ON TABLE public.push_subscriptions IS 'Menyimpan data langganan Web Push API untuk setiap pengguna.';

-- Aktifkan Row Level Security (RLS) untuk keamanan
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Buat kebijakan (policies) untuk RLS

-- 1. Pengguna bisa memasukkan (INSERT) langganan mereka sendiri.
CREATE POLICY "Allow users to insert their own subscriptions" 
ON public.push_subscriptions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Pengguna bisa melihat (SELECT) langganan mereka sendiri.
CREATE POLICY "Allow users to select their own subscriptions" 
ON public.push_subscriptions FOR SELECT 
USING (auth.uid() = user_id);

-- 3. Pengguna bisa menghapus (DELETE) langganan mereka sendiri.
CREATE POLICY "Allow users to delete their own subscriptions" 
ON public.push_subscriptions FOR DELETE 
USING (auth.uid() = user_id);

-- 4. Izinkan service_role (digunakan oleh Edge Functions) untuk membaca semua langganan untuk mengirim notifikasi.
-- Ini penting agar fungsi backend bisa mengirim notifikasi ke pengguna lain.
CREATE POLICY "Allow service_role to read all subscriptions" 
ON public.push_subscriptions FOR SELECT 
USING (auth.role() = 'service_role');

