-- 1. Create the new function to calculate and store rollover amounts
CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_anchor date)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    last_month_anchor date;
    rec record;
    v_rollover_amount numeric;
BEGIN
    last_month_anchor := p_current_month_anchor - interval '1 month';

    -- Loop through all categories that are part of the current month's budget
    FOR rec IN
        SELECT ba.category_id, c.is_rollover
        FROM public.budget_assignments ba
        JOIN public.categories c ON ba.category_id = c.id
        WHERE ba.household_id = p_household_id
          AND ba.month = p_current_month_anchor
    LOOP
        -- Only calculate for categories that have rollover enabled
        IF rec.is_rollover THEN
            -- Calculate the leftover from the last month
            SELECT
                GREATEST(0,
                    -- Last month's assigned amount
                    COALESCE((
                        SELECT assigned_amount
                        FROM public.budget_assignments
                        WHERE household_id = p_household_id
                          AND category_id = rec.category_id
                          AND month = last_month_anchor
                    ), 0)
                    -
                    -- Last month's spent amount
                    COALESCE((
                        SELECT SUM(amount)
                        FROM public.transactions
                        WHERE household_id = p_household_id
                          AND category = rec.category_id
                          AND type = 'expense'
                          AND date_trunc('month', date) = last_month_anchor
                    ), 0)
                )
            INTO v_rollover_amount;

            -- Update the current month's assignment with the calculated rollover
            UPDATE public.budget_assignments
            SET rollover_amount = v_rollover_amount
            WHERE household_id = p_household_id
              AND category_id = rec.category_id
              AND month = p_current_month_anchor;
        ELSE
            -- Ensure rollover is 0 if the flag is false
            UPDATE public.budget_assignments
            SET rollover_amount = 0
            WHERE household_id = p_household_id
              AND category_id = rec.category_id
              AND month = p_current_month_anchor;
        END IF;
    END LOOP;
END;
$$;

-- 2. Drop and recreate the main budget data function to use the new rollover_amount column
DROP FUNCTION IF EXISTS public.get_budget_data(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_budget_data(p_household_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(total_income numeric, total_budgeted numeric, total_activity numeric, categories json)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_month_start date := date_trunc('month', p_start_date);
BEGIN
    RETURN QUERY
    WITH
    all_categories AS (
        SELECT
            c.id, c.name, c.parent_id, c.is_rollover,
            COALESCE(ba.is_flex_budget, false) as is_flex_budget
        FROM public.categories c
        LEFT JOIN public.budget_assignments ba ON c.id = ba.category_id
            AND ba.household_id = p_household_id
            AND ba.month = v_current_month_start
        WHERE c.household_id = p_household_id AND NOT c.is_archived AND c.type = 'expense'
    ),

    current_data AS (
        SELECT
            c.id as category_id,
            (SELECT COALESCE(SUM(t.amount), 0)
             FROM public.transactions t
             WHERE t.category = c.id AND t.household_id = p_household_id AND t.type = 'expense'
               AND t.date BETWEEN p_start_date AND p_end_date) as current_activity,
            (SELECT COALESCE(ba.assigned_amount, 0)
             FROM public.budget_assignments ba
             WHERE ba.category_id = c.id AND ba.household_id = p_household_id
               AND ba.month = v_current_month_start) as current_assigned,
            -- *** NEW: Read rollover directly from the table ***
            (SELECT COALESCE(ba.rollover_amount, 0)
             FROM public.budget_assignments ba
             WHERE ba.category_id = c.id AND ba.household_id = p_household_id
               AND ba.month = v_current_month_start) as current_rollover
        FROM all_categories c
    ),

    category_final_data AS (
        SELECT
            c.id, c.name, c.parent_id, c.is_rollover, c.is_flex_budget,
            p.is_flex_budget as parent_is_flex,
            curr.current_rollover as rollover,
            curr.current_assigned as assigned,
            curr.current_activity as activity,
            -- *** NEW: Simplified 'available' calculation ***
            CASE
                WHEN p.is_flex_budget THEN 0 -- Child category availability is not relevant for flex budgets
                ELSE curr.current_rollover + curr.current_assigned - curr.current_activity
            END as available
        FROM all_categories c
        LEFT JOIN current_data curr ON c.id = curr.category_id
        LEFT JOIN all_categories p ON c.parent_id = p.id
    ),

    parent_aggregates AS (
        SELECT
            cfd.parent_id,
            SUM(cfd.rollover) as total_rollover,
            SUM(cfd.assigned) as total_assigned,
            SUM(cfd.activity) as total_activity,
            SUM(cfd.available) as total_available,
            json_agg(
                json_build_object(
                    'id', cfd.id, 'name', cfd.name, 'is_rollover', cfd.is_rollover, 'rollover', cfd.rollover,
                    'assigned', cfd.assigned, 'activity', cfd.activity, 'available', cfd.available
                ) ORDER BY cfd.name
            ) as children
        FROM category_final_data cfd
        WHERE cfd.parent_id IS NOT NULL
        GROUP BY cfd.parent_id
    ),

    final_categories AS (
        SELECT
            p.id, p.name, p.parent_id, p.is_rollover, p.is_flex_budget,
            COALESCE(pa.total_rollover, p.rollover) as rollover,
            CASE WHEN p.is_flex_budget THEN p.assigned ELSE COALESCE(pa.total_assigned, p.assigned) END as assigned,
            COALESCE(pa.total_activity, p.activity) as activity,
            CASE
                WHEN p.is_flex_budget THEN p.assigned + COALESCE(pa.total_rollover, 0) - COALESCE(pa.total_activity, 0)
                ELSE COALESCE(pa.total_available, p.available)
            END as available,
            CASE WHEN p.is_flex_budget THEN (p.assigned - COALESCE(pa.total_assigned, 0)) ELSE 0 END as unallocated_balance,
            COALESCE(pa.children, '[]'::json) as children
        FROM category_final_data p
        LEFT JOIN parent_aggregates pa ON p.id = pa.parent_id
        WHERE p.parent_id IS NULL
    )

    SELECT
        (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t WHERE t.household_id = p_household_id AND t.type = 'income' AND t.date BETWEEN p_start_date AND p_end_date) AS total_income,
        (SELECT COALESCE(SUM(fc.assigned), 0) FROM final_categories fc) AS total_budgeted,
        (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t JOIN all_categories ac ON t.category = ac.id WHERE t.household_id = p_household_id AND t.type = 'expense' AND t.date BETWEEN p_start_date AND p_end_date) AS total_activity,
        (SELECT json_agg(fc ORDER BY fc.name) FROM final_categories fc) AS categories;
END;
$$;
