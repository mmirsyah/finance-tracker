-- 1️⃣ Create the trigger function
CREATE OR REPLACE FUNCTION public.notify_on_new_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    payload json;
BEGIN
    -- Build a JSON payload like Supabase Realtime webhooks
    payload := json_build_object(
        'type', TG_OP,
        'record', row_to_json(NEW)
    );

    -- Send the payload to your external endpoint
    PERFORM http_post(
        'https://YOUR-WEBHOOK-URL.example.com',   -- <-- replace with your URL
        payload::text,
        'application/json',
        ''
    );

    RETURN NEW;   -- keep the inserted row
END;
$$;

-- 2️⃣ Attach the trigger to the transactions table
CREATE TRIGGER on_new_transaction_trigger
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_transaction();