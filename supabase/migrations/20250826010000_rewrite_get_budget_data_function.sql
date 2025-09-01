-- Final rewrite of the get_budget_data function to ensure correct 'available' calculation.

DROP FUNCTION IF EXISTS public.get_budget_data(uuid, date, date);

CREATE OR REPLACE FUNCTION public.get_budget_data(p_household_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(total_income numeric, total_budgeted numeric, total_activity numeric, categories json)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH 
    -- 1. Get all relevant categories for the household
    all_categories AS (
        SELECT id, name, parent_id, is_rollover
        FROM public.categories
        WHERE household_id = p_household_id AND NOT is_archived AND type = 'expense'
    ),
    
    -- 2. Get all budget assignments for the current period
    current_assignments AS (
        SELECT category_id, assigned_amount, rollover_amount, is_flex_budget
        FROM public.budget_assignments
        WHERE household_id = p_household_id AND month = p_start_date
    ),

    -- 3. Get all activity for the current period
    current_activity AS (
        SELECT category as category_id, SUM(amount) as total_spent
        FROM public.transactions
        WHERE household_id = p_household_id AND type = 'expense'
          AND date BETWEEN p_start_date AND p_end_date
        GROUP BY category
    ),

    -- 4. Calculate metrics for EVERY category (parents and children)
    category_data AS (
        SELECT 
            ac.id,
            ac.name,
            ac.parent_id,
            ac.is_rollover,
            COALESCE(ca.is_flex_budget, false) as is_flex_budget,
            COALESCE(ca.rollover_amount, 0) as rollover,
            COALESCE(ca.assigned_amount, 0) as assigned,
            COALESCE(act.total_spent, 0) as activity,
            -- THIS IS THE CORE CALCULATION, NOW APPLIED TO EVERYONE
            (COALESCE(ca.rollover_amount, 0) + COALESCE(ca.assigned_amount, 0) - COALESCE(act.total_spent, 0)) as available
        FROM all_categories ac
        LEFT JOIN current_assignments ca ON ac.id = ca.category_id
        LEFT JOIN current_activity act ON ac.id = act.category_id
    ),

    -- 5. Aggregate children data for their parents
    parent_aggregates AS (
        SELECT
            cd.parent_id,
            SUM(cd.rollover) as total_rollover,
            SUM(cd.assigned) as total_assigned,
            SUM(cd.activity) as total_activity,
            SUM(cd.available) as total_available,
            json_agg(
                json_build_object(
                    'id', cd.id, 'name', cd.name, 'is_rollover', cd.is_rollover, 'rollover', cd.rollover,
                    'assigned', cd.assigned, 'activity', cd.activity, 'available', cd.available
                ) ORDER BY cd.name
            ) as children
        FROM category_data cd
        WHERE cd.parent_id IS NOT NULL
        GROUP BY cd.parent_id
    ),

    -- 6. Build the final structure
    final_categories AS (
        SELECT 
            p.id, p.name, p.parent_id, p.is_rollover, p.is_flex_budget,
            COALESCE(pa.total_rollover, p.rollover) as rollover,
            CASE WHEN p.is_flex_budget THEN p.assigned ELSE COALESCE(pa.total_assigned, p.assigned) END as assigned,
            COALESCE(pa.total_activity, p.activity) as activity,
            -- For flex budgets, available is calculated at parent level. For others, it's the sum of children's available.
            CASE 
                WHEN p.is_flex_budget THEN p.assigned + COALESCE(pa.total_rollover, 0) - COALESCE(pa.total_activity, 0)
                ELSE COALESCE(pa.total_available, p.available)
            END as available,
            CASE WHEN p.is_flex_budget THEN (p.assigned - COALESCE(pa.total_assigned, 0)) ELSE 0 END as unallocated_balance,
            COALESCE(pa.children, '[]'::json) as children
        FROM category_data p
        LEFT JOIN parent_aggregates pa ON p.id = pa.parent_id
        WHERE p.parent_id IS NULL
    )

    -- 7. Return the final query
    SELECT
        (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t WHERE t.household_id = p_household_id AND t.type = 'income' AND t.date BETWEEN p_start_date AND p_end_date) AS total_income,
        (SELECT COALESCE(SUM(fc.assigned), 0) FROM final_categories fc) AS total_budgeted,
        (SELECT COALESCE(SUM(cd.activity), 0) FROM category_data cd) AS total_activity,
        (SELECT json_agg(fc ORDER BY fc.name) FROM final_categories fc) AS categories;
END;
$$;
