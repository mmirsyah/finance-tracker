CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_anchor date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_start_day INT;
    prev_period_start_date DATE;
    prev_period_end_date DATE;
    prev_month_budget_anchor DATE;
    rec RECORD;
    v_rollover_amount NUMERIC;
BEGIN
    -- 1. Get the period start day for the household
    SELECT COALESCE(period_start_day, 1)
    INTO v_start_day
    FROM public.profiles
    WHERE household_id = p_household_id
    LIMIT 1;

    v_start_day := COALESCE(v_start_day, 1);

    -- 2. Determine the exact start and end dates of the PREVIOUS budget period
    -- The expression is wrapped in ::DATE to cast the timestamp back to a date.
    prev_period_start_date := public.get_custom_period_start( 
        ((public.get_custom_period_start(p_current_month_anchor, v_start_day) - INTERVAL '1 day')::DATE),
        v_start_day
    );
    prev_period_end_date := (prev_period_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
    
    prev_month_budget_anchor := date_trunc('month', prev_period_start_date)::DATE;

    -- 3. Loop through all categories that are part of the CURRENT month's budget
    FOR rec IN
        SELECT ba.category_id, c.is_rollover
        FROM public.budget_assignments ba
        JOIN public.categories c ON ba.category_id = c.id
        WHERE ba.household_id = p_household_id
          AND ba.month = date_trunc('month', p_current_month_anchor)::DATE
    LOOP
        IF rec.is_rollover THEN
            -- 4. Calculate the leftover from the last month using the correct period dates
            SELECT
                GREATEST(0,
                    COALESCE((
                        SELECT assigned_amount
                        FROM public.budget_assignments
                        WHERE household_id = p_household_id
                          AND category_id = rec.category_id
                          AND month = prev_month_budget_anchor
                    ), 0)
                    -
                    COALESCE((
                        SELECT SUM(amount)
                        FROM public.transactions
                        WHERE household_id = p_household_id
                          AND category = rec.category_id
                          AND type = 'expense'
                          AND date BETWEEN prev_period_start_date AND prev_period_end_date
                    ), 0)
                )
            INTO v_rollover_amount;

            -- 5. Update the CURRENT month's assignment with the calculated rollover
            UPDATE public.budget_assignments
            SET rollover_amount = v_rollover_amount
            WHERE household_id = p_household_id
              AND category_id = rec.category_id
              AND month = date_trunc('month', p_current_month_anchor)::DATE;
        ELSE
            UPDATE public.budget_assignments
            SET rollover_amount = 0
            WHERE household_id = p_household_id
              AND category_id = rec.category_id
              AND month = date_trunc('month', p_current_month_anchor)::DATE;
        END IF;
    END LOOP;
END;
$$;
