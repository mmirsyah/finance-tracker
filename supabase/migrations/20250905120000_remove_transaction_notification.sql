-- Description: Permanently removes the transaction notification trigger and its associated function.

-- 1. Drop the trigger from the transactions table
DROP TRIGGER IF EXISTS on_new_transaction_trigger ON public.transactions;

-- 2. Drop the function that the trigger used to call
DROP FUNCTION IF EXISTS public.notify_on_new_transaction();
