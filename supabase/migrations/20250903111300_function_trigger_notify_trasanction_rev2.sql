-- Bagian 1: Mengaktifkan ekstensi Supabase Vault di dalam schema 'vault'
-- Ini akan membuat "laci" untuk menyimpan secret Anda.
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


-- Bagian 2: Memperbaiki Fungsi Trigger Anda
-- Kita mengganti cara pemanggilan secret agar sesuai dengan standar.
CREATE OR REPLACE FUNCTION notify_on_new_transaction()
RETURNS TRIGGER AS $$
DECLARE
  request_url TEXT := 'https://wrpgdrqydmicdxnpzthj.supabase.co/functions/v1/notify-on-new-transaction';
  
  -- [PERBAIKAN UTAMA] Memanggil secret dari schema 'vault' yang benar.
  -- Bukan 'supabase_vault.secret' tetapi 'vault.secret'.
  api_key TEXT := vault.secret('service_role_key');
BEGIN
  PERFORM extensions.http_post(
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
$$ LANGUAGE plpgsql;


-- Bagian 3: Memastikan Trigger tetap terpasang dengan benar
-- (Tidak ada perubahan di sini, hanya untuk kelengkapan)
DROP TRIGGER IF EXISTS on_new_transaction_trigger ON public.transactions;

CREATE TRIGGER on_new_transaction_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_transaction();