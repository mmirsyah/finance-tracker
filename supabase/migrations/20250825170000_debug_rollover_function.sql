-- FINAL DEBUGGING FUNCTION WITH RAISE NOTICE
CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_anchor date)
RETURNS void
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
BEGIN
    RAISE NOTICE '--- Starting rollover calculation for household: % ---', p_household_id;
    RAISE NOTICE 'Target month anchor from input: %', p_current_month_anchor;

    -- 1. Get household's period start day
    SELECT COALESCE(period_start_day, 1) INTO v_start_day FROM public.profiles WHERE household_id = p_household_id LIMIT 1;
    v_start_day := COALESCE(v_start_day, 1);
    RAISE NOTICE 'Period start day: %', v_start_day;

    -- 2. Define anchors and dates
    target_month_budget_anchor := date_trunc('month', p_current_month_anchor)::DATE;
    prev_period_start_date := public.get_custom_period_start( (public.get_custom_period_start(target_month_budget_anchor, v_start_day) - INTERVAL '1 day')::DATE, v_start_day);
    prev_period_end_date := (prev_period_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    prev_month_budget_anchor := date_trunc('month', prev_period_start_date)::DATE;
    RAISE NOTICE 'Target month for UPSERT: %', target_month_budget_anchor;
    RAISE NOTICE 'Previous period for calculation: % to %', prev_period_start_date, prev_period_end_date;
    RAISE NOTICE 'Previous month budget anchor: %', prev_month_budget_anchor;

    -- 3. Loop through the PREVIOUS month's assignments
    RAISE NOTICE 'Starting loop through previous month assignments...';
    FOR rec IN
        SELECT ba.category_id
        FROM public.budget_assignments ba
        JOIN public.categories c ON ba.category_id = c.id
        WHERE ba.household_id = p_household_id
          AND ba.month = prev_month_budget_anchor
          AND c.is_rollover = TRUE
    LOOP
        RAISE NOTICE '-- Found category to process: % --', rec.category_id;

        -- Calculate assigned amount
        SELECT COALESCE(assigned_amount, 0) INTO v_assigned_amount FROM public.budget_assignments
        WHERE household_id = p_household_id AND category_id = rec.category_id AND month = prev_month_budget_anchor;
        RAISE NOTICE 'Assigned amount: %', v_assigned_amount;

        -- Calculate spent amount
        SELECT COALESCE(SUM(amount), 0) INTO v_spent_amount FROM public.transactions
        WHERE household_id = p_household_id AND category = rec.category_id AND type = 'expense' AND date BETWEEN prev_period_start_date AND prev_period_end_date;
        RAISE NOTICE 'Spent amount: %', v_spent_amount;

        v_rollover_amount := GREATEST(0, v_assigned_amount - v_spent_amount);
        RAISE NOTICE 'Calculated rollover: %', v_rollover_amount;

        IF v_rollover_amount > 0 THEN
            RAISE NOTICE 'Rollover is > 0. Attempting UPSERT...';
            INSERT INTO public.budget_assignments (household_id, category_id, month, assigned_amount, rollover_amount)
            VALUES (p_household_id, rec.category_id, target_month_budget_anchor, 0, v_rollover_amount)
            ON CONFLICT (household_id, category_id, month)
            DO UPDATE SET rollover_amount = EXCLUDED.rollover_amount;
            RAISE NOTICE 'UPSERT completed for category: %', rec.category_id;
        ELSE
            RAISE NOTICE 'Rollover is 0. Skipping UPSERT for category: %', rec.category_id;
        END IF;
    END LOOP;
    RAISE NOTICE '--- Finished rollover calculation ---';
END;
$$;
