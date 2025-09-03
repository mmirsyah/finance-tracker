CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION notify_on_new_transaction()
RETURNS TRIGGER AS $$
DECLARE
  request_url TEXT := 'https://wrpgdrqydmicdxnpzthj.supabase.co/functions/v1/notify-on-new-transaction';
  api_key TEXT := eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndycGdkcnF5ZG1pY2R4bnB6dGhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NjUxMzIsImV4cCI6MjA2OTU0MTEzMn0.Hg16ONQgGva77oPQAOcnLac8xCWuRXB9gtqaRVhiQOg;
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

DROP TRIGGER IF EXISTS on_new_transaction_trigger ON public.transactions;

CREATE TRIGGER on_new_transaction_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION notify_on_new_transaction();
