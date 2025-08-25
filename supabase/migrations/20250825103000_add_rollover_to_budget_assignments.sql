ALTER TABLE public.budget_assignments
ADD COLUMN rollover_amount NUMERIC NOT NULL DEFAULT 0;
