-- FINAL, CORRECTED FUNCTION FOR REAL THIS TIME
CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_anchor date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_start_day INT;
    -- TARGET month (e.g. September)
    target_month_budget_anchor DATE;
    -- PREVIOUS month (e.g. August)
    prev_period_start_date DATE;
    prev_period_end_date DATE;
    prev_month_budget_anchor DATE;
    rec RECORD;
    v_rollover_amount NUMERIC;
BEGIN
    -- 1. Get household's period start day
    SELECT COALESCE(period_start_day, 1) INTO v_start_day FROM public.profiles WHERE household_id = p_household_id LIMIT 1;
    v_start_day := COALESCE(v_start_day, 1);

    -- 2. Define the TARGET month anchor. This is the month we want to UPDATE/INSERT into.
    target_month_budget_anchor := date_trunc('month', p_current_month_anchor)::DATE;

    -- 3. Determine the PREVIOUS period's dates for calculation.
    -- To do this, we find the start of the target period, then go back a day.
    prev_period_start_date := public.get_custom_period_start( (public.get_custom_period_start(target_month_budget_anchor, v_start_day) - INTERVAL '1 day')::DATE, v_start_day);
    prev_period_end_date := (prev_period_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    prev_month_budget_anchor := date_trunc('month', prev_period_start_date)::DATE;

    -- 4. Loop through the PREVIOUS month's assignments that are marked for rollover
    FOR rec IN
        SELECT ba.category_id
        FROM public.budget_assignments ba
        JOIN public.categories c ON ba.category_id = c.id
        WHERE ba.household_id = p_household_id
          AND ba.month = prev_month_budget_anchor
          AND c.is_rollover = TRUE
    LOOP
        -- 5. Calculate the rollover amount from the previous period
        SELECT
            GREATEST(0,
                COALESCE((
                    SELECT assigned_amount FROM public.budget_assignments
                    WHERE household_id = p_household_id AND category_id = rec.category_id AND month = prev_month_budget_anchor
                ), 0)
                -
                COALESCE((
                    SELECT SUM(amount) FROM public.transactions
                    WHERE household_id = p_household_id AND category = rec.category_id AND type = 'expense' AND date BETWEEN prev_period_start_date AND prev_period_end_date
                ), 0)
            )
        INTO v_rollover_amount;

        -- 6. If there is a rollover amount, UPSERT it into the TARGET month's budget
        IF v_rollover_amount > 0 THEN
            INSERT INTO public.budget_assignments (household_id, category_id, month, assigned_amount, rollover_amount)
            VALUES (p_household_id, rec.category_id, target_month_budget_anchor, 0, v_rollover_amount)
            ON CONFLICT (household_id, category_id, month)
            DO UPDATE SET rollover_amount = EXCLUDED.rollover_amount;
        END IF;
    END LOOP;
END;
$$;
