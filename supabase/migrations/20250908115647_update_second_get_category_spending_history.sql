-- Memperbarui fungsi get_category_spending_history kedua untuk konsistensi

DROP FUNCTION IF EXISTS public.get_category_spending_history(uuid, bigint, date, integer);

CREATE OR REPLACE FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" bigint, "p_reference_date" "date", "p_period_start_day" integer) RETURNS TABLE("spent_last_period" numeric, "period_average" numeric, "last_month_budget" numeric, "period_breakdown" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_start_day INT := COALESCE(p_period_start_day, 1);
    v_last_period_start DATE;
    v_last_period_end DATE;
    v_last_month_budget_date DATE;
BEGIN
    -- Menghitung tanggal periode
    v_last_period_start := public.get_custom_period_start((p_reference_date - INTERVAL '1 month')::DATE, v_start_day);
    v_last_period_end := (public.get_custom_period_start(p_reference_date, v_start_day) - INTERVAL '1 day')::DATE;
    v_last_month_budget_date := date_trunc('month', v_last_period_start);

    RETURN QUERY
    WITH
    last_6_periods AS (
        SELECT
            public.get_custom_period_start((p_reference_date - (n || ' month')::interval)::DATE, v_start_day) as period_start,
            (public.get_custom_period_start((p_reference_date - (n || ' month')::interval)::DATE, v_start_day) + INTERVAL '1 month' - INTERVAL '1 day')::DATE as period_end
        FROM generate_series(0, 5) n
    ),
    period_totals AS (
        SELECT
            p.period_start,
            COALESCE(SUM(t.amount), 0) as total_spent
        FROM last_6_periods p
        LEFT JOIN transactions t ON t.household_id = p_household_id
            AND t.category = p_category_id
            AND t.type = 'expense'
            AND t.date BETWEEN p.period_start AND p.period_end
        GROUP BY p.period_start
    ),
    last_month_budget AS (
        -- Mengambil anggaran bulan lalu
        SELECT COALESCE(SUM(assigned_amount), 0) as budget_amount
        FROM budget_assignments
        WHERE household_id = p_household_id
          AND category_id = p_category_id
          AND month = v_last_month_budget_date
    )
    SELECT
        (SELECT total_spent FROM period_totals ORDER BY period_start DESC LIMIT 1 OFFSET 1) AS spent_last_period,
        (SELECT COALESCE(AVG(total_spent), 0) FROM period_totals WHERE total_spent > 0) AS period_average,
        (SELECT COALESCE(budget_amount, 0) FROM last_month_budget) AS last_month_budget,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'month', to_char(period_start, 'Mon'),
                    'Pengeluaran', total_spent
                ) ORDER BY period_start
            )
            FROM period_totals
        ) AS period_breakdown;
END;
$$;