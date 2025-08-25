-- This is the final, production-ready version of the rollover function.

-- First, drop the function if it exists to ensure a clean slate from any previous debug versions.
DROP FUNCTION IF EXISTS public.update_rollover_for_period(uuid, date);

-- Create the final function.
CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_ref_date date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start_day INT;
    target_period_start_date DATE;
    prev_period_start_date DATE;
    prev_period_end_date DATE;
    rec RECORD;
    v_rollover_amount NUMERIC;
    v_assigned_amount NUMERIC;
    v_spent_amount NUMERIC;
BEGIN
    -- 1. Get household's period start day
    SELECT COALESCE(period_start_day, 1) INTO v_start_day FROM public.profiles WHERE household_id = p_household_id LIMIT 1;
    v_start_day := COALESCE(v_start_day, 1);

    -- 2. Determine the TARGET period's actual start date (e.g., 2025-08-25)
    target_period_start_date := public.get_custom_period_start(p_current_month_ref_date, v_start_day);

    -- 3. Determine the PREVIOUS period's actual start and end dates (e.g., 2025-07-25 to 2025-08-24)
    prev_period_start_date := public.get_custom_period_start((target_period_start_date - INTERVAL '1 day')::DATE, v_start_day);
    prev_period_end_date := (prev_period_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    -- 4. Loop through the PREVIOUS month's assignments (matching exact start date)
    FOR rec IN
        SELECT ba.category_id
        FROM public.budget_assignments ba
        JOIN public.categories c ON ba.category_id = c.id
        WHERE ba.household_id = p_household_id
          AND ba.month = prev_period_start_date -- Match the exact start date
          AND c.is_rollover = TRUE
    LOOP
        -- 5. Calculate assigned and spent amounts for the previous period
        SELECT COALESCE(assigned_amount, 0) INTO v_assigned_amount
        FROM public.budget_assignments
        WHERE household_id = p_household_id AND category_id = rec.category_id AND month = prev_period_start_date;

        SELECT COALESCE(SUM(amount), 0) INTO v_spent_amount
        FROM public.transactions
        WHERE household_id = p_household_id AND category = rec.category_id AND type = 'expense' AND date BETWEEN prev_period_start_date AND prev_period_end_date;

        v_rollover_amount := GREATEST(0, v_assigned_amount - v_spent_amount);

        -- 6. UPSERT into the TARGET month's budget using the ACTUAL start date
        IF v_rollover_amount > 0 THEN
            INSERT INTO public.budget_assignments (household_id, category_id, month, assigned_amount, rollover_amount)
            VALUES (p_household_id, rec.category_id, target_period_start_date, 0, v_rollover_amount)
            ON CONFLICT (household_id, category_id, month)
            DO UPDATE SET rollover_amount = EXCLUDED.rollover_amount;
        END IF;
    END LOOP;
END;
$$;
