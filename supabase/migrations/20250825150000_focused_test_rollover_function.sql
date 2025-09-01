-- FOCUSED TEST FUNCTION
-- This version removes the loop and calculates rollover explicitly for one category (ID 82)
-- to test if the calculation logic itself is correct.
CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_anchor date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start_day INT;
    prev_period_start_date DATE;
    prev_period_end_date DATE;
    prev_month_budget_anchor DATE;
    v_rollover_amount NUMERIC;
    TARGET_CATEGORY_ID CONSTANT INT := 82; -- Hardcoded for Hiburan & Rekreasi
BEGIN
    -- Get start day from profile
    SELECT COALESCE(period_start_day, 1) INTO v_start_day FROM public.profiles WHERE household_id = p_household_id LIMIT 1;
    v_start_day := COALESCE(v_start_day, 1);

    -- Get previous period's date range
    prev_period_start_date := public.get_custom_period_start( ((public.get_custom_period_start(p_current_month_anchor, v_start_day) - INTERVAL '1 day')::DATE), v_start_day);
    prev_period_end_date := (prev_period_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    prev_month_budget_anchor := date_trunc('month', prev_period_start_date)::DATE;

    -- Explicitly calculate rollover for the target category
    SELECT
        GREATEST(0,
            COALESCE((
                SELECT assigned_amount FROM public.budget_assignments
                WHERE household_id = p_household_id AND category_id = TARGET_CATEGORY_ID AND month = prev_month_budget_anchor
            ), 0)
            -
            COALESCE((
                SELECT SUM(amount) FROM public.transactions
                WHERE household_id = p_household_id AND category = TARGET_CATEGORY_ID AND type = 'expense' AND date BETWEEN prev_period_start_date AND prev_period_end_date
            ), 0)
        )
    INTO v_rollover_amount;
    
    -- If the calculation result is NULL for any reason, default it to 99999 for debugging
    v_rollover_amount := COALESCE(v_rollover_amount, 99999.00);

    -- Update the table for the target category in the current month
    UPDATE public.budget_assignments
    SET rollover_amount = v_rollover_amount
    WHERE
        household_id = p_household_id
        AND month = date_trunc('month', p_current_month_anchor)::DATE
        AND category_id = TARGET_CATEGORY_ID;
END;
$$;
