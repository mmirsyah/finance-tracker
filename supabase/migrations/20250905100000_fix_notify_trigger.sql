-- Description: Reverts the trigger function to a correct implementation to fix http_post error.
-- Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- 1️⃣ Create the trigger function (Correct Implementation for Production)
CREATE OR REPLACE FUNCTION public.notify_on_new_transaction()
RETURNS TRIGGER
SET search_path = extensions, vault, public
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  -- Production Supabase URL
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

-- 2️⃣ Attach the trigger to the transactions table
-- We ensure the trigger is fresh by dropping it if it exists
DROP TRIGGER IF EXISTS on_new_transaction_trigger ON public.transactions;
CREATE TRIGGER on_new_transaction_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_transaction();