-- Menambahkan kolom 'source' ke tabel current_prices
ALTER TABLE public.current_prices
ADD COLUMN source TEXT;