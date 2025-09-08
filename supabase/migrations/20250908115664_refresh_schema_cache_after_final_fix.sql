-- Refresh cache schema setelah perbaikan fungsi RPC
-- Jalankan ini untuk memaksa PostgREST merefresh cache

SELECT pg_notify('pgrst', 'reload schema');

-- Jika masih ada masalah, restart PostgREST melalui dashboard Supabase:
-- Settings -> Database -> Reset database connection pool