-- Pastikan ekstensi yang dibutuhkan sudah aktif
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- FUNGSI TRIGGER DENGAN HAK AKSES KHUSUS
CREATE OR REPLACE FUNCTION notify_on_new_transaction()
RETURNS TRIGGER
-- [PERBAIKAN UTAMA] Menambahkan SET search_path dan SECURITY DEFINER
-- SET search_path: Memastikan fungsi ini dapat menemukan schema 'vault' dan 'extensions'.
-- SECURITY DEFINER: Menjalankan fungsi ini sebagai 'owner' (postgres), bukan sebagai 'authenticated' user.
SET search_path = extensions, vault, public
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  request_url TEXT := 'https://wrpgdrqydmicdxnpzthj.supabase.co/functions/v1/notify-on-new-transaction';
  api_key TEXT := vault.secret('service_role_key');
BEGIN
  PERFORM http_post(
    url := request_url,
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', api_key,
      'Authorization', 'Bearer ' || api_key
    )
  );
  RETURN NEW;
END;
$$;


-- TRIGGER (Tidak ada perubahan)
DROP TRIGGER IF EXISTS on_new_transaction_trigger ON public.transactions;