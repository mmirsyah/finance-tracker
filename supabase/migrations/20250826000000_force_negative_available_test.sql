-- DEBUGGING: Force a negative value for the 'available' column to test the data path.

DROP FUNCTION IF EXISTS public.get_budget_data(uuid, date, date);
CREATE OR REPLACE FUNCTION public.get_budget_data(p_household_id uuid, p_start_date date, p_end_date date)
RETURNS TABLE(total_income numeric, total_budgeted numeric, total_activity numeric, categories json)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH
    all_categories AS (
        SELECT c.id, c.name, c.parent_id, c.is_rollover, ba.is_flex_budget
        FROM public.categories c
        LEFT JOIN public.budget_assignments ba ON c.id = ba.category_id AND ba.household_id = p_household_id AND ba.month = p_start_date
        WHERE c.household_id = p_household_id AND NOT c.is_archived AND c.type = 'expense'
    ),
    current_data AS (
        SELECT
            c.id as category_id,
            (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t WHERE t.category = c.id AND t.household_id = p_household_id AND t.type = 'expense' AND t.date BETWEEN p_start_date AND p_end_date) as current_activity,
            (SELECT COALESCE(ba.assigned_amount, 0) FROM public.budget_assignments ba WHERE ba.category_id = c.id AND ba.household_id = p_household_id AND ba.month = p_start_date) as current_assigned,
            (SELECT COALESCE(ba.rollover_amount, 0) FROM public.budget_assignments ba WHERE ba.category_id = c.id AND ba.household_id = p_household_id AND ba.month = p_start_date) as current_rollover
        FROM all_categories c
    ),
    category_final_data AS (
        SELECT
            c.id, c.name, c.parent_id, c.is_rollover, c.is_flex_budget,
            p.is_flex_budget as parent_is_flex,
            curr.current_rollover as rollover,
            curr.current_assigned as assigned,
            curr.current_activity as activity,
            CASE WHEN p.is_flex_budget THEN 0 ELSE curr.current_rollover + curr.current_assigned - curr.current_activity END as available
        FROM all_categories c
        LEFT JOIN current_data curr ON c.id = curr.category_id
        LEFT JOIN all_categories p ON c.parent_id = p.id
    ),
    parent_aggregates AS (
        SELECT
            cfd.parent_id, SUM(cfd.rollover) as total_rollover, SUM(cfd.assigned) as total_assigned, SUM(cfd.activity) as total_activity, SUM(cfd.available) as total_available,
            json_agg(json_build_object('id', cfd.id, 'name', cfd.name, 'is_rollover', cfd.is_rollover, 'rollover', cfd.rollover, 'assigned', cfd.assigned, 'activity', cfd.activity, 'available', cfd.available) ORDER BY cfd.name) as children
        FROM category_final_data cfd WHERE cfd.parent_id IS NOT NULL GROUP BY cfd.parent_id
    ),
    final_categories AS (
        SELECT 
            p.id, p.name, p.parent_id, p.is_rollover, p.is_flex_budget,
            COALESCE(pa.total_rollover, p.rollover) as rollover,
            CASE WHEN p.is_flex_budget THEN p.assigned ELSE COALESCE(pa.total_assigned, p.assigned) END as assigned,
            COALESCE(pa.total_activity, p.activity) as activity,
            CASE WHEN p.is_flex_budget THEN p.assigned + COALESCE(pa.total_rollover, 0) - COALESCE(pa.total_activity, 0) ELSE COALESCE(pa.total_available, p.available) END as available,
            CASE WHEN p.is_flex_budget THEN (p.assigned - COALESCE(pa.total_assigned, 0)) ELSE 0 END as unallocated_balance,
            COALESCE(pa.children, '[]'::json) as children
        FROM category_final_data p LEFT JOIN parent_aggregates pa ON p.id = pa.parent_id WHERE p.parent_id IS NULL
    ),
    -- This is the new debug CTE to force a negative value
    forced_negative_test AS (
        SELECT
            id, name, parent_id, is_rollover, is_flex_budget,
            rollover, assigned, activity,
            -123456 AS available, -- FORCING A NEGATIVE VALUE
            unallocated_balance,
            children
        FROM final_categories
    )
    SELECT
        (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t WHERE t.household_id = p_household_id AND t.type = 'income' AND t.date BETWEEN p_start_date AND p_end_date) AS total_income,
        (SELECT COALESCE(SUM(fc.assigned), 0) FROM final_categories fc) AS total_budgeted,
        (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t JOIN all_categories ac ON t.category = ac.id WHERE t.household_id = p_household_id AND t.type = 'expense' AND t.date BETWEEN p_start_date AND p_end_date) AS total_activity,
        (SELECT json_agg(fnt ORDER BY fnt.name) FROM forced_negative_test fnt) AS categories;
END;
$$;
