-- Memperbaiki perhitungan tanggal untuk mengambil anggaran periode sebelumnya dengan mempertimbangkan periode kustom dengan benar
-- Menghitung tanggal anggaran berdasarkan bulan kalender dari periode sebelumnya

-- Drop fungsi yang ada sebelum membuat versi baru
DROP FUNCTION IF EXISTS public.get_category_spending_history(uuid, integer, date);

-- Membuat fungsi baru dengan perhitungan tanggal yang benar untuk periode kustom
CREATE OR REPLACE FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" integer, "p_current_period_start" "date") 
RETURNS TABLE("last_month_spending" numeric, "three_month_avg" numeric, "six_month_avg" numeric, "last_month_budget" numeric, "monthly_history" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_category_ids INT[];
    v_last_period_start DATE;
    v_last_period_end DATE;
    v_3_month_start DATE;
    v_6_month_start DATE;
    v_last_month_budget_date DATE;
    v_current_period_start DATE;
    v_period_start_day INT;
BEGIN
    -- Menentukan semua ID kategori yang relevan (termasuk anak-anaknya)
    WITH RECURSIVE category_tree AS (
        SELECT id
        FROM categories
        WHERE id = p_category_id
        UNION ALL
        SELECT c.id
        FROM categories c
        JOIN category_tree ct ON c.parent_id = ct.id
    )
    SELECT array_agg(id) INTO v_category_ids FROM category_tree;

    -- Menggunakan p_current_period_start langsung sebagai tanggal awal periode saat ini
    v_current_period_start := p_current_period_start;
    
    -- Mendapatkan tanggal start day dari profil pengguna untuk menghitung periode sebelumnya dengan benar
    SELECT COALESCE(period_start_day, 1) INTO v_period_start_day
    FROM profiles
    WHERE household_id = p_household_id
    LIMIT 1;
    
    -- Memastikan v_period_start_day tidak NULL
    IF v_period_start_day IS NULL THEN
        v_period_start_day := 1;
    END IF;
    
    -- Menghitung periode sebelumnya dengan fungsi get_custom_period_start
    -- Memastikan tipe data DATE digunakan
    v_last_period_start := public.get_custom_period_start((v_current_period_start - INTERVAL '1 day')::DATE, v_period_start_day);
    v_last_period_end := v_last_period_start + INTERVAL '1 month' - INTERVAL '1 day';
    
    -- Untuk perhitungan rata-rata
    v_3_month_start := v_current_period_start - INTERVAL '3 months';
    v_6_month_start := v_current_period_start - INTERVAL '6 months';
    
    -- Perbaikan: Menghitung tanggal anggaran periode sebelumnya
    -- Kita menggunakan tanggal awal bulan kalender dari periode sebelumnya
    -- Ini akan mengambil anggaran yang sesuai dengan bulan kalender dari periode sebelumnya
    v_last_month_budget_date := date_trunc('month', v_last_period_start)::DATE;

    -- Untuk debugging - bisa dihapus setelah masalah terpecahkan
    RAISE LOG 'get_category_spending_history: p_current_period_start = %', p_current_period_start;
    RAISE LOG 'get_category_spending_history: v_last_period_start = %', v_last_period_start;
    RAISE LOG 'get_category_spending_history: v_last_period_end = %', v_last_period_end;
    RAISE LOG 'get_category_spending_history: v_last_month_budget_date = %', v_last_month_budget_date;
    RAISE LOG 'get_category_spending_history: v_category_ids = %', v_category_ids;

    RETURN QUERY
    WITH monthly_series AS (
        -- Membuat deret 6 bulan terakhir sebelum periode saat ini
        SELECT date_trunc('month', generate_series(v_6_month_start, v_last_period_end, '1 month'))::date as month_start
    ),
    monthly_spending AS (
        -- Menghitung total pengeluaran per bulan
        SELECT
            date_trunc('month', date)::date as month_start,
            SUM(amount) as total
        FROM transactions
        WHERE household_id = p_household_id
          AND category = ANY(v_category_ids)
          AND type = 'expense'
          AND date >= v_6_month_start AND date < v_current_period_start
        GROUP BY 1
    ),
    last_month_budget AS (
        -- Mengambil anggaran periode sebelumnya
        SELECT COALESCE(SUM(assigned_amount), 0) as budget_amount
        FROM budget_assignments
        WHERE household_id = p_household_id
          AND category_id = ANY(v_category_ids)
          AND month = v_last_month_budget_date
    )
    SELECT
        -- 1. Pengeluaran periode sebelumnya
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND category = ANY(v_category_ids) AND type = 'expense' AND date >= v_last_period_start AND date <= v_last_period_end) AS last_month_spending,
        -- 2. Rata-rata 3 bulan terakhir
        (SELECT COALESCE(SUM(amount) / 3.0, 0) FROM transactions WHERE household_id = p_household_id AND category = ANY(v_category_ids) AND type = 'expense' AND date >= v_3_month_start AND date < v_current_period_start) AS three_month_avg,
        -- 3. Rata-rata 6 bulan terakhir
        (SELECT COALESCE(SUM(amount) / 6.0, 0) FROM transactions WHERE household_id = p_household_id AND category = ANY(v_category_ids) AND type = 'expense' AND date >= v_6_month_start AND date < v_current_period_start) AS six_month_avg,
        -- 4. Anggaran periode sebelumnya
        (SELECT COALESCE(budget_amount, 0) FROM last_month_budget) AS last_month_budget,
        -- 5. Histori bulanan dalam format JSON
        (SELECT jsonb_agg(
            jsonb_build_object(
                'month', to_char(ms.month_start, 'Mon YY'),
                'Pengeluaran', COALESCE(sp.total, 0)
            ) ORDER BY ms.month_start ASC
        )
        FROM monthly_series ms
        LEFT JOIN monthly_spending sp ON ms.month_start = sp.month_start
        ) AS monthly_history;
END;
$$;