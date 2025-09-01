-- Migration to update DB functions to use exact start dates instead of month anchors.

-- 1. Update get_budget_data
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
        LEFT JOIN public.budget_assignments ba ON c.id = ba.category_id
            AND ba.household_id = p_household_id
            AND ba.month = p_start_date
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
    )
    SELECT
        (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t WHERE t.household_id = p_household_id AND t.type = 'income' AND t.date BETWEEN p_start_date AND p_end_date) AS total_income,
        (SELECT COALESCE(SUM(fc.assigned), 0) FROM final_categories fc) AS total_budgeted,
        (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t JOIN all_categories ac ON t.category = ac.id WHERE t.household_id = p_household_id AND t.type = 'expense' AND t.date BETWEEN p_start_date AND p_end_date) AS total_activity,
        (SELECT json_agg(fc ORDER BY fc.name) FROM final_categories fc) AS categories;
END;
$$;

-- 2. Update get_quick_budget_overview
DROP FUNCTION IF EXISTS public.get_quick_budget_overview(date);
CREATE OR REPLACE FUNCTION public.get_quick_budget_overview(p_ref_date date)
RETURNS SETOF public.budget_summary_item
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_household_id UUID;
    v_period_start_day INT;
    v_transaction_start_date DATE;
    v_transaction_end_date DATE;
BEGIN
    SELECT p.household_id, COALESCE(p.period_start_day, 1) INTO v_household_id, v_period_start_day FROM public.profiles p WHERE id = v_user_id;
    IF v_household_id IS NULL THEN RAISE EXCEPTION 'Household not found for the current user.'; END IF;

    v_transaction_start_date := public.get_custom_period_start(p_ref_date, v_period_start_day);
    v_transaction_end_date := (v_transaction_start_date + interval '1 month' - interval '1 day')::date;

    RETURN QUERY
    WITH spent AS (
        SELECT t.category, SUM(t.amount) AS total_spent
        FROM public.transactions t
        WHERE t.household_id = v_household_id AND t.type = 'expense' AND t.date BETWEEN v_transaction_start_date AND v_transaction_end_date
        GROUP BY t.category
    )
    SELECT
        ba.category_id::bigint,
        c.name AS category_name,
        (ba.assigned_amount + ba.rollover_amount) as assigned_amount,
        COALESCE(s.total_spent, 0) as spent_amount,
        (ba.assigned_amount + ba.rollover_amount - COALESCE(s.total_spent, 0)) as remaining_amount,
        CASE WHEN (ba.assigned_amount + ba.rollover_amount) > 0 THEN (COALESCE(s.total_spent, 0) / (ba.assigned_amount + ba.rollover_amount)) * 100 ELSE 0 END as progress_percentage
    FROM public.budget_assignments ba
    JOIN public.categories c ON ba.category_id = c.id
    LEFT JOIN spent s ON ba.category_id = s.category
    WHERE ba.household_id = v_household_id
      AND ba.month = v_transaction_start_date; -- Match exact start date
END;
$$;

-- 3. Update get_all_budget_categories_for_period
DROP FUNCTION IF EXISTS public.get_all_budget_categories_for_period(date);
CREATE OR REPLACE FUNCTION public.get_all_budget_categories_for_period(p_ref_date date)
RETURNS SETOF public.budget_category_list_item
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_household_id UUID;
    v_period_start_day INT;
    v_budget_period_start DATE;
BEGIN
    SELECT p.household_id, COALESCE(p.period_start_day, 1) INTO v_household_id, v_period_start_day FROM public.profiles p WHERE id = auth.uid();
    IF v_household_id IS NULL THEN RAISE EXCEPTION 'Household not found for the current user.'; END IF;

    v_budget_period_start := public.get_custom_period_start(p_ref_date, v_period_start_day);

    RETURN QUERY
    SELECT ba.category_id::bigint, c.name AS category_name
    FROM public.budget_assignments ba
    JOIN public.categories c ON ba.category_id = c.id
    WHERE ba.household_id = v_household_id
      AND ba.month = v_budget_period_start -- Match exact start date
      AND (c.parent_id IS NOT NULL OR (c.parent_id IS NULL AND ba.is_flex_budget = TRUE))
    ORDER BY c.name ASC;
END;
$$;
