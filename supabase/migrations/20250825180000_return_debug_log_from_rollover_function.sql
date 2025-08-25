-- First, drop the old function to allow changing the return type
DROP FUNCTION IF EXISTS public.update_rollover_for_period(uuid, date);

-- Then, create the new function with the TEXT return type for debugging
CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_anchor date)
RETURNS TEXT -- Changed from VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start_day INT;
    target_month_budget_anchor DATE;
    prev_period_start_date DATE;
    prev_period_end_date DATE;
    prev_month_budget_anchor DATE;
    rec RECORD;
    v_rollover_amount NUMERIC;
    v_assigned_amount NUMERIC;
    v_spent_amount NUMERIC;
    debug_log TEXT := ''; -- Initialize the log string
BEGIN
    debug_log := debug_log || '--- Starting rollover calculation for household: ' || p_household_id || E'\n';
    debug_log := debug_log || 'Target month anchor from input: ' || p_current_month_anchor || E'\n';

    -- 1. Get household's period start day
    SELECT COALESCE(period_start_day, 1) INTO v_start_day FROM public.profiles WHERE household_id = p_household_id LIMIT 1;
    v_start_day := COALESCE(v_start_day, 1);
    debug_log := debug_log || 'Period start day: ' || v_start_day || E'\n';

    -- 2. Define anchors and dates
    target_month_budget_anchor := date_trunc('month', p_current_month_anchor)::DATE;
    prev_period_start_date := public.get_custom_period_start( (public.get_custom_period_start(target_month_budget_anchor, v_start_day) - INTERVAL '1 day')::DATE, v_start_day);
    prev_period_end_date := (prev_period_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    prev_month_budget_anchor := date_trunc('month', prev_period_start_date)::DATE;
    debug_log := debug_log || 'Target month for UPSERT: ' || target_month_budget_anchor || E'\n';
    debug_log := debug_log || 'Previous period for calculation: ' || prev_period_start_date || ' to ' || prev_period_end_date || E'\n';
    debug_log := debug_log || 'Previous month budget anchor: ' || prev_month_budget_anchor || E'\n';

    -- 3. Loop through the PREVIOUS month's assignments
    debug_log := debug_log || 'Starting loop through previous month assignments...\n';
    FOR rec IN
        SELECT ba.category_id
        FROM public.budget_assignments ba
        JOIN public.categories c ON ba.category_id = c.id
        WHERE ba.household_id = p_household_id
          AND ba.month = prev_month_budget_anchor
          AND c.is_rollover = TRUE
    LOOP
        debug_log := debug_log || '-- Found category to process: ' || rec.category_id || E'\n';

        -- Calculate assigned amount
        SELECT COALESCE(assigned_amount, 0) INTO v_assigned_amount FROM public.budget_assignments
        WHERE household_id = p_household_id AND category_id = rec.category_id AND month = prev_month_budget_anchor;
        debug_log := debug_log || 'Assigned amount: ' || v_assigned_amount || E'\n';

        -- Calculate spent amount
        SELECT COALESCE(SUM(amount), 0) INTO v_spent_amount FROM public.transactions
        WHERE household_id = p_household_id AND category = rec.category_id AND type = 'expense' AND date BETWEEN prev_period_start_date AND prev_period_end_date;
        debug_log := debug_log || 'Spent amount: ' || v_spent_amount || E'\n';

        v_rollover_amount := GREATEST(0, v_assigned_amount - v_spent_amount);
        debug_log := debug_log || 'Calculated rollover: ' || v_rollover_amount || E'\n';

        IF v_rollover_amount > 0 THEN
            debug_log := debug_log || 'Rollover is > 0. Attempting UPSERT...\n';
            INSERT INTO public.budget_assignments (household_id, category_id, month, assigned_amount, rollover_amount)
            VALUES (p_household_id, rec.category_id, target_month_budget_anchor, 0, v_rollover_amount)
            ON CONFLICT (household_id, category_id, month)
            DO UPDATE SET rollover_amount = EXCLUDED.rollover_amount;
            debug_log := debug_log || 'UPSERT completed for category: ' || rec.category_id || E'\n';
        ELSE
            debug_log := debug_log || 'Rollover is 0. Skipping UPSERT for category: ' || rec.category_id || E'\n';
        END IF;
    END LOOP;
    debug_log := debug_log || '--- Finished rollover calculation ---' || E'\n';
    
    RETURN debug_log; -- Return the entire log as a single text value
END;
$$;