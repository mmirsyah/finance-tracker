CREATE OR REPLACE FUNCTION "public"."get_all_budget_categories_for_period"("p_ref_date" "date") RETURNS SETOF "public"."budget_category_list_item"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_household_id UUID;
    v_period_start_day INT;
    v_budget_month_anchor DATE;
BEGIN
    -- 1. Ambil data profil
    SELECT p.household_id, COALESCE(p.period_start_day, 1)
    INTO v_household_id, v_period_start_day
    FROM public.profiles p WHERE id = auth.uid();

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Household not found for the current user.';
    END IF;

    -- 2. Kalkulasi bulan acuan budget
    IF EXTRACT(DAY FROM p_ref_date) >= v_period_start_day THEN
        v_budget_month_anchor := date_trunc('month', p_ref_date)::date;
    ELSE
        v_budget_month_anchor := date_trunc('month', p_ref_date - INTERVAL '1 month')::date;
    END IF;

    -- 3. Mengembalikan query yang sudah diperbaiki (filter yang terlalu ketat dihapus)
    RETURN QUERY
    SELECT
        ba.category_id::bigint,
        c.name AS category_name
    FROM
        public.budget_assignments ba
    JOIN
        public.categories c ON ba.category_id = c.id
    WHERE
        ba.household_id = v_household_id
        AND ba.month = v_budget_month_anchor
    ORDER BY
        c.name ASC;
END;
$$;