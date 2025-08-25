

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."bucket_spending_summary" AS (
	"bucket_id" bigint,
	"total_spent" numeric
);


ALTER TYPE "public"."bucket_spending_summary" OWNER TO "postgres";


CREATE TYPE "public"."budget_category_list_item" AS (
	"category_id" bigint,
	"category_name" "text"
);


ALTER TYPE "public"."budget_category_list_item" OWNER TO "postgres";


CREATE TYPE "public"."budget_summary_item" AS (
	"category_id" bigint,
	"category_name" "text",
	"assigned_amount" numeric,
	"spent_amount" numeric,
	"remaining_amount" numeric,
	"progress_percentage" numeric
);


ALTER TYPE "public"."budget_summary_item" OWNER TO "postgres";


CREATE TYPE "public"."budget_type_enum" AS ENUM (
    'Fixed',
    'Flex',
    'Non-Monthly'
);


ALTER TYPE "public"."budget_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."category_spending_summary" AS (
	"category_id" bigint,
	"total_spent" numeric
);


ALTER TYPE "public"."category_spending_summary" OWNER TO "postgres";


CREATE TYPE "public"."frequency_enum" AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);


ALTER TYPE "public"."frequency_enum" OWNER TO "postgres";


CREATE TYPE "public"."instance_status" AS ENUM (
    'upcoming',
    'overdue',
    'confirmed',
    'done',
    'done_with_difference',
    'skipped'
);


ALTER TYPE "public"."instance_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'income',
    'expense',
    'transfer'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backup_get_budget_summary"("p_household_id" "uuid", "p_period" "text") RETURNS TABLE("plan_id" bigint, "plan_name" "text", "total_allocated" numeric, "total_spent" numeric, "categories" "jsonb")
    LANGUAGE "plpgsql"
    AS $$DECLARE
    v_period_date date;
BEGIN
    v_period_date := p_period::date;
    RETURN QUERY SELECT * FROM public.get_budget_summary(p_household_id, v_period_date);
END;$$;


ALTER FUNCTION "public"."backup_get_budget_summary"("p_household_id" "uuid", "p_period" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."backup_get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("period" "text", "pemasukan" numeric, "pengeluaran" numeric, "kas_tersedia" numeric)
    LANGUAGE "plpgsql"
    AS $$DECLARE
    v_opening_balance NUMERIC;
BEGIN
    -- 1. Hitung saldo awal dari semua akun kas (hanya 'generic') sebelum tanggal mulai
    SELECT COALESCE(SUM(balance), 0)
    INTO v_opening_balance
    FROM (
        SELECT 
            a.id,
            (a.initial_balance 
             + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0)
             + COALESCE(SUM(CASE WHEN tr.to_account_id = a.id THEN tr.amount ELSE 0 END), 0)
             - COALESCE(SUM(CASE WHEN tr.account_id = a.id THEN tr.amount ELSE 0 END), 0)
            ) as balance
        FROM 
            public.accounts a
        LEFT JOIN 
            public.transactions t ON t.account_id = a.id AND t.date < p_start_date AND t.type IN ('income', 'expense')
        LEFT JOIN 
            public.transactions tr ON (tr.account_id = a.id OR tr.to_account_id = a.id) AND tr.date < p_start_date AND tr.type = 'transfer'
        WHERE 
            a.household_id = p_household_id
            AND a.type = 'generic' -- Hanya hitung akun umum untuk kas tersedia
            AND a.name != 'Modal Awal Aset' -- Abaikan akun virtual
        GROUP BY a.id, a.initial_balance
    ) AS balances;

    -- 2. Buat seri tanggal dan hitung perubahan harian serta saldo akhir kumulatif
    RETURN QUERY
    WITH daily_changes AS (
        SELECT
            d.day::date AS report_date,
            COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS pemasukan_harian,
            -- Pengeluaran disimpan sebagai nilai negatif untuk grafik
            COALESCE(SUM(CASE WHEN t.type = 'expense' THEN -t.amount ELSE 0 END), 0) AS pengeluaran_harian
        FROM 
            generate_series(p_start_date, p_end_date, '1 day'::interval) d(day)
        LEFT JOIN 
            public.transactions t ON t.date = d.day::date 
                AND t.household_id = p_household_id 
                AND t.account_id IN (SELECT id FROM accounts WHERE type = 'generic' AND name != 'Modal Awal Aset')
                AND t.type IN ('income', 'expense')
        GROUP BY d.day
    )
    SELECT
        to_char(dc.report_date, 'DD Mon') as period,
        dc.pemasukan_harian AS pemasukan,
        dc.pengeluaran_harian AS pengeluaran,
        (v_opening_balance + SUM(dc.pemasukan_harian + dc.pengeluaran_harian) OVER (ORDER BY dc.report_date))::numeric AS kas_tersedia
    FROM
        daily_changes dc
    ORDER BY
        dc.report_date;
END;$$;


ALTER FUNCTION "public"."backup_get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bulk_update_transaction_category"("transaction_ids" "text"[], "new_category_id" bigint) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    updated_count INT;
    user_household_id UUID;
BEGIN
    -- Ambil household_id dari pengguna yang sedang login
    SELECT household_id INTO user_household_id FROM profiles WHERE id = auth.uid();

    -- Validasi apakah kategori tujuan ada dan milik household yang sama
    IF NOT EXISTS (
        SELECT 1 FROM categories c
        WHERE c.id = new_category_id
        AND c.household_id = user_household_id
    ) THEN
        RAISE EXCEPTION 'Category not found or does not belong to this household.';
    END IF;

    -- Update transaksi berdasarkan array ID yang diberikan
    WITH updated AS (
        UPDATE transactions
        SET category = new_category_id -- <-- PERBAIKAN DI SINI: 'category_id' diubah menjadi 'category'
        WHERE id = ANY(transaction_ids)
        -- Keamanan tambahan untuk memastikan operasi hanya terjadi dalam household pengguna
        AND household_id = user_household_id
        RETURNING 1
    )
    SELECT count(*) INTO updated_count FROM updated;

    RETURN updated_count;
END;
$$;


ALTER FUNCTION "public"."bulk_update_transaction_category"("transaction_ids" "text"[], "new_category_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_recurring_instance"("p_instance_id" bigint, "p_confirmed_amount" numeric DEFAULT NULL::numeric, "p_confirmed_category" bigint DEFAULT NULL::bigint, "p_confirmed_account_id" "uuid" DEFAULT NULL::"uuid", "p_confirmed_to_account_id" "uuid" DEFAULT NULL::"uuid", "p_confirmed_note" "text" DEFAULT NULL::"text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  instance_record RECORD;
  template_record RECORD;
  new_transaction_id TEXT;
  user_household_id UUID;
  final_amount NUMERIC;
  final_category BIGINT;
  final_account_id UUID;
  final_to_account_id UUID;
  final_note TEXT;
  status_to_set TEXT;
BEGIN
  -- Get user's household_id
  SELECT household_id INTO user_household_id 
  FROM profiles WHERE id = auth.uid();
  
  -- Get instance and template data
  SELECT ri.*, rt.template_name, rt.type, rt.amount, rt.category_id, 
         rt.account_id, rt.to_account_id, rt.note
  INTO instance_record
  FROM recurring_instances ri
  JOIN recurring_templates rt ON ri.recurring_template_id = rt.id
  WHERE ri.id = p_instance_id 
  AND ri.household_id = user_household_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recurring instance not found or access denied';
  END IF;
  
  IF instance_record.status IN ('done', 'confirmed') THEN
    RAISE EXCEPTION 'Instance already processed';
  END IF;
  
  -- Use confirmed values or fall back to template values
  final_amount := COALESCE(p_confirmed_amount, instance_record.amount);
  final_category := COALESCE(p_confirmed_category, instance_record.category_id);
  final_account_id := COALESCE(p_confirmed_account_id, instance_record.account_id);
  final_to_account_id := COALESCE(p_confirmed_to_account_id, instance_record.to_account_id);
  final_note := COALESCE(p_confirmed_note, instance_record.note);
  
  -- Determine status based on whether values were modified
  IF (p_confirmed_amount IS NOT NULL AND p_confirmed_amount != instance_record.amount) OR
     (p_confirmed_category IS NOT NULL AND p_confirmed_category != instance_record.category_id) OR
     (p_confirmed_account_id IS NOT NULL AND p_confirmed_account_id != instance_record.account_id) OR
     (p_confirmed_to_account_id IS NOT NULL AND p_confirmed_to_account_id != instance_record.to_account_id) OR
     (p_confirmed_note IS NOT NULL AND p_confirmed_note != COALESCE(instance_record.note, '')) THEN
    status_to_set := 'done_with_difference';
  ELSE
    status_to_set := 'done';
  END IF;
  
  -- Create the actual transaction
  INSERT INTO transactions (
    household_id,
    user_id,
    type,
    amount,
    category,
    account_id,
    to_account_id,
    note,
    date
  ) VALUES (
    user_household_id,
    auth.uid(),
    instance_record.type,
    final_amount,
    final_category,
    final_account_id,
    final_to_account_id,
    final_note || CASE WHEN final_note IS NOT NULL THEN ' ' ELSE '' END || '(from: ' || instance_record.template_name || ')',
    instance_record.due_date
  ) RETURNING id INTO new_transaction_id;
  
  -- Update the instance
  UPDATE recurring_instances 
  SET 
    status = status_to_set,
    confirmed_amount = final_amount,
    confirmed_category = final_category,
    confirmed_account_id = final_account_id,
    confirmed_to_account_id = final_to_account_id,
    confirmed_note = final_note,
    actual_transaction_id = new_transaction_id,
    updated_at = NOW()
  WHERE id = p_instance_id;
  
  RETURN new_transaction_id;
END;
$$;


ALTER FUNCTION "public"."confirm_recurring_instance"("p_instance_id" bigint, "p_confirmed_amount" numeric, "p_confirmed_category" bigint, "p_confirmed_account_id" "uuid", "p_confirmed_to_account_id" "uuid", "p_confirmed_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_asset_with_initial_balance"("p_household_id" "uuid", "p_user_id" "uuid", "p_asset_name" "text", "p_asset_class" "text", "p_unit" "text", "p_initial_quantity" numeric, "p_total_cost" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_asset_account_id uuid;
    v_initial_fund_account_id uuid;
    v_transaction_id text;
    v_price_per_unit numeric;
BEGIN
    -- 1. Cari akun "Modal Awal Aset"
    SELECT id INTO v_initial_fund_account_id
    FROM public.accounts
    WHERE household_id = p_household_id AND name = 'Modal Awal Aset'
    LIMIT 1;

    -- Jika tidak ditemukan, buat error
    IF v_initial_fund_account_id IS NULL THEN
        RAISE EXCEPTION 'Akun "Modal Awal Aset" tidak ditemukan untuk household ini.';
    END IF;

    -- 2. Buat akun baru untuk aset
    INSERT INTO public.accounts (household_id, user_id, name, type, asset_class, unit, initial_balance)
    VALUES (p_household_id, p_user_id, p_asset_name, 'asset', p_asset_class, p_unit, 0)
    RETURNING id INTO v_asset_account_id;

    -- 3. Hanya lanjutkan jika ada kuantitas dan biaya yang diinput
    IF p_initial_quantity > 0 AND p_total_cost > 0 THEN
        -- Hitung harga per unit dari total
        v_price_per_unit := p_total_cost / p_initial_quantity;

        -- 4. Buat transaksi finansial (transfer) dari "Modal Awal Aset" ke akun aset baru
        INSERT INTO public.transactions (household_id, user_id, type, amount, account_id, to_account_id, date, note)
        VALUES (p_household_id, p_user_id, 'transfer', p_total_cost, v_initial_fund_account_id, v_asset_account_id, NOW()::date, 'Saldo awal aset ' || p_asset_name)
        RETURNING id INTO v_transaction_id;

        -- 5. Buat transaksi aset (buy) yang berelasi dengan transaksi finansial di atas
        INSERT INTO public.asset_transactions (household_id, asset_account_id, transaction_type, quantity, price_per_unit, transaction_date, related_transaction_id)
        VALUES (p_household_id, v_asset_account_id, 'buy', p_initial_quantity, v_price_per_unit, NOW()::date, v_transaction_id);
    END IF;

    -- 6. Kembalikan ID akun aset yang baru dibuat
    RETURN v_asset_account_id;
END;
$$;


ALTER FUNCTION "public"."create_asset_with_initial_balance"("p_household_id" "uuid", "p_user_id" "uuid", "p_asset_name" "text", "p_asset_class" "text", "p_unit" "text", "p_initial_quantity" numeric, "p_total_cost" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_household_invite"("p_invitee_email" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_inviter_id UUID := auth.uid();
  v_household_id UUID;
  v_invitation_id UUID;
BEGIN
  -- Dapatkan household_id dari orang yang mengundang
  SELECT household_id INTO v_household_id FROM public.profiles WHERE id = v_inviter_id;

  -- Cek apakah pengguna sudah menjadi anggota
  IF EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = p_invitee_email) AND household_id = v_household_id) THEN
    RETURN json_build_object('error', 'User is already a member of this household.');
  END IF;

  -- Buat undangan baru
  INSERT INTO public.invitations (household_id, inviter_id, invitee_email)
  VALUES (v_household_id, v_inviter_id, p_invitee_email)
  RETURNING id INTO v_invitation_id;

  RETURN json_build_object('success', true, 'invitation_id', v_invitation_id);
END;
$$;


ALTER FUNCTION "public"."create_household_invite"("p_invitee_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "text", "p_template_name" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_household_id UUID;
  transaction_record RECORD;
  new_template_id BIGINT;
BEGIN
  -- Get user's household_id
  SELECT household_id INTO user_household_id 
  FROM profiles WHERE id = auth.uid();
  
  -- Get transaction data
  SELECT t.type, t.amount, t.category, t.account_id, t.to_account_id, t.note
  INTO transaction_record
  FROM transactions t
  WHERE t.id = p_transaction_id 
  AND t.household_id = user_household_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or access denied';
  END IF;
  
  -- Create recurring template based on transaction
  INSERT INTO recurring_templates (
    household_id,
    user_id,
    template_name,
    type,
    amount,
    category_id,
    account_id,
    to_account_id,
    note,
    frequency,
    interval_value,
    start_date,
    end_date,
    next_due_date,
    is_active
  ) VALUES (
    user_household_id,
    auth.uid(),
    p_template_name,
    transaction_record.type,
    transaction_record.amount,
    transaction_record.category,
    transaction_record.account_id,
    transaction_record.to_account_id,
    transaction_record.note,
    p_frequency,
    COALESCE(p_interval_value, 1),
    p_start_date,
    p_end_date,
    p_start_date,
    true
  ) RETURNING id INTO new_template_id;
  
  RETURN new_template_id;
END;
$$;


ALTER FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "text", "p_template_name" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_recurring_instances"("p_household_id" "uuid", "p_end_date" "date" DEFAULT (CURRENT_DATE + '30 days'::interval)) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  template_record RECORD;
  current_due_date DATE;
  instances_created INTEGER := 0;
BEGIN
  -- Loop through all active recurring templates for the household
  FOR template_record IN 
    SELECT * FROM recurring_templates 
    WHERE household_id = p_household_id 
    AND is_active = true 
    AND next_due_date <= p_end_date
    AND (end_date IS NULL OR next_due_date <= end_date)
  LOOP
    current_due_date := template_record.next_due_date;
    
    -- Generate instances until end_date
    WHILE current_due_date <= p_end_date AND 
          (template_record.end_date IS NULL OR current_due_date <= template_record.end_date)
    LOOP
      -- Check if instance already exists
      IF NOT EXISTS (
        SELECT 1 FROM recurring_instances 
        WHERE recurring_template_id = template_record.id 
        AND due_date = current_due_date
      ) THEN
        -- Create new instance
        INSERT INTO recurring_instances (
          recurring_template_id,
          household_id,
          due_date,
          status
        ) VALUES (
          template_record.id,
          template_record.household_id,
          current_due_date,
          CASE 
            WHEN current_due_date < CURRENT_DATE THEN 'overdue'
            ELSE 'upcoming'
          END
        );
        
        instances_created := instances_created + 1;
      END IF;
      
      -- Calculate next due date based on frequency
      current_due_date := CASE template_record.frequency
        WHEN 'daily' THEN current_due_date + (template_record.interval_value || ' days')::INTERVAL
        WHEN 'weekly' THEN current_due_date + (template_record.interval_value || ' weeks')::INTERVAL
        WHEN 'monthly' THEN current_due_date + (template_record.interval_value || ' months')::INTERVAL
        WHEN 'yearly' THEN current_due_date + (template_record.interval_value || ' years')::INTERVAL
      END;
    END LOOP;
    
    -- Update next_due_date in template
    UPDATE recurring_templates 
    SET next_due_date = current_due_date,
        updated_at = NOW()
    WHERE id = template_record.id;
  END LOOP;
  
  RETURN instances_created;
END;
$$;


ALTER FUNCTION "public"."generate_recurring_instances"("p_household_id" "uuid", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_transaction_id"("t_type" "text", "t_date" "date") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_prefix text;
  v_period text;
  v_seq int;
  v_id text;
begin
  -- Tentukan prefix
  if t_type = 'expense' then
    v_prefix := 'EXP';
  elsif t_type = 'income' then
    v_prefix := 'INC';
  elsif t_type = 'transfer' then
    v_prefix := 'TRF';
  else
    raise exception 'Invalid type: %', t_type;
  end if;

  -- Format period YYYYMM
  v_period := to_char(t_date, 'YYYYMM');

  -- Ambil sequence terakhir
  select coalesce(max(sequence_number), 0) + 1
  into v_seq
  from transactions
  where type = t_type
    and to_char(date, 'YYYYMM') = v_period;

  -- Buat ID lengkap
  v_id := v_prefix || v_period || lpad(v_seq::text, 4, '0');

  return v_id;
end;
$$;


ALTER FUNCTION "public"."generate_transaction_id"("t_type" "text", "t_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "user_id" "uuid", "household_id" "uuid", "initial_balance" numeric, "balance" numeric, "type" "text", "target_amount" numeric, "goal_reason" "text", "achieved_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.name,
        a.user_id,
        a.household_id,
        a.initial_balance,
        (
            a.initial_balance
            + COALESCE((SELECT sum(t.amount) FROM transactions t WHERE t.account_id = a.id AND t.type = 'income'), 0)
            - COALESCE((SELECT sum(t.amount) FROM transactions t WHERE t.account_id = a.id AND t.type = 'expense'), 0)
            + COALESCE((SELECT sum(t.amount) FROM transactions t WHERE t.to_account_id = a.id AND t.type = 'transfer'), 0)
            - COALESCE((SELECT sum(t.amount) FROM transactions t WHERE t.account_id = a.id AND t.type = 'transfer'), 0)
        )::numeric AS balance,
        -- Memastikan kolom-kolom baru ikut terambil
        a.type,
        a.target_amount,
        a.goal_reason,
        a.achieved_at
    FROM
        accounts a
    JOIN
        profiles p ON a.household_id = p.household_id
    WHERE
        p.id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid", "p_household_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "user_id" "uuid", "household_id" "uuid", "initial_balance" numeric, "type" "text", "target_amount" numeric, "goal_reason" "text", "achieved_at" timestamp without time zone, "balance" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH account_transactions AS (
        SELECT
            t.account_id AS acc_id,
            SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS total
        FROM transactions t
        WHERE t.type IN ('income', 'expense')
          AND t.user_id = p_user_id
        GROUP BY t.account_id
    ),
    account_transfers_from AS (
        SELECT
            t.account_id AS acc_id,
            SUM(t.amount) AS total
        FROM transactions t
        WHERE t.type = 'transfer'
          AND t.user_id = p_user_id
        GROUP BY t.account_id
    ),
    account_transfers_to AS (
        SELECT
            t.to_account_id AS acc_id,
            SUM(t.amount) AS total
        FROM transactions t
        WHERE t.type = 'transfer'
          AND t.user_id = p_user_id
        GROUP BY t.to_account_id
    )
    SELECT
        a.id,
        a.name,
        a.user_id,
        a.household_id,
        a.initial_balance,
        a.type,
        a.target_amount,
        a.goal_reason,
        a.achieved_at,
        (
            COALESCE(a.initial_balance, 0)
            + COALESCE(at.total, 0)
            - COALESCE(atf.total, 0)
            + COALESCE(att.total, 0)
        )::numeric AS balance
    FROM accounts a
    LEFT JOIN account_transactions at ON a.id = at.acc_id
    LEFT JOIN account_transfers_from atf ON a.id = atf.acc_id
    LEFT JOIN account_transfers_to att ON a.id = att.acc_id
    WHERE a.household_id = p_household_id
      AND a.user_id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid", "p_household_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accounts_with_balance (not used)"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "user_id" "uuid", "household_id" "uuid", "initial_balance" numeric, "type" "text", "target_amount" numeric, "goal_reason" "text", "achieved_at" timestamp with time zone, "balance" numeric)
    LANGUAGE "plpgsql"
    AS $$BEGIN
    RETURN QUERY
    WITH account_transactions AS (
        SELECT
            t.account_id AS acc_id,
            SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END) AS total
        FROM transactions t
        WHERE t.type IN ('income', 'expense')
          AND t.user_id = p_user_id
        GROUP BY t.account_id
    ),
    account_transfers_from AS (
        SELECT
            t.account_id AS acc_id,
            SUM(t.amount) AS total
        FROM transactions t
        WHERE t.type = 'transfer'
          AND t.user_id = p_user_id
        GROUP BY t.account_id
    ),
    account_transfers_to AS (
        SELECT
            t.to_account_id AS acc_id,
            SUM(t.amount) AS total
        FROM transactions t
        WHERE t.type = 'transfer'
          AND t.user_id = p_user_id
        GROUP BY t.to_account_id
    )
    SELECT
        a.id,
        a.name,
        a.user_id,
        a.household_id,
        a.initial_balance,
        a.type,
        a.target_amount,
        a.goal_reason,
        a.achieved_at,
        (a.initial_balance + COALESCE(at.total, 0) - COALESCE(atf.total, 0) + COALESCE(att.total, 0))::numeric AS balance
    FROM
        accounts a
    LEFT JOIN account_transactions at ON a.id = at.acc_id
    LEFT JOIN account_transfers_from atf ON a.id = atf.acc_id
    LEFT JOIN account_transfers_to att ON a.id = att.acc_id
    WHERE a.household_id = p_household_id;
END;$$;


ALTER FUNCTION "public"."get_accounts_with_balance (not used)"("p_user_id" "uuid") OWNER TO "postgres";


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

    -- 3. Mengembalikan query
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
        -- Menggunakan logika filter yang sama seperti di dasbor
        AND (c.parent_id IS NOT NULL OR (c.parent_id IS NULL AND ba.is_flex_budget = TRUE))
    ORDER BY
        c.name ASC;
END;
$$;


ALTER FUNCTION "public"."get_all_budget_categories_for_period"("p_ref_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_assets_with_details"("p_household_id" "uuid") RETURNS TABLE("account_id" "uuid", "name" "text", "asset_class" "text", "unit" "text", "total_quantity" numeric, "average_cost_basis" numeric, "total_cost" numeric, "current_price" numeric, "current_value" numeric, "unrealized_pnl" numeric, "unrealized_pnl_percent" numeric)
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN QUERY
    WITH
    asset_tx_calcs AS (
        SELECT
            at.asset_account_id,
            SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity ELSE -at.quantity END) AS current_quantity,
            SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity * at.price_per_unit ELSE 0 END) AS total_buy_cost,
            SUM(CASE WHEN at.transaction_type = 'buy' THEN at.quantity ELSE 0 END) AS total_buy_quantity
        FROM
            public.asset_transactions at
        WHERE at.household_id = p_household_id
        GROUP BY
            at.asset_account_id
    ),
    last_prices AS (
      SELECT DISTINCT ON (asset_account_id)
        asset_account_id,
        price_per_unit
      FROM public.asset_transactions
      WHERE household_id = p_household_id AND transaction_type = 'buy'
      ORDER BY asset_account_id, transaction_date DESC, created_at DESC
    )
    SELECT
        a.id AS account_id,
        a.name,
        a.asset_class,
        a.unit,
        COALESCE(atc.current_quantity, 0) AS total_quantity,
        (CASE WHEN COALESCE(atc.total_buy_quantity, 0) > 0 THEN atc.total_buy_cost / atc.total_buy_quantity ELSE 0 END)::numeric AS average_cost_basis,
        (COALESCE(atc.current_quantity, 0) * (CASE WHEN COALESCE(atc.total_buy_quantity, 0) > 0 THEN atc.total_buy_cost / atc.total_buy_quantity ELSE 0 END))::numeric AS total_cost,
        
        -- --- PERUBAHAN UTAMA: Membaca dari tabel current_prices ---
        COALESCE(
            (CASE 
                -- Jika kelas aset adalah 'gold', ambil harga dari tabel current_prices
                WHEN a.asset_class = 'gold' THEN (SELECT cp.price FROM public.current_prices cp WHERE cp.asset_key = 'GOLD_IDR' LIMIT 1)
                -- Tambahkan logika untuk aset lain di sini jika perlu
                -- WHEN a.asset_class = 'stock' THEN ...
                ELSE lp.price_per_unit
            END),
            lp.price_per_unit, -- Fallback ke harga beli terakhir jika tidak ada harga pasar
            0
        ) AS current_price,
        
        (COALESCE(atc.current_quantity, 0) * COALESCE(
            (CASE 
                WHEN a.asset_class = 'gold' THEN (SELECT cp.price FROM public.current_prices cp WHERE cp.asset_key = 'GOLD_IDR' LIMIT 1)
                ELSE lp.price_per_unit
            END),
            lp.price_per_unit,
            0
        ))::numeric AS current_value,
        
        ((COALESCE(atc.current_quantity, 0) * COALESCE(
            (CASE 
                WHEN a.asset_class = 'gold' THEN (SELECT cp.price FROM public.current_prices cp WHERE cp.asset_key = 'GOLD_IDR' LIMIT 1)
                ELSE lp.price_per_unit
            END),
            lp.price_per_unit,
            0
        )) - (COALESCE(atc.current_quantity, 0) * (CASE WHEN COALESCE(atc.total_buy_quantity, 0) > 0 THEN atc.total_buy_cost / atc.total_buy_quantity ELSE 0 END)))::numeric AS unrealized_pnl,
        
        (CASE
            WHEN (COALESCE(atc.current_quantity, 0) * (CASE WHEN COALESCE(atc.total_buy_quantity, 0) > 0 THEN atc.total_buy_cost / atc.total_buy_quantity ELSE 0 END)) > 0
            THEN (((COALESCE(atc.current_quantity, 0) * COALESCE(
                (CASE 
                    WHEN a.asset_class = 'gold' THEN (SELECT cp.price FROM public.current_prices cp WHERE cp.asset_key = 'GOLD_IDR' LIMIT 1)
                    ELSE lp.price_per_unit
                END),
                lp.price_per_unit,
                0
            )) - (COALESCE(atc.current_quantity, 0) * (CASE WHEN COALESCE(atc.total_buy_quantity, 0) > 0 THEN atc.total_buy_cost / atc.total_buy_quantity ELSE 0 END))) / (COALESCE(atc.current_quantity, 0) * (CASE WHEN COALESCE(atc.total_buy_quantity, 0) > 0 THEN atc.total_buy_cost / atc.total_buy_quantity ELSE 0 END))) * 100
            ELSE 0
        END)::numeric AS unrealized_pnl_percent
    FROM
        public.accounts a
    LEFT JOIN
        asset_tx_calcs atc ON a.id = atc.asset_account_id
    LEFT JOIN
        last_prices lp ON a.id = lp.asset_account_id
    WHERE a.household_id = p_household_id AND a.type = 'asset';
END;
$$;


ALTER FUNCTION "public"."get_assets_with_details"("p_household_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_balance_for_account"("p_account_id" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_initial_balance NUMERIC;
    v_total_change NUMERIC;
    v_account_uuid UUID;
BEGIN
    -- Konversi text ID ke UUID
    v_account_uuid := p_account_id::UUID;

    -- 1. Ambil saldo awal akun
    SELECT initial_balance INTO v_initial_balance
    FROM public.accounts
    WHERE id = v_account_uuid;

    -- 2. Hitung total perubahan dari transaksi
    SELECT COALESCE(SUM(
        CASE
            WHEN type = 'income' AND account_id = v_account_uuid THEN amount
            WHEN type = 'expense' AND account_id = v_account_uuid THEN -amount
            WHEN type = 'transfer' AND account_id = v_account_uuid THEN -amount -- Uang keluar
            WHEN type = 'transfer' AND to_account_id = v_account_uuid THEN amount -- Uang masuk
            ELSE 0
        END
    ), 0) INTO v_total_change
    FROM public.transactions
    WHERE account_id = v_account_uuid OR to_account_id = v_account_uuid;

    -- 3. Kembalikan saldo akhir
    RETURN v_initial_balance + v_total_change;
END;
$$;


ALTER FUNCTION "public"."get_balance_for_account"("p_account_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_month" "date") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    last_month_date date;
    result json;
BEGIN
    last_month_date := p_month - interval '1 month';

    WITH 
    category_base AS (
      SELECT 
        c.id,
        c.name,
        c.parent_id,
        p.name as parent_name,
        c.type
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.household_id = p_household_id AND c.type = 'expense'
    ),
    current_month_activity AS (
      SELECT
        c.id as category_id,
        COALESCE(SUM(t.amount), 0) as activity
      FROM category_base c
      LEFT JOIN transactions t ON t.category = c.id 
        AND t.household_id = p_household_id
        AND date_trunc('month', t.date) = date_trunc('month', p_month)
        AND t.type = 'expense'
      GROUP BY c.id
    ),
    current_month_assigned AS (
      SELECT
        category_id,
        COALESCE(SUM(assigned_amount), 0) as assigned
      FROM budget_assignments
      WHERE household_id = p_household_id
        AND month = p_month
      GROUP BY category_id
    ),
    last_month_available AS (
        SELECT 
            c.id AS category_id,
            (
                COALESCE((SELECT assigned_amount FROM budget_assignments WHERE category_id = c.id AND month = last_month_date AND household_id = p_household_id), 0)
                -
                COALESCE((SELECT sum(amount) FROM transactions WHERE category = c.id AND date_trunc('month', date) = date_trunc('month', last_month_date) AND type = 'expense' AND household_id = p_household_id), 0)
            ) AS rollover
        FROM categories c
        WHERE c.household_id = p_household_id AND c.type = 'expense' AND c.parent_id IS NOT NULL
    ),
    child_categories_data AS (
      SELECT
        cb.id,
        cb.name,
        cb.parent_id,
        COALESCE(lma.rollover, 0) as rollover,
        COALESCE(cma.assigned, 0) as assigned,
        COALESCE(cma_act.activity, 0) as activity,
        (COALESCE(lma.rollover, 0) + COALESCE(cma.assigned, 0) - COALESCE(cma_act.activity, 0)) as available
      FROM category_base cb
      LEFT JOIN last_month_available lma ON cb.id = lma.category_id
      LEFT JOIN current_month_assigned cma ON cb.id = cma.category_id
      LEFT JOIN current_month_activity cma_act ON cb.id = cma_act.category_id
      WHERE cb.parent_id IS NOT NULL
    ),
    parent_categories_data AS (
      SELECT
        cb.id,
        cb.name,
        cb.parent_id,
        SUM(ccd.rollover) as rollover,
        SUM(ccd.assigned) as assigned,
        SUM(ccd.activity) as activity,
        SUM(ccd.available) as available,
        json_agg(
          json_build_object(
            'id', ccd.id,
            'name', ccd.name,
            'rollover', ccd.rollover,
            'assigned', ccd.assigned,
            'activity', ccd.activity,
            'available', ccd.available
          ) ORDER BY ccd.name
        ) as children
      FROM category_base cb
      JOIN child_categories_data ccd ON cb.id = ccd.parent_id
      WHERE cb.parent_id IS NULL
      GROUP BY cb.id, cb.name, cb.parent_id
    )
    SELECT json_build_object(
        'income', (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND type = 'income' AND date_trunc('month', date) = date_trunc('month', p_month)),
        'budgeted', (SELECT COALESCE(SUM(assigned), 0) FROM current_month_assigned),
        'activity', (SELECT COALESCE(SUM(activity), 0) FROM current_month_activity),
        'categories', (SELECT json_agg(pcd.*) FROM parent_categories_data pcd)
    )
    INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("total_income" numeric, "total_budgeted" numeric, "total_activity" numeric, "categories" json)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_current_month_start date := date_trunc('month', p_start_date);
BEGIN
    RETURN QUERY
    WITH 
    all_categories AS (
        SELECT 
            c.id, c.name, c.parent_id, c.is_rollover,
            COALESCE((
                SELECT ba.is_flex_budget 
                FROM public.budget_assignments ba
                WHERE ba.category_id = c.id 
                AND ba.household_id = p_household_id
                AND ba.month = v_current_month_start
                LIMIT 1
            ), false) as is_flex_budget
        FROM public.categories c
        WHERE c.household_id = p_household_id AND NOT c.is_archived AND c.type = 'expense'
    ),
    
    historical_assignments AS (
        SELECT
            ba.category_id,
            COALESCE(SUM(ba.assigned_amount), 0) AS total_assigned
        FROM public.budget_assignments ba
        WHERE ba.household_id = p_household_id
        AND ba.month < v_current_month_start
        GROUP BY ba.category_id
    ),

    historical_activity AS (
        SELECT
            t.category as category_id,
            COALESCE(SUM(t.amount), 0) AS total_activity
        FROM public.transactions t
        WHERE t.household_id = p_household_id
        AND t.type = 'expense'
        AND t.date < p_start_date
        GROUP BY t.category
    ),

    historical_data AS (
        SELECT
            c.id AS category_id,
            COALESCE(ha.total_assigned, 0) AS total_assigned_historical,
            COALESCE(hact.total_activity, 0) AS total_activity_historical
        FROM all_categories c
        LEFT JOIN historical_assignments ha ON c.id = ha.category_id
        LEFT JOIN historical_activity hact ON c.id = hact.category_id
        WHERE c.is_rollover
    ),
    
    current_data AS (
        SELECT
            c.id as category_id,
            (SELECT COALESCE(SUM(t.amount), 0)
             FROM public.transactions t
             WHERE t.category = c.id AND t.household_id = p_household_id AND t.type = 'expense'
               AND t.date BETWEEN p_start_date AND p_end_date) as current_activity,
            (SELECT COALESCE(SUM(ba.assigned_amount), 0)
             FROM public.budget_assignments ba
             WHERE ba.category_id = c.id AND ba.household_id = p_household_id
               AND ba.month = v_current_month_start) as current_assigned
        FROM all_categories c
    ),
    
    category_base_data AS (
        SELECT 
            c.id, c.name, c.parent_id, c.is_rollover, c.is_flex_budget,
            p.is_flex_budget as parent_is_flex, -- Ambil status flex dari induknya
            CASE 
                WHEN c.is_rollover THEN COALESCE(h.total_assigned_historical, 0) - COALESCE(h.total_activity_historical, 0)
                ELSE 0 
            END as rollover,
            COALESCE(curr.current_assigned, 0) as assigned,
            COALESCE(curr.current_activity, 0) as activity
        FROM all_categories c
        LEFT JOIN historical_data h ON c.id = h.category_id
        LEFT JOIN current_data curr ON c.id = curr.category_id
        LEFT JOIN all_categories p ON c.parent_id = p.id -- Join ke diri sendiri untuk dapatkan info induk
    ),

    -- Hitung 'available' di CTE terpisah setelah mendapatkan status 'parent_is_flex'
    category_final_data AS (
        SELECT
            *,
            -- --- PERBAIKAN LOGIKA 'AVAILABLE' UNTUK SUB-KATEGORI ---
            -- Jika induknya adalah flex budget, nilai available sub-kategori tidak relevan (dianggap 0).
            -- Jika tidak, hitung seperti biasa.
            CASE
                WHEN parent_is_flex THEN 0
                ELSE rollover + assigned - activity
            END as available
        FROM category_base_data
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


ALTER FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_budget_plan_with_rollover"("p_household_id" "uuid", "p_period" "date") RETURNS TABLE("category_id" bigint, "category_name" "text", "is_rollover" boolean, "allocated_amount" numeric, "rollover_amount" numeric, "total_budget" numeric, "spent_amount" numeric, "remaining_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
  with
    -- 1. Calculate spending per category for the current period
    current_spending as (
      select
        t.category as cat_id,
        coalesce(sum(t.amount), 0) as total_spent
      from transactions t
      where
        t.household_id = p_household_id
        and t.type = 'expense'
        and date_trunc('month', t.date) = date_trunc('month', p_period)
      group by t.category
    ),
    -- 2. Calculate spending per category for the previous period (for rollover calculation)
    previous_spending as (
      select
        t.category as cat_id,
        coalesce(sum(t.amount), 0) as total_spent
      from transactions t
      where
        t.household_id = p_household_id
        and t.type = 'expense'
        and date_trunc('month', t.date) = date_trunc('month', p_period - interval '1 month')
      group by t.category
    ),
    -- 3. Get budget allocations for the previous period
    previous_allocations as (
      select
        ba.category_id as cat_id,
        ba.amount
      from budget_allocations ba
      where ba.household_id = p_household_id
        and date_trunc('month', ba.period) = date_trunc('month', p_period - interval '1 month')
    ),
    -- 4. Calculate the leftover from the previous period
    rollover_calculation as (
      select
        pa.cat_id,
        greatest(0, pa.amount - coalesce(ps.total_spent, 0)) as leftover
      from previous_allocations pa
      left join previous_spending ps on pa.cat_id = ps.cat_id
    )
  -- 5. Final assembly of the data for the current period
  select
    c.id as category_id,
    c.name as category_name,
    bc.is_rollover,
    ba.amount as allocated_amount,
    -- Use the rollover amount only if the flag is true
    coalesce(case when bc.is_rollover then rc.leftover else 0 end, 0) as rollover_amount,
    -- Calculate total budget
    ba.amount + coalesce(case when bc.is_rollover then rc.leftover else 0 end, 0) as total_budget,
    coalesce(cs.total_spent, 0) as spent_amount,
    -- Calculate remaining amount
    (ba.amount + coalesce(case when bc.is_rollover then rc.leftover else 0 end, 0)) - coalesce(cs.total_spent, 0) as remaining_amount
  from budget_allocations ba
  join categories c on ba.category_id = c.id
  join budget_categories bc on ba.budget_id = bc.budget_id and ba.category_id = bc.category_id
  left join current_spending cs on ba.category_id = cs.cat_id
  left join rollover_calculation rc on ba.category_id = rc.cat_id
  where
    ba.household_id = p_household_id
    and date_trunc('month', ba.period) = date_trunc('month', p_period)
  order by
    c.name;
end;
$$;


ALTER FUNCTION "public"."get_budget_plan_with_rollover"("p_household_id" "uuid", "p_period" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cash_flow_and_balance_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("period" "text", "pemasukan" numeric, "pengeluaran" numeric, "saldo_akhir" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_opening_balance NUMERIC;
BEGIN
    -- 1. Hitung saldo awal (v_opening_balance) dengan cara yang aman
    WITH income_expense_agg AS (
        SELECT
            t.account_id,
            SUM(CASE WHEN t.type = 'income' THEN t.amount WHEN t.type = 'expense' THEN -t.amount ELSE 0 END) AS total_income_expense
        FROM
            public.transactions t
        WHERE
            t.household_id = p_household_id
            AND t.date < p_start_date
            AND t.type IN ('income', 'expense')
        GROUP BY
            t.account_id
    ),
    transfers_agg AS (
        SELECT
            account_id,
            SUM(amount) AS net_transfer_amount
        FROM (
            SELECT tr.account_id, -tr.amount AS amount FROM public.transactions tr
            WHERE tr.household_id = p_household_id AND tr.date < p_start_date AND tr.type = 'transfer'
            UNION ALL
            SELECT tr.to_account_id AS account_id, tr.amount FROM public.transactions tr
            WHERE tr.household_id = p_household_id AND tr.date < p_start_date AND tr.type = 'transfer' AND tr.to_account_id IS NOT NULL
        ) AS all_transfers
        GROUP BY account_id
    )
    SELECT
        COALESCE(SUM(a.initial_balance + COALESCE(ie.total_income_expense, 0) + COALESCE(t.net_transfer_amount, 0)), 0)
    INTO
        v_opening_balance
    FROM
        public.accounts a
    LEFT JOIN income_expense_agg ie ON a.id = ie.account_id
    LEFT JOIN transfers_agg t ON a.id = t.account_id
    WHERE
        a.household_id = p_household_id
        AND a.type = 'generic'
        AND a.name != 'Modal Awal Aset';

    -- 2. Buat seri tanggal dan hitung perubahan harian serta saldo akhir kumulatif
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS report_date
    ),
    daily_cash_flow AS (
        SELECT
            t.date,
            SUM(CASE 
                WHEN t.type = 'income' THEN t.amount
                WHEN t.type = 'transfer' AND acc_to.type = 'generic' AND acc_from.type != 'generic' THEN t.amount
                ELSE 0 
            END) AS total_income,
            SUM(CASE 
                WHEN t.type = 'expense' THEN t.amount -- Pengeluaran sebagai angka positif
                WHEN t.type = 'transfer' AND acc_from.type = 'generic' AND acc_to.type != 'generic' THEN t.amount
                ELSE 0 
            END) AS total_expense
        FROM 
            public.transactions t
        JOIN public.accounts acc_from ON t.account_id = acc_from.id
        LEFT JOIN public.accounts acc_to ON t.to_account_id = acc_to.id
        WHERE
            t.household_id = p_household_id
            AND t.date BETWEEN p_start_date AND p_end_date
            AND NOT (t.type = 'transfer' AND acc_from.type = 'generic' AND acc_to.type = 'generic')
        GROUP BY t.date
    )
    SELECT
        dcf.date::text as period,
        COALESCE(dcf.total_income, 0) AS pemasukan,
        COALESCE(dcf.total_expense, 0) AS pengeluaran,
        (v_opening_balance + SUM(COALESCE(dcf.total_income, 0) - COALESCE(dcf.total_expense, 0)) OVER (ORDER BY dcf.date))::numeric AS saldo_akhir
    FROM
        daily_cash_flow dcf
    ORDER BY
        dcf.date;
END;
$$;


ALTER FUNCTION "public"."get_cash_flow_and_balance_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cash_flow_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("period" "text", "Pemasukan" numeric, "Pengeluaran" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(d.day, 'YYYY-MM-DD') AS period,
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0) AS "Pemasukan",
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS "Pengeluaran"
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) d(day)
    LEFT JOIN transactions t ON t.date = d.day AND t.household_id = p_household_id AND t.type IN ('income', 'expense')
    GROUP BY d.day
    ORDER BY d.day;
END;
$$;


ALTER FUNCTION "public"."get_cash_flow_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_category_analytics"("p_household_id" "uuid", "p_category_id" integer, "p_start_date" "date", "p_end_date" "date") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    result json;
    v_current_total numeric;
    v_previous_total numeric;
    v_period_average numeric;
    v_percentage_of_total numeric;
    v_sub_category_spending json;
    v_total_spending_in_period numeric;
    
    v_period_duration interval;
    v_previous_start_date date;
    v_previous_end_date date;
    v_six_months_ago date;
BEGIN
    v_period_duration := p_end_date - p_start_date;
    v_previous_start_date := p_start_date - v_period_duration - interval '1 day';
    v_previous_end_date := p_end_date - v_period_duration - interval '1 day';
    v_six_months_ago := date_trunc('month', p_start_date) - interval '6 months';

    -- Mengambil ID kategori dan semua sub-kategorinya
    WITH category_and_children AS (
        SELECT id FROM categories WHERE id = p_category_id
        UNION ALL
        SELECT id FROM categories WHERE parent_id = p_category_id
    )
    -- Menghitung semua metrik dalam satu query utama
    SELECT
        -- 1. Total pengeluaran periode saat ini
        COALESCE(SUM(CASE WHEN t.date BETWEEN p_start_date AND p_end_date THEN t.amount ELSE 0 END), 0),
        -- 2. Total pengeluaran periode sebelumnya
        COALESCE(SUM(CASE WHEN t.date BETWEEN v_previous_start_date AND v_previous_end_date THEN t.amount ELSE 0 END), 0),
        -- 3. Rata-rata pengeluaran 6 bulan terakhir
        COALESCE(SUM(CASE WHEN t.date >= v_six_months_ago AND t.date < date_trunc('month', p_start_date) THEN t.amount ELSE 0 END) / 6, 0)
    INTO
        v_current_total,
        v_previous_total,
        v_period_average
    FROM transactions t
    WHERE
        t.household_id = p_household_id
        AND t.type = 'expense'
        AND t.category IN (SELECT id FROM category_and_children);

    -- Hitung total pengeluaran SEMUA KATEGORI pada periode saat ini
    SELECT COALESCE(SUM(amount), 1) -- Gunakan 1 jika 0 untuk menghindari pembagian dengan nol
    INTO v_total_spending_in_period
    FROM transactions 
    WHERE household_id = p_household_id AND type = 'expense' AND date BETWEEN p_start_date AND p_end_date;

    -- Hitung persentase
    v_percentage_of_total := (v_current_total / v_total_spending_in_period) * 100;
    
    -- Dapatkan rincian pengeluaran per sub-kategori (query ini sudah benar dan bisa dipertahankan)
    SELECT json_agg(
        json_build_object(
            'name', c.name,
            'value', COALESCE(t_sum.total, 0)
        )
    )
    INTO v_sub_category_spending
    FROM categories c
    LEFT JOIN (
        SELECT category, SUM(amount) as total
        FROM transactions
        WHERE household_id = p_household_id
            AND type = 'expense'
            AND date BETWEEN p_start_date AND p_end_date
        GROUP BY category
    ) t_sum ON t_sum.category = c.id
    WHERE c.household_id = p_household_id
      AND c.parent_id = p_category_id;

    -- Gabungkan hasil
    SELECT json_build_object(
        'current_period_total', v_current_total,
        'previous_period_total', v_previous_total,
        'period_average', v_period_average,
        'percentage_of_total', v_percentage_of_total,
        'sub_category_spending', COALESCE(v_sub_category_spending, '[]'::json)
    ) INTO result;

    RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_category_analytics"("p_household_id" "uuid", "p_category_id" integer, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" integer, "p_current_period_start" "date") RETURNS TABLE("last_month_spending" numeric, "three_month_avg" numeric, "six_month_avg" numeric, "monthly_history" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_category_ids INT[];
    v_last_period_start DATE;
    v_last_period_end DATE;
    v_3_month_start DATE;
    v_6_month_start DATE;
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

    -- Menghitung rentang tanggal
    v_last_period_start := p_current_period_start - INTERVAL '1 month';
    v_last_period_end   := p_current_period_start - INTERVAL '1 day';
    v_3_month_start := p_current_period_start - INTERVAL '3 months';
    v_6_month_start := p_current_period_start - INTERVAL '6 months';

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
          AND date >= v_6_month_start AND date < p_current_period_start
        GROUP BY 1
    )
    SELECT
        -- 1. Pengeluaran bulan lalu
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND category = ANY(v_category_ids) AND type = 'expense' AND date >= v_last_period_start AND date <= v_last_period_end) AS last_month_spending,
        -- 2. Rata-rata 3 bulan terakhir
        (SELECT COALESCE(SUM(amount) / 3.0, 0) FROM transactions WHERE household_id = p_household_id AND category = ANY(v_category_ids) AND type = 'expense' AND date >= v_3_month_start AND date < p_current_period_start) AS three_month_avg,
        -- 3. Rata-rata 6 bulan terakhir
        (SELECT COALESCE(SUM(amount) / 6.0, 0) FROM transactions WHERE household_id = p_household_id AND category = ANY(v_category_ids) AND type = 'expense' AND date >= v_6_month_start AND date < p_current_period_start) AS six_month_avg,
        -- 4. Histori bulanan dalam format JSON
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


ALTER FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" integer, "p_current_period_start" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" bigint, "p_reference_date" "date", "p_period_start_day" integer) RETURNS TABLE("spent_last_period" numeric, "period_average" numeric, "period_breakdown" "jsonb")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_start_day INT := COALESCE(p_period_start_day, 1);
BEGIN
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
    )
    SELECT
        (SELECT total_spent FROM period_totals ORDER BY period_start DESC LIMIT 1 OFFSET 1) AS spent_last_period,
        (SELECT COALESCE(AVG(total_spent), 0) FROM period_totals WHERE total_spent > 0) AS period_average,
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


ALTER FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" bigint, "p_reference_date" "date", "p_period_start_day" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_category_with_descendants"("p_category_id" bigint) RETURNS TABLE("id" bigint)
    LANGUAGE "sql"
    AS $$ WITH RECURSIVE category_tree AS ( SELECT c.id FROM categories c WHERE c.id = p_category_id UNION ALL SELECT c.id FROM categories c JOIN category_tree ct ON c.parent_id = ct.id ) SELECT * FROM category_tree; $$;


ALTER FUNCTION "public"."get_category_with_descendants"("p_category_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_comparison_metrics"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date", "p_previous_start_date" "date", "p_previous_end_date" "date") RETURNS TABLE("current_income" numeric, "current_spending" numeric, "previous_income" numeric, "previous_spending" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND type = 'income' AND date BETWEEN p_current_start_date AND p_current_end_date) AS current_income,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND type = 'expense' AND date BETWEEN p_current_start_date AND p_current_end_date) AS current_spending,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND type = 'income' AND date BETWEEN p_previous_start_date AND p_previous_end_date) AS previous_income,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND type = 'expense' AND date BETWEEN p_previous_start_date AND p_previous_end_date) AS previous_spending;
END;
$$;


ALTER FUNCTION "public"."get_comparison_metrics"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date", "p_previous_start_date" "date", "p_previous_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_household_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT household_id
  FROM public.profiles
  WHERE id = auth.uid()
$$;


ALTER FUNCTION "public"."get_current_household_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_custom_period_start"("reference_date" "date", "start_day" integer) RETURNS "date"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    current_day INT;
    result_date DATE;
BEGIN
    current_day := EXTRACT(DAY FROM reference_date);

    IF start_day IS NULL OR start_day < 1 OR start_day > 31 THEN
        RETURN date_trunc('month', reference_date)::DATE;
    END IF;

    IF current_day >= start_day THEN
        result_date := make_date(
            EXTRACT(YEAR FROM reference_date)::INT,
            EXTRACT(MONTH FROM reference_date)::INT,
            start_day
        );
    ELSE
        result_date := make_date(
            EXTRACT(YEAR FROM (reference_date - INTERVAL '1 month'))::INT,
            EXTRACT(MONTH FROM (reference_date - INTERVAL '1 month'))::INT,
            start_day
        );
    END IF;

    RETURN result_date;
END;
$$;


ALTER FUNCTION "public"."get_custom_period_start"("reference_date" "date", "start_day" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("period" "text", "pemasukan" numeric, "pengeluaran" numeric, "kas_tersedia" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_opening_balance NUMERIC;
BEGIN
    -- 1. Hitung saldo awal (v_opening_balance) dengan cara yang aman untuk menghindari duplikasi data
    -- (Menggunakan logika yang Anda berikan karena lebih superior)
    WITH income_expense_agg AS (
        -- CTE untuk menghitung total pemasukan dan pengeluaran per akun sebelum tanggal mulai
        SELECT
            t.account_id,
            SUM(CASE WHEN t.type = 'income' THEN t.amount WHEN t.type = 'expense' THEN -t.amount ELSE 0 END) AS total_income_expense
        FROM
            public.transactions t
        WHERE
            t.household_id = p_household_id
            AND t.date < p_start_date
            AND t.type IN ('income', 'expense')
        GROUP BY
            t.account_id
    ),
    transfers_agg AS (
        -- CTE untuk menghitung total (net) transfer per akun sebelum tanggal mulai
        SELECT
            account_id,
            SUM(amount) AS net_transfer_amount
        FROM (
            -- Hitung semua transfer keluar (sebagai negatif)
            SELECT
                tr.account_id,
                -tr.amount AS amount
            FROM
                public.transactions tr
            WHERE
                tr.household_id = p_household_id
                AND tr.date < p_start_date
                AND tr.type = 'transfer'
            UNION ALL
            -- Hitung semua transfer masuk (sebagai positif)
            SELECT
                tr.to_account_id AS account_id,
                tr.amount
            FROM
                public.transactions tr
            WHERE
                tr.household_id = p_household_id
                AND tr.date < p_start_date
                AND tr.type = 'transfer'
                AND tr.to_account_id IS NOT NULL
        ) AS all_transfers
        GROUP BY
            account_id
    )
    -- Hitung saldo awal dengan menggabungkan data yang sudah diagregasi
    SELECT
        COALESCE(SUM(a.initial_balance + COALESCE(ie.total_income_expense, 0) + COALESCE(t.net_transfer_amount, 0)), 0)
    INTO
        v_opening_balance
    FROM
        public.accounts a
    LEFT JOIN
        income_expense_agg ie ON a.id = ie.account_id
    LEFT JOIN
        transfers_agg t ON a.id = t.account_id
    WHERE
        a.household_id = p_household_id
        AND a.type = 'generic'
        AND a.name != 'Modal Awal Aset';

    -- 2. Buat seri tanggal dan hitung perubahan harian serta saldo akhir kumulatif
    -- (Menggunakan logika yang sudah dikoreksi untuk memasukkan transfer)
    RETURN QUERY
    WITH date_series AS (
        -- Membuat daftar semua hari dalam rentang yang diminta
        SELECT generate_series(p_start_date, p_end_date, '1 day'::interval)::date AS report_date
    ),
    daily_cash_flow AS (
        -- Mengagregasi semua transaksi yang mempengaruhi total kas per hari
        SELECT
            t.date,
            -- Pemasukan KAS: Tipe 'income' ATAU 'transfer' yang masuk ke akun 'generic' dari akun NON-generic
            SUM(CASE 
                WHEN t.type = 'income' THEN t.amount
                WHEN t.type = 'transfer' AND acc_to.type = 'generic' AND acc_from.type != 'generic' THEN t.amount
                ELSE 0 
            END) AS total_income,
            
            -- Pengeluaran KAS: Tipe 'expense' ATAU 'transfer' yang keluar dari akun 'generic' ke akun NON-generic
            SUM(CASE 
                WHEN t.type = 'expense' THEN -t.amount
                WHEN t.type = 'transfer' AND acc_from.type = 'generic' AND acc_to.type != 'generic' THEN -t.amount
                ELSE 0 
            END) AS total_expense
        FROM 
            public.transactions t
        JOIN public.accounts acc_from ON t.account_id = acc_from.id
        LEFT JOIN public.accounts acc_to ON t.to_account_id = acc_to.id
        WHERE
            t.household_id = p_household_id
            AND t.date BETWEEN p_start_date AND p_end_date
            -- Hanya transaksi yang relevan dengan arus kas (bukan transfer antar akun kas)
            AND NOT (t.type = 'transfer' AND acc_from.type = 'generic' AND acc_to.type = 'generic')
        GROUP BY t.date
    )
    SELECT
        to_char(ds.report_date, 'DD Mon') as period,
        COALESCE(dcf.total_income, 0) AS pemasukan,
        COALESCE(dcf.total_expense, 0) AS pengeluaran,
        (v_opening_balance + SUM(COALESCE(dcf.total_income, 0) + COALESCE(dcf.total_expense, 0)) OVER (ORDER BY ds.report_date))::numeric AS kas_tersedia
    FROM
        date_series ds
    LEFT JOIN
        daily_cash_flow dcf ON ds.report_date = dcf.date
    ORDER BY
        ds.report_date;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dynamic_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_interval_type" "text" DEFAULT 'auto'::"text") RETURNS TABLE("period_start" "date", "total_income" numeric, "total_expense" numeric)
    LANGUAGE "sql"
    AS $$
WITH series AS (
    SELECT date_trunc(
        -- PERUBAHAN UTAMA: Gunakan p_interval_type jika tersedia, jika tidak, deteksi otomatis
        CASE
            WHEN p_interval_type IN ('day', 'week', 'month') THEN p_interval_type
            WHEN p_end_date - p_start_date < 31 THEN 'day'
            WHEN p_end_date - p_start_date < 92 THEN 'week'
            ELSE 'month'
        END,
        d
    )::date AS period
    FROM generate_series(p_start_date, p_end_date, '1 day'::interval) AS d
),
periods AS (
    SELECT DISTINCT period FROM series ORDER BY period
),
income AS (
    SELECT
        date_trunc(
            CASE
                WHEN p_interval_type IN ('day', 'week', 'month') THEN p_interval_type
                WHEN p_end_date - p_start_date < 31 THEN 'day'
                WHEN p_end_date - p_start_date < 92 THEN 'week'
                ELSE 'month'
            END,
            date
        )::date AS period,
        SUM(amount) AS total
    FROM transactions
    WHERE household_id = p_household_id AND type = 'income' AND date BETWEEN p_start_date AND p_end_date
    GROUP BY period
),
expense AS (
    SELECT
        date_trunc(
            CASE
                WHEN p_interval_type IN ('day', 'week', 'month') THEN p_interval_type
                WHEN p_end_date - p_start_date < 31 THEN 'day'
                WHEN p_end_date - p_start_date < 92 THEN 'week'
                ELSE 'month'
            END,
            date
        )::date AS period,
        SUM(amount) AS total
    FROM transactions
    WHERE household_id = p_household_id AND type = 'expense' AND date BETWEEN p_start_date AND p_end_date
    GROUP BY period
)
SELECT
    p.period AS period_start,
    COALESCE(i.total, 0) AS total_income,
    COALESCE(e.total, 0) AS total_expense
FROM periods p
LEFT JOIN income i ON p.period = i.period
LEFT JOIN expense e ON p.period = e.period
ORDER BY p.period ASC;
$$;


ALTER FUNCTION "public"."get_dynamic_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_interval_type" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_goal_achievement_stats"("p_account_id" "uuid") RETURNS TABLE("total_collected" numeric, "saving_period_in_months" bigint, "average_monthly_saving" numeric, "largest_contribution" numeric)
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_first_transfer_date date;
    v_last_transfer_date date;
BEGIN
    SELECT MIN(date), MAX(date)
    INTO v_first_transfer_date, v_last_transfer_date
    FROM transactions
    WHERE to_account_id = p_account_id AND type = 'transfer';

    RETURN QUERY
    SELECT
        -- Total terkumpul (dari semua transfer masuk)
        COALESCE(SUM(t.amount), 0) as total_collected,
        
        -- Periode menabung dalam bulan
        CASE
            WHEN v_first_transfer_date IS NOT NULL AND v_last_transfer_date IS NOT NULL
            THEN date_part('year', v_last_transfer_date::timestamp - v_first_transfer_date::timestamp) * 12 +
                 date_part('month', v_last_transfer_date::timestamp - v_first_transfer_date::timestamp)
            ELSE 0
        END::bigint as saving_period_in_months,

        -- Rata-rata tabungan per bulan
        COALESCE(AVG(monthly_sum.total), 0) as average_monthly_saving,

        -- Kontribusi (transfer masuk) terbesar
        COALESCE(MAX(t.amount), 0) as largest_contribution
    FROM transactions t
    LEFT JOIN (
        SELECT date_trunc('month', date) as month, SUM(amount) as total
        FROM transactions
        WHERE to_account_id = p_account_id AND type = 'transfer'
        GROUP BY 1
    ) as monthly_sum ON date_trunc('month', t.date) = monthly_sum.month
    WHERE t.to_account_id = p_account_id AND t.type = 'transfer';
END;
$$;


ALTER FUNCTION "public"."get_goal_achievement_stats"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_goal_projection"("p_account_id" "uuid") RETURNS TABLE("estimated_completion_date" "date")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_avg_monthly_saving numeric;
    v_remaining_amount numeric;
    v_months_needed numeric;
    v_current_balance numeric;
    v_target_amount numeric;
BEGIN
    -- 1. Ambil saldo saat ini dan target dari akun
    SELECT 
        (a.initial_balance + COALESCE(SUM(CASE WHEN t.to_account_id = a.id THEN t.amount WHEN t.account_id = a.id AND t.type = 'income' THEN t.amount ELSE -t.amount END), 0)),
        a.target_amount
    INTO v_current_balance, v_target_amount
    FROM accounts a
    LEFT JOIN transactions t ON t.account_id = a.id OR t.to_account_id = a.id
    WHERE a.id = p_account_id
    GROUP BY a.id;

    -- Jika tidak ada target atau saldo sudah melebihi target, tidak perlu proyeksi
    IF v_target_amount IS NULL OR v_target_amount <= 0 OR v_current_balance >= v_target_amount THEN
        RETURN;
    END IF;

    -- 2. Hitung rata-rata transfer masuk (tabungan) per bulan selama 6 bulan terakhir
    SELECT COALESCE(AVG(monthly_sum), 0)
    INTO v_avg_monthly_saving
    FROM (
        SELECT SUM(amount) as monthly_sum
        FROM transactions
        WHERE to_account_id = p_account_id
          AND type = 'transfer'
          AND date >= (now() - interval '6 months')
        GROUP BY date_trunc('month', date)
    ) as monthly_savings;

    -- Jika tidak ada riwayat menabung, tidak ada proyeksi
    IF v_avg_monthly_saving <= 0 THEN
        RETURN;
    END IF;
    
    -- 3. Hitung sisa dana dan estimasi bulan yang dibutuhkan
    v_remaining_amount := v_target_amount - v_current_balance;
    v_months_needed := CEIL(v_remaining_amount / v_avg_monthly_saving);

    -- 4. Hitung tanggal estimasi
    estimated_completion_date := (now() + (v_months_needed * interval '1 month'))::date;
    
    RETURN NEXT;
END;
$$;


ALTER FUNCTION "public"."get_goal_projection"("p_account_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_monthly_cash_flow"("p_user_id" "uuid") RETURNS TABLE("month_start" "text", "total_income" numeric, "total_expense" numeric)
    LANGUAGE "sql"
    AS $$ WITH months AS ( SELECT DATE_TRUNC('month', GENERATE_SERIES(NOW() - INTERVAL '5 months', NOW(), '1 month'))::date AS month_start ), user_household AS ( SELECT household_id FROM public.profiles WHERE id = p_user_id ) SELECT TO_CHAR(m.month_start, 'Mon YYYY'), COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) FROM months m LEFT JOIN transactions t ON DATE_TRUNC('month', t.date) = m.month_start AND t.household_id = (SELECT household_id FROM user_household) GROUP BY m.month_start ORDER BY m.month_start ASC; $$;


ALTER FUNCTION "public"."get_monthly_cash_flow"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_quick_budget_overview"("p_ref_date" "date") RETURNS SETOF "public"."budget_summary_item"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_household_id UUID;
    v_period_start_day INT;
    v_budget_month_anchor DATE;
    v_transaction_start_date DATE;
    v_transaction_end_date DATE;
BEGIN
    -- 1. Ambil data profil
    SELECT p.household_id, COALESCE(p.period_start_day, 1)
    INTO v_household_id, v_period_start_day
    FROM public.profiles p WHERE id = v_user_id;

    IF v_household_id IS NULL THEN
        RAISE EXCEPTION 'Household not found for the current user.';
    END IF;

    -- 2. Kalkulasi periode
    IF EXTRACT(DAY FROM p_ref_date) >= v_period_start_day THEN
        v_transaction_start_date := make_date(EXTRACT(YEAR FROM p_ref_date)::int, EXTRACT(MONTH FROM p_ref_date)::int, v_period_start_day);
    ELSE
        v_transaction_start_date := make_date(EXTRACT(YEAR FROM p_ref_date - INTERVAL '1 month')::int, EXTRACT(MONTH FROM p_ref_date - INTERVAL '1 month')::int, v_period_start_day);
    END IF;
    v_transaction_end_date := (v_transaction_start_date + INTERVAL '1 month' - INTERVAL '1 day')::date;
    v_budget_month_anchor := date_trunc('month', v_transaction_start_date)::date;

    -- 3. Mengembalikan query
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
        ba.assigned_amount,
        COALESCE(s.total_spent, 0) AS spent_amount,
        (ba.assigned_amount - COALESCE(s.total_spent, 0)) AS remaining_amount,
        CASE WHEN ba.assigned_amount > 0 THEN (COALESCE(s.total_spent, 0) / ba.assigned_amount) * 100 ELSE 0 END AS progress_percentage
    FROM
        public.budget_assignments ba
    JOIN
        public.categories c ON ba.category_id = c.id
    LEFT JOIN
        spent s ON ba.category_id = s.category
    -- <-- PERUBAHAN UTAMA: INNER JOIN HANYA AKAN MENGAMBIL BARIS YANG COCOK
    INNER JOIN
        public.user_budget_priorities ubp ON ba.category_id = ubp.category_id AND ubp.user_id = v_user_id
    WHERE
        ba.household_id = v_household_id
        AND ba.month = v_budget_month_anchor
        AND (c.parent_id IS NOT NULL OR (c.parent_id IS NULL AND ba.is_flex_budget = TRUE))
    ORDER BY
        -- Urutan tidak lagi memerlukan CASE karena semua yang ditampilkan adalah prioritas.
        remaining_amount ASC;
END;
$$;


ALTER FUNCTION "public"."get_quick_budget_overview"("p_ref_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    total_income_all_time numeric;
    total_assigned_all_time numeric;
BEGIN
    -- 1. Hitung total pemasukan (income) sepanjang masa untuk household ini
    SELECT COALESCE(SUM(amount), 0)
    INTO total_income_all_time
    FROM public.transactions
    WHERE household_id = p_household_id
      AND type = 'income';

    -- 2. Hitung total dana yang pernah dialokasikan (assigned) ke budget sepanjang masa
    SELECT COALESCE(SUM(assigned_amount), 0)
    INTO total_assigned_all_time
    FROM public.budget_assignments
    WHERE household_id = p_household_id;

    -- 3. Ready to Assign adalah selisih dari keduanya
    RETURN total_income_all_time - total_assigned_all_time;
END;
$$;


ALTER FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_month" "date") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    total_cash_balance numeric;
    total_budgeted_this_month numeric;
    total_available_last_month numeric;
    last_month_date date;
BEGIN
    -- 1. Hitung total saldo dari semua akun 'generic' (kas & bank)
    SELECT COALESCE(SUM(balance), 0)
    INTO total_cash_balance
    FROM get_accounts_with_balance(auth.uid()) -- Menggunakan fungsi yang sudah ada
    WHERE type = 'generic' AND name <> 'Modal Awal Aset';

    -- 2. Tentukan bulan sebelumnya
    last_month_date := p_month - INTERVAL '1 month';

    -- 3. Hitung total dana 'Available' dari SEMUA kategori di AKHIR bulan LALU
    WITH last_month_summary AS (
        SELECT 
            c.id as category_id,
            COALESCE((SELECT ba.assigned_amount FROM public.budget_assignments ba WHERE ba.category_id = c.id AND ba.household_id = p_household_id AND ba.month = last_month_date), 0)
            - COALESCE((SELECT SUM(t.amount) FROM public.transactions t WHERE t.category = c.id AND t.household_id = p_household_id AND date_trunc('month', t.date) = date_trunc('month', last_month_date) AND t.type = 'expense'), 0)
            as available_last_month
        FROM public.categories c
        WHERE c.household_id = p_household_id and c.type = 'expense'
    )
    SELECT COALESCE(SUM(available_last_month), 0)
    INTO total_available_last_month
    FROM last_month_summary;

    -- 4. Hitung total uang yang sudah dialokasikan ke kategori bulan INI
    SELECT COALESCE(SUM(assigned_amount), 0)
    INTO total_budgeted_this_month
    FROM public.budget_assignments ba
    WHERE ba.household_id = p_household_id
      AND ba.month = p_month;

    -- Ready to Assign = Saldo Kas + Sisa budget bulan lalu - Alokasi budget bulan ini
    RETURN total_cash_balance + total_available_last_month - total_budgeted_this_month;
END;
$$;


ALTER FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_month" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    income_this_period numeric;
    assigned_this_period numeric;
    unassigned_from_last_period numeric;
    
    v_days_in_period integer;
    v_previous_start_date date;
    v_previous_end_date date;
    v_previous_month_identifier date;

BEGIN
    -- 1. Dapatkan total pemasukan untuk periode berjalan saat ini
    SELECT COALESCE(SUM(amount), 0)
    INTO income_this_period
    FROM public.transactions
    WHERE household_id = p_household_id
      AND type = 'income'
      AND date BETWEEN p_current_start_date AND p_current_end_date;

    -- 2. Tentukan tanggal periode sebelumnya
    v_days_in_period := p_current_end_date - p_current_start_date + 1;
    v_previous_start_date := p_current_start_date - v_days_in_period;
    v_previous_end_date := p_current_start_date - interval '1 day';
    v_previous_month_identifier := date_trunc('month', v_previous_start_date);

    -- 3. Hitung dana yang tidak teralokasi dari periode lalu (Income - Budgeted)
    -- Logika ini sekarang benar: selalu hitung sisa pendapatan dari periode lalu.
    -- Gunakan GREATEST(..., 0) untuk memastikan tidak membawa "utang" jika pengeluaran > pendapatan.
    SELECT
        GREATEST(
            (SELECT COALESCE(SUM(amount), 0) 
             FROM public.transactions 
             WHERE household_id = p_household_id 
               AND type = 'income' 
               AND date BETWEEN v_previous_start_date AND v_previous_end_date)
            -
            (SELECT COALESCE(SUM(assigned_amount), 0) 
             FROM public.budget_assignments 
             WHERE household_id = p_household_id 
               AND month = v_previous_month_identifier),
            0
        )
    INTO unassigned_from_last_period;

    -- 4. Dapatkan total dana yang sudah dialokasikan untuk periode INI
    SELECT COALESCE(SUM(assigned_amount), 0)
    INTO assigned_this_period
    FROM public.budget_assignments
    WHERE household_id = p_household_id
      AND month = date_trunc('month', p_current_start_date);

    -- 5. Hitung "Ready to Assign" final
    RETURN income_this_period + unassigned_from_last_period - assigned_this_period;
END;
$$;


ALTER FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recent_transactions"("p_user_id" "uuid", "p_limit" integer) RETURNS TABLE("id" "text", "date" "date", "type" "text", "amount" numeric, "note" "text", "category_name" "text", "account_name" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_household_id UUID;
BEGIN
  -- Dapatkan household_id dari pengguna yang meminta
  SELECT household_id INTO v_household_id
  FROM public.profiles
  WHERE profiles.id = p_user_id;

  -- Kembalikan tabel transaksi terbaru
  RETURN QUERY
  SELECT
    t.id,
    t.date,
    t.type,
    t.amount,
    t.note,
    c.name AS category_name,
    a.name AS account_name
  FROM
    public.transactions t
    LEFT JOIN public.categories c ON t.category = c.id
    LEFT JOIN public.accounts a ON t.account_id = a.id
  WHERE
    t.household_id = v_household_id
  ORDER BY
    t.date DESC, t.id DESC -- Urutkan berdasarkan tanggal terbaru
  LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_recent_transactions"("p_user_id" "uuid", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recurring_instances"("p_start_date" "date" DEFAULT CURRENT_DATE, "p_end_date" "date" DEFAULT (CURRENT_DATE + '30 days'::interval), "p_status" "text" DEFAULT NULL::"text") RETURNS TABLE("instance_id" bigint, "template_id" bigint, "template_name" "text", "due_date" "date", "status" "text", "transaction_type" "public"."transaction_type", "original_amount" numeric, "confirmed_amount" numeric, "original_category_id" bigint, "original_category_name" "text", "confirmed_category_id" bigint, "confirmed_category_name" "text", "original_account_id" "uuid", "original_account_name" "text", "confirmed_account_id" "uuid", "confirmed_account_name" "text", "original_to_account_id" "uuid", "original_to_account_name" "text", "confirmed_to_account_id" "uuid", "confirmed_to_account_name" "text", "original_note" "text", "confirmed_note" "text", "actual_transaction_id" "text", "frequency" "public"."frequency_enum", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_household_id UUID;
BEGIN
  -- Get user's household_id
  SELECT household_id INTO user_household_id 
  FROM profiles WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT 
    ri.id as instance_id,
    rt.id as template_id,
    rt.template_name,
    ri.due_date,
    ri.status,
    rt.type as transaction_type,
    rt.amount as original_amount,
    ri.confirmed_amount,
    rt.category_id as original_category_id,
    oc.name as original_category_name,
    ri.confirmed_category as confirmed_category_id,
    cc.name as confirmed_category_name,
    rt.account_id as original_account_id,
    oa.name as original_account_name,
    ri.confirmed_account_id,
    ca.name as confirmed_account_name,
    rt.to_account_id as original_to_account_id,
    ota.name as original_to_account_name,
    ri.confirmed_to_account_id,
    cta.name as confirmed_to_account_name,
    rt.note as original_note,
    ri.confirmed_note,
    ri.actual_transaction_id,
    rt.frequency,
    ri.created_at
  FROM recurring_instances ri
  JOIN recurring_templates rt ON ri.recurring_template_id = rt.id
  LEFT JOIN categories oc ON rt.category_id = oc.id
  LEFT JOIN categories cc ON ri.confirmed_category = cc.id
  LEFT JOIN accounts oa ON rt.account_id = oa.id
  LEFT JOIN accounts ca ON ri.confirmed_account_id = ca.id
  LEFT JOIN accounts ota ON rt.to_account_id = ota.id
  LEFT JOIN accounts cta ON ri.confirmed_to_account_id = cta.id
  WHERE ri.household_id = user_household_id
  AND ri.due_date BETWEEN p_start_date AND p_end_date
  AND (p_status IS NULL OR ri.status = p_status)
  ORDER BY ri.due_date ASC, ri.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_recurring_instances"("p_start_date" "date", "p_end_date" "date", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_recurring_templates"("p_is_active" boolean DEFAULT NULL::boolean) RETURNS TABLE("template_id" bigint, "template_name" "text", "transaction_type" "public"."transaction_type", "amount" numeric, "category_id" bigint, "category_name" "text", "account_id" "uuid", "account_name" "text", "to_account_id" "uuid", "to_account_name" "text", "note" "text", "frequency" "public"."frequency_enum", "interval_value" smallint, "start_date" "date", "end_date" "date", "next_due_date" "date", "is_active" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_household_id UUID;
BEGIN
    -- Get user's household_id
    SELECT household_id INTO user_household_id 
    FROM profiles WHERE id = auth.uid();
    
    IF user_household_id IS NULL THEN
        RAISE EXCEPTION 'User household not found';
    END IF;
    
    RETURN QUERY
    SELECT 
        rt.id as template_id,
        rt.template_name,
        rt.type as transaction_type,
        rt.amount,
        rt.category_id,
        c.name as category_name,
        rt.account_id,
        a.name as account_name,
        rt.to_account_id,
        ta.name as to_account_name,
        rt.note,
        rt.frequency,
        rt.interval_value,
        rt.start_date,
        rt.end_date,
        rt.next_due_date,
        rt.is_active,
        rt.created_at,
        rt.updated_at
    FROM recurring_templates rt
    LEFT JOIN categories c ON rt.category_id = c.id
    LEFT JOIN accounts a ON rt.account_id = a.id
    LEFT JOIN accounts ta ON rt.to_account_id = ta.id
    WHERE rt.household_id = user_household_id
    AND (p_is_active IS NULL OR rt.is_active = p_is_active)
    ORDER BY rt.template_name;
END;
$$;


ALTER FUNCTION "public"."get_recurring_templates"("p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_report_summary_metrics"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("total_expense" numeric, "total_income" numeric, "top_category" "text", "top_category_amount" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH expenses AS (
        SELECT SUM(t.amount) as total, c.name as category_name
        FROM transactions t
        JOIN categories c ON t.category = c.id
        WHERE t.household_id = p_household_id
          AND t.type = 'expense'
          AND t.date BETWEEN p_start_date AND p_end_date
        GROUP BY c.name
        ORDER BY total DESC
        LIMIT 1
    )
    SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND type = 'expense' AND date BETWEEN p_start_date AND p_end_date),
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE household_id = p_household_id AND type = 'income' AND date BETWEEN p_start_date AND p_end_date),
        (SELECT category_name FROM expenses),
        (SELECT total FROM expenses);
END;
$$;


ALTER FUNCTION "public"."get_report_summary_metrics"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_spending_by_bucket"("p_household_id" "uuid", "p_period_start" "text", "p_period_end" "text") RETURNS SETOF "public"."bucket_spending_summary"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.bucket_id,
    COALESCE(SUM(t.amount), 0) as total_spent
  FROM
    transactions t
  -- Gabungkan transaksi ke kategori, lalu gabungkan kategori ke bucket
  JOIN
    bucket_categories bc ON t.category = bc.category_id
  WHERE
    t.household_id = p_household_id
    AND t.type = 'expense'
    AND t.date >= p_period_start::date
    AND t.date <= p_period_end::date
  GROUP BY
    bc.bucket_id;
END;
$$;


ALTER FUNCTION "public"."get_spending_by_bucket"("p_household_id" "uuid", "p_period_start" "text", "p_period_end" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_spending_by_budget_plan"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("plan_id" bigint, "plan_name" "text", "total_spent" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        bp.id AS plan_id,
        bp.name AS plan_name,
        SUM(t.amount) AS total_spent
    FROM
        transactions t
    JOIN
        categories c ON t.category = c.id
    JOIN
        budget_plan_categories bpc ON c.id = bpc.category_id
    JOIN
        budget_plans bp ON bpc.budget_plan_id = bp.id
    WHERE
        t.household_id = p_household_id
        AND t.type = 'expense'
        AND t.date BETWEEN p_start_date AND p_end_date
        AND bp.household_id = p_household_id -- Pastikan budget plan milik household yang sama
    GROUP BY
        bp.id, bp.name
    ORDER BY
        total_spent DESC;
END;
$$;


ALTER FUNCTION "public"."get_spending_by_budget_plan"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_spending_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("category_id" bigint, "total_spent" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.category as category_id,
        SUM(t.amount) as total_spent
    FROM
        transactions t
    WHERE
        t.household_id = p_household_id
        AND t.type = 'expense'
        AND t.category IS NOT NULL
        AND t.date BETWEEN p_start_date AND p_end_date
    GROUP BY
        t.category
    ORDER BY
        total_spent DESC;
END;
$$;


ALTER FUNCTION "public"."get_spending_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_spending_by_category"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") RETURNS SETOF "public"."category_spending_summary"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_household_id uuid;
BEGIN
  -- Cari household_id dari user_id yang diberikan.
  SELECT household_id INTO v_household_id
  FROM public.profiles
  WHERE id = p_user_id;

  -- Jalankan query utama menggunakan household_id yang sudah ditemukan.
  IF v_household_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      t.category as category_id,
      COALESCE(SUM(t.amount), 0) as total_spent
    FROM
      public.transactions t
    WHERE
      t.household_id = v_household_id
      AND t.type = 'expense'
      AND t.date >= p_start_date::date
      AND t.date <= p_end_date::date
      AND t.category IS NOT NULL
    GROUP BY
      t.category;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_spending_by_category"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_spending_by_parent_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("category_id" integer, "category_name" "text", "total_spent" numeric)
    LANGUAGE "sql"
    AS $$
WITH transactions_with_parents AS (
  SELECT
    t.amount,
    -- Menggunakan fungsi helper yang baru kita buat
    get_top_level_parent(t.category) as parent_category_id
  FROM transactions t
  WHERE t.household_id = p_household_id
    AND t.type = 'expense'
    AND t.date BETWEEN p_start_date AND p_end_date
    AND t.category IS NOT NULL
)
SELECT
  p.parent_category_id::INT AS category_id,
  c.name AS category_name,
  SUM(p.amount) AS total_spent
FROM transactions_with_parents p
JOIN categories c ON p.parent_category_id = c.id
GROUP BY
  p.parent_category_id, c.name
ORDER BY
  total_spent DESC;
$$;


ALTER FUNCTION "public"."get_spending_by_parent_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_spending_over_time_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("period" "text", "spending_details" "jsonb")
    LANGUAGE "sql"
    AS $$
WITH monthly_spending AS (
    SELECT
        -- Mengambil awal bulan sebagai 'kunci' periode
        date_trunc('month', t.date)::date AS month_start,
        c.name AS category_name,
        SUM(t.amount) AS total
    FROM transactions t
    JOIN categories c ON t.category = c.id
    WHERE
        t.household_id = p_household_id
        AND t.type = 'expense'
        AND t.date BETWEEN p_start_date AND p_end_date
    GROUP BY
        month_start, c.name
)
SELECT
    -- Format periode menjadi 'YYYY-MM' untuk kemudahan pengurutan
    to_char(ms.month_start, 'YYYY-MM') AS period,
    -- Mengagregasi semua data pengeluaran di bulan tersebut menjadi satu objek JSON
    jsonb_agg(
        jsonb_build_object(
            'category', ms.category_name,
            'value', ms.total
        )
    ) AS spending_details
FROM monthly_spending ms
GROUP BY
    ms.month_start
ORDER BY
    ms.month_start;
$$;


ALTER FUNCTION "public"."get_spending_over_time_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_level_parent"("p_category_id" bigint) RETURNS bigint
    LANGUAGE "sql"
    AS $$
  WITH RECURSIVE category_path AS (
    -- Bagian non-rekursif: mulai dari kategori yang diberikan
    SELECT id, parent_id
    FROM categories
    WHERE id = p_category_id

    UNION ALL

    -- Bagian rekursif: gabungkan dengan parent-nya
    SELECT c.id, c.parent_id
    FROM categories c
    JOIN category_path cp ON c.id = cp.parent_id
  )
  -- Pilih ID dari jalur di mana parent_id adalah NULL (paling atas)
  SELECT id
  FROM category_path
  WHERE parent_id IS NULL;
$$;


ALTER FUNCTION "public"."get_top_level_parent"("p_category_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_transactions_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("id" "text", "date" "date", "note" "text", "amount" numeric, "category_name" "text", "account_name" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id::text, -- Mengubah tipe id dari uuid ke text
        t.date,
        t.note,
        t.amount,
        c.name as category_name,
        a.name as account_name
    FROM transactions t
    LEFT JOIN categories c ON t.category = c.id
    LEFT JOIN accounts a ON t.account_id = a.id
    WHERE t.household_id = p_household_id
      AND t.type = 'expense'
      AND t.date BETWEEN p_start_date AND p_end_date
    ORDER BY t.amount DESC
    LIMIT 5;
END;
$$;


ALTER FUNCTION "public"."get_top_transactions_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_total_income_by_period"("p_household_id" "uuid", "p_start_date" "text", "p_end_date" "text") RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT
    COALESCE(SUM(amount), 0)
  FROM
    public.transactions
  WHERE
    household_id = p_household_id
    AND type = 'income'
    AND date >= p_start_date::date
    AND date <= p_end_date::date;
$$;


ALTER FUNCTION "public"."get_total_income_by_period"("p_household_id" "uuid", "p_start_date" "text", "p_end_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_summary"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("total_transactions" bigint, "largest_transaction" numeric, "largest_expense" numeric, "average_transaction" numeric, "total_income" numeric, "total_spending" numeric, "first_transaction_date" "date", "last_transaction_date" "date")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(t.id),
        MAX(t.amount),
        MAX(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END),
        AVG(t.amount),
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END),
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END),
        MIN(t.date),
        MAX(t.date)
    FROM
        transactions t
    WHERE
        t.household_id = p_household_id AND
        t.date >= p_start_date AND
        t.date <= p_end_date;
END;
$$;


ALTER FUNCTION "public"."get_transaction_summary"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_summary"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") RETURNS TABLE("total_transactions" bigint, "total_income" numeric, "total_spending" numeric, "largest_transaction" numeric, "largest_expense" numeric, "average_transaction" numeric, "first_transaction_date" "text", "last_transaction_date" "text")
    LANGUAGE "plpgsql"
    AS $$ BEGIN RETURN QUERY SELECT COUNT(t.id), COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0), COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0), COALESCE(MAX(CASE WHEN t.type = 'income' THEN t.amount ELSE NULL END), 0), COALESCE(MAX(CASE WHEN t.type = 'expense' THEN t.amount ELSE NULL END), 0), COALESCE(AVG(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0), TO_CHAR(MIN(t.date), 'YYYY-MM-DD'), TO_CHAR(MAX(t.date), 'YYYY-MM-DD') FROM transactions t JOIN profiles p ON t.household_id = p.household_id WHERE p.id = p_user_id AND t.date >= p_start_date::date AND t.date <= p_end_date::date; END; $$;


ALTER FUNCTION "public"."get_transaction_summary"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transactions_for_export"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS TABLE("tanggal" "date", "jenis" "text", "jumlah" numeric, "kategori" "text", "akun_sumber" "text", "akun_tujuan" "text", "catatan" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.date::date AS tanggal,
        t.type::text AS jenis,
        t.amount::numeric AS jumlah,
        c.name::text AS kategori,
        acc_from.name::text AS akun_sumber,
        acc_to.name::text AS akun_tujuan,
        t.note::text AS catatan
    FROM
        transactions t
    LEFT JOIN
        categories c ON t.category = c.id
    LEFT JOIN
        accounts acc_from ON t.account_id = acc_from.id
    LEFT JOIN
        accounts acc_to ON t.to_account_id = acc_to.id
    WHERE
        t.household_id = p_household_id AND
        t.date >= p_start_date AND
        t.date <= p_end_date
    ORDER BY
        t.date ASC;
END;
$$;


ALTER FUNCTION "public"."get_transactions_for_export"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transactions_grouped"("user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
begin
  return (
    select json_agg(
      json_build_object(
        'date', date,
        'subtotal', sum(amount),
        'transactions', json_agg(
          json_build_object(
            'id', id,
            'amount', amount,
            'category', category,
            'type', type,
            'note', note,
            'account_id', account_id
          ) order by date desc
        )
      )
    )
    from transactions
    where transactions.user_id = get_transactions_grouped.user_id
    group by date
    order by date desc
  );
end;
$$;


ALTER FUNCTION "public"."get_transactions_grouped"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transactions_grouped"("user_id" "uuid", "filter_type" "text" DEFAULT NULL::"text", "filter_category" "text" DEFAULT NULL::"text", "filter_account" "uuid" DEFAULT NULL::"uuid", "filter_start_date" "date" DEFAULT NULL::"date", "filter_end_date" "date" DEFAULT NULL::"date") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
begin
  return (
    select json_agg(
      json_build_object(
        'date', t.date,
        'subtotal', sum(t.amount),
        'transactions', json_agg(
          json_build_object(
            'id', t.id,
            'amount', t.amount,
            'category', t.category,
            'type', t.type,
            'note', t.note,
            'account_id', t.account_id
          ) order by t.date desc
        )
      )
      order by t.date desc
    )
    from transactions t
    where t.user_id = get_transactions_grouped.user_id
      and (filter_type is null or t.type = filter_type)
      and (filter_category is null or t.category = filter_category)
      and (filter_account is null or t.account_id = filter_account)
      and (filter_start_date is null or t.date >= filter_start_date)
      and (filter_end_date is null or t.date <= filter_end_date)
    group by t.date
  );
end;
$$;


ALTER FUNCTION "public"."get_transactions_grouped"("user_id" "uuid", "filter_type" "text", "filter_category" "text", "filter_account" "uuid", "filter_start_date" "date", "filter_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transactions_summary"("user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
begin
  return (
    select json_build_object(
      'total_transactions', count(*),
      'largest_transaction', max(amount),
      'largest_expense', min(case when amount < 0 then amount end),
      'average_transaction', round(avg(amount),2),
      'total_income', sum(case when amount > 0 then amount else 0 end),
      'total_spending', sum(case when amount < 0 then amount else 0 end),
      'first_transaction', min(date),
      'last_transaction', max(date)
    )
    from transactions
    where transactions.user_id = get_transactions_summary.user_id
  );
end;
$$;


ALTER FUNCTION "public"."get_transactions_summary"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Logika sederhana: hanya membuat profil untuk pengguna baru.
  -- Ini mengasumsikan household_id akan diisi oleh proses lain atau tidak wajib.
  -- Untuk keamanan, kita akan set household_id sama dengan user_id, tapi tanpa membuat record di tabel households.
  INSERT INTO public.profiles (id, full_name, household_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.id);
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_transaction_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if deleted transaction was from recurring instance
  IF OLD.note IS NOT NULL AND OLD.note LIKE '%(from:%' THEN
    -- Find the recurring instance that created this transaction
    UPDATE recurring_instances 
    SET 
      status = CASE 
        WHEN due_date < CURRENT_DATE THEN 'overdue'
        ELSE 'upcoming'
      END,
      actual_transaction_id = NULL,
      confirmed_amount = NULL,
      confirmed_category = NULL,
      confirmed_account_id = NULL,
      confirmed_to_account_id = NULL,
      confirmed_note = NULL,
      updated_at = NOW()
    WHERE actual_transaction_id = OLD.id;
  END IF;
  
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."handle_transaction_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_transactions_batch"("p_transactions" "jsonb", "p_household_id" "uuid") RETURNS TABLE("imported_count" integer, "error_message" "text")
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    tx jsonb;
    v_imported_count integer := 0;
BEGIN
    FOR tx IN SELECT * FROM jsonb_array_elements(p_transactions)
    LOOP
        INSERT INTO transactions (
            household_id,
            user_id,
            date,
            type,
            amount,
            note,
            category,
            account_id,
            to_account_id
        )
        VALUES (
            p_household_id,
            auth.uid(),
            (tx ->> 'tanggal')::date,
            (tx ->> 'jenis')::transaction_type,
            (tx ->> 'jumlah')::numeric,
            tx ->> 'catatan',
            (tx ->> 'kategori_id')::bigint,
            (tx ->> 'akun_sumber_id')::uuid,
            (tx ->> 'akun_tujuan_id')::uuid
        );
        v_imported_count := v_imported_count + 1;
    END LOOP;

    RETURN QUERY SELECT v_imported_count, NULL::text;
EXCEPTION
    WHEN others THEN
        RETURN QUERY SELECT 0, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."import_transactions_batch"("p_transactions" "jsonb", "p_household_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_transaction_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF new.id IS NULL THEN
    -- Logika ini sekarang akan berjalan sebagai admin, melewati RLS pengguna
    new.sequence_number := (
      SELECT COALESCE(MAX(sequence_number), 0) + 1
      FROM public.transactions -- Menggunakan public.transactions untuk kejelasan
      WHERE 
        type = new.type AND
        to_char(date, 'YYYYMM') = to_char(new.date, 'YYYYMM')
    );
    
    new.id := 
      CASE new.type
        WHEN 'expense' THEN 'EXP'
        WHEN 'income' THEN 'INC'
        WHEN 'transfer' THEN 'TRF'
      END
      || to_char(new.date, 'YYYYMM')
      || lpad(new.sequence_number::text, 4, '0');
  END IF;
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."set_transaction_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_flex_budget_status"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_is_flex" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Menggunakan UPSERT: Jika baris sudah ada, update. Jika belum, buat baru.
    INSERT INTO public.budget_assignments (household_id, category_id, month, is_flex_budget, assigned_amount)
    VALUES (p_household_id, p_category_id, p_month, p_is_flex, 0)
    ON CONFLICT (household_id, category_id, month)
    DO UPDATE SET is_flex_budget = EXCLUDED.is_flex_budget;
END;
$$;


ALTER FUNCTION "public"."toggle_flex_budget_status"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_is_flex" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_category_budget_types"("updates" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE public.categories
    SET budget_type = (item->>'budget_type')::budget_type_enum
    WHERE id = (item->>'id')::int;
  END LOOP;
END;$$;


ALTER FUNCTION "public"."update_category_budget_types"("updates" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_category_flex_status"("p_category_id" integer, "p_month" "date", "p_is_flex" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    INSERT INTO public.budget_category_monthly_settings (household_id, category_id, month, is_flex_budget)
    VALUES ((SELECT household_id FROM public.profiles WHERE id = auth.uid()), p_category_id, p_month, p_is_flex)
    ON CONFLICT (household_id, category_id, month)
    DO UPDATE SET is_flex_budget = p_is_flex;
END;
$$;


ALTER FUNCTION "public"."update_category_flex_status"("p_category_id" integer, "p_month" "date", "p_is_flex" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_category_rollover_status"("p_category_id" integer, "p_is_rollover" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.categories
  SET is_rollover = p_is_rollover
  WHERE id = p_category_id
    -- Keamanan: Pastikan user hanya bisa mengubah kategori milik household-nya
    AND household_id = (SELECT household_id FROM public.profiles WHERE id = auth.uid());
END;
$$;


ALTER FUNCTION "public"."update_category_rollover_status"("p_category_id" integer, "p_is_rollover" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_household_period_start_day"("new_day" smallint) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Pastikan new_day valid
  IF new_day < 1 OR new_day > 31 THEN
    RAISE EXCEPTION 'Invalid day provided. Must be between 1 and 31.';
  END IF;

  -- Update semua profil yang memiliki household_id yang sama dengan user yang sedang login
  UPDATE public.profiles
  SET period_start_day = new_day
  WHERE household_id = (
    SELECT household_id
    FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$;


ALTER FUNCTION "public"."update_household_period_start_day"("new_day" smallint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_rollover_status"("p_budget_id" bigint, "p_category_id" bigint, "p_is_rollover" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE budget_categories
  SET is_rollover = p_is_rollover
  WHERE budget_id = p_budget_id AND category_id = p_category_id;
END;
$$;


ALTER FUNCTION "public"."update_rollover_status"("p_budget_id" bigint, "p_category_id" bigint, "p_is_rollover" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_budget_allocation"("p_household_id" "uuid", "p_period" "date", "p_budget_id" bigint, "p_category_id" bigint, "p_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    LOOP
        -- Coba UPDATE baris yang ada terlebih dahulu
        IF p_category_id IS NOT NULL THEN
            -- Kasus untuk alokasi per kategori
            UPDATE budget_allocations
            SET amount = p_amount
            WHERE household_id = p_household_id
              AND period = p_period
              AND budget_id = p_budget_id
              AND category_id = p_category_id;
        ELSE
            -- Kasus untuk alokasi total (category_id IS NULL)
            UPDATE budget_allocations
            SET amount = p_amount
            WHERE household_id = p_household_id
              AND period = p_period
              AND budget_id = p_budget_id
              AND category_id IS NULL;
        END IF;

        -- Jika UPDATE berhasil (menemukan baris), keluar dari loop
        IF FOUND THEN
            RETURN;
        END IF;

        -- Jika UPDATE tidak menemukan baris, coba INSERT
        BEGIN
            INSERT INTO budget_allocations(household_id, period, budget_id, category_id, amount)
            VALUES (p_household_id, p_period, p_budget_id, p_category_id, p_amount);
            -- Jika INSERT berhasil, keluar dari loop
            RETURN;
        EXCEPTION WHEN UNIQUE_VIOLATION THEN
            -- Jika ada 'race condition' (baris lain dimasukkan setelah UPDATE gagal
            -- tapi sebelum INSERT ini berjalan), abaikan error dan biarkan loop
            -- mencoba UPDATE lagi di iterasi berikutnya.
        END;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."upsert_budget_allocation"("p_household_id" "uuid", "p_period" "date", "p_budget_id" bigint, "p_category_id" bigint, "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_budget_assignment"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_amount" numeric) RETURNS "void"
    LANGUAGE "sql"
    AS $$
    INSERT INTO public.budget_assignments (household_id, category_id, month, assigned_amount)
    VALUES (p_household_id, p_category_id, p_month, p_amount)
    ON CONFLICT (household_id, category_id, month)
    DO UPDATE SET assigned_amount = EXCLUDED.assigned_amount;
$$;


ALTER FUNCTION "public"."upsert_budget_assignment"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_budget_plan_with_categories_v2"("p_plan_id" bigint, "p_plan_name" "text", "p_household_id" "uuid", "p_category_settings" "jsonb") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_plan_id BIGINT;
    setting JSONB;
    v_category_id INT;
    v_is_rollover BOOLEAN;
BEGIN
    -- Langkah 1: Upsert Budget Plan
    IF p_plan_id IS NULL THEN
        INSERT INTO budgets (name, household_id)
        VALUES (p_plan_name, p_household_id)
        RETURNING id INTO v_plan_id;
    ELSE
        UPDATE budgets SET name = p_plan_name WHERE id = p_plan_id;
        v_plan_id := p_plan_id;
    END IF;

    -- Langkah 2: Hapus relasi lama yang tidak ada di daftar baru
    DELETE FROM budget_categories
    WHERE budget_id = v_plan_id
      AND category_id NOT IN (
          SELECT (elem->>'category_id')::INT FROM jsonb_array_elements(p_category_settings) elem
      );

    -- Langkah 3: Loop melalui setting baru dan UPSERT
    FOR setting IN SELECT * FROM jsonb_array_elements(p_category_settings)
    LOOP
        v_category_id := (setting->>'category_id')::INT;
        v_is_rollover := (setting->>'is_rollover')::BOOLEAN;

        INSERT INTO budget_categories (budget_id, category_id, is_rollover)
        VALUES (v_plan_id, v_category_id, v_is_rollover)
        ON CONFLICT (budget_id, category_id)
        DO UPDATE SET is_rollover = v_is_rollover;
    END LOOP;

    RETURN v_plan_id;
END;
$$;


ALTER FUNCTION "public"."upsert_budget_plan_with_categories_v2"("p_plan_id" bigint, "p_plan_name" "text", "p_household_id" "uuid", "p_category_settings" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_recurring_template"("p_template_data" "jsonb", "p_template_id" bigint DEFAULT NULL::bigint) RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_template_id BIGINT;
    user_household_id UUID;
    v_start_date DATE;
BEGIN
    -- Dapatkan household_id dari user yang sedang login
    SELECT household_id INTO user_household_id FROM public.profiles WHERE id = auth.uid();
    
    -- Ekstrak start_date untuk perhitungan next_due_date
    v_start_date := (p_template_data->>'start_date')::DATE;

    IF p_template_id IS NULL THEN
        -- MODE CREATE: Buat template baru
        INSERT INTO public.recurring_templates (
            household_id, user_id, amount, type, note, category_id, account_id, to_account_id,
            frequency, "interval", start_date, end_date, next_due_date
        )
        VALUES (
            user_household_id,
            auth.uid(),
            (p_template_data->>'amount')::NUMERIC,
            (p_template_data->>'type')::public.transaction_type,
            p_template_data->>'note',
            (p_template_data->>'category_id')::BIGINT,
            (p_template_data->>'account_id')::UUID,
            (p_template_data->>'to_account_id')::UUID,
            (p_template_data->>'frequency')::public.frequency_enum,
            (p_template_data->>'interval')::SMALLINT,
            v_start_date,
            (p_template_data->>'end_date')::DATE,
            -- Saat membuat, next_due_date adalah start_date itu sendiri
            v_start_date
        ) RETURNING id INTO new_template_id;
    ELSE
        -- MODE UPDATE: Perbarui template yang ada
        UPDATE public.recurring_templates
        SET
            amount = (p_template_data->>'amount')::NUMERIC,
            type = (p_template_data->>'type')::public.transaction_type,
            note = p_template_data->>'note',
            category_id = (p_template_data->>'category_id')::BIGINT,
            account_id = (p_template_data->>'account_id')::UUID,
            to_account_id = (p_template_data->>'to_account_id')::UUID,
            frequency = (p_template_data->>'frequency')::public.frequency_enum,
            "interval" = (p_template_data->>'interval')::SMALLINT,
            start_date = v_start_date,
            end_date = (p_template_data->>'end_date')::DATE,
            -- Saat update, set next_due_date kembali ke start_date jika sudah terlewat
            -- Logika yang lebih kompleks bisa ditambahkan di sini jika perlu
            next_due_date = v_start_date
        WHERE id = p_template_id AND household_id = user_household_id;
        
        new_template_id := p_template_id;
    END IF;

    RETURN new_template_id;
END;
$$;


ALTER FUNCTION "public"."upsert_recurring_template"("p_template_data" "jsonb", "p_template_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."upsert_recurring_template"("p_template_id" bigint, "p_template_name" "text", "p_type" "public"."transaction_type", "p_amount" numeric, "p_category_id" bigint, "p_account_id" "uuid", "p_to_account_id" "uuid", "p_note" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_household_id UUID;
  new_template_id BIGINT;
  calculated_next_due_date DATE;
BEGIN
  -- Get user's household_id
  SELECT household_id INTO user_household_id 
  FROM profiles WHERE id = auth.uid();
  
  IF user_household_id IS NULL THEN
    RAISE EXCEPTION 'User household not found';
  END IF;
  
  -- Validate required fields based on transaction type
  IF p_type = 'transfer' THEN
    IF p_account_id IS NULL OR p_to_account_id IS NULL THEN
      RAISE EXCEPTION 'Transfer requires both account_id and to_account_id';
    END IF;
    IF p_account_id = p_to_account_id THEN
      RAISE EXCEPTION 'Source and destination accounts cannot be the same';
    END IF;
  ELSE
    IF p_category_id IS NULL THEN
      RAISE EXCEPTION 'Category is required for income and expense transactions';
    END IF;
  END IF;
  
  -- Calculate next due date based on start date and current date
  IF p_start_date <= CURRENT_DATE THEN
    -- If start date is today or in the past, calculate next occurrence
    CASE p_frequency
      WHEN 'daily' THEN 
        calculated_next_due_date := CURRENT_DATE + (p_interval_value || ' days')::INTERVAL;
      WHEN 'weekly' THEN 
        calculated_next_due_date := CURRENT_DATE + (p_interval_value || ' weeks')::INTERVAL;
      WHEN 'monthly' THEN 
        calculated_next_due_date := CURRENT_DATE + (p_interval_value || ' months')::INTERVAL;
      WHEN 'yearly' THEN 
        calculated_next_due_date := CURRENT_DATE + (p_interval_value || ' years')::INTERVAL;
    END CASE;
  ELSE
    -- If start date is in the future, use start date as next due date
    calculated_next_due_date := p_start_date;
  END IF;
  
  IF p_template_id IS NULL THEN
    -- Create new template
    INSERT INTO recurring_templates (
      household_id,
      user_id,
      template_name,
      type,
      amount,
      category_id,
      account_id,
      to_account_id,
      note,
      frequency,
      interval_value,
      start_date,
      end_date,
      next_due_date,
      is_active
    ) VALUES (
      user_household_id,
      auth.uid(),
      p_template_name,
      p_type,
      p_amount,
      p_category_id,
      p_account_id,
      p_to_account_id,
      p_note,
      p_frequency,
      COALESCE(p_interval_value, 1),
      p_start_date,
      p_end_date,
      calculated_next_due_date,
      true
    ) RETURNING id INTO new_template_id;
  ELSE
    -- Update existing template
    UPDATE recurring_templates 
    SET 
      template_name = p_template_name,
      type = p_type,
      amount = p_amount,
      category_id = p_category_id,
      account_id = p_account_id,
      to_account_id = p_to_account_id,
      note = p_note,
      frequency = p_frequency,
      interval_value = COALESCE(p_interval_value, 1),
      start_date = p_start_date,
      end_date = p_end_date,
      next_due_date = calculated_next_due_date,
      updated_at = NOW()
    WHERE id = p_template_id 
    AND household_id = user_household_id
    AND user_id = auth.uid();
    
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Template not found or access denied';
    END IF;
    
    new_template_id := p_template_id;
  END IF;
  
  RETURN new_template_id;
END;
$$;


ALTER FUNCTION "public"."upsert_recurring_template"("p_template_id" bigint, "p_template_name" "text", "p_type" "public"."transaction_type", "p_amount" numeric, "p_category_id" bigint, "p_account_id" "uuid", "p_to_account_id" "uuid", "p_note" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "user_id" "uuid",
    "initial_balance" numeric DEFAULT 0 NOT NULL,
    "household_id" "uuid",
    "type" "text" DEFAULT 'generic'::"text" NOT NULL,
    "target_amount" numeric,
    "goal_reason" "text",
    "achieved_at" timestamp with time zone,
    "asset_class" "text",
    "unit" "text"
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


COMMENT ON COLUMN "public"."accounts"."type" IS 'Tipe akun: generic (rekening biasa), goal (tujuan/amplop), asset (investasi/aset fisik)';



COMMENT ON COLUMN "public"."accounts"."asset_class" IS 'Klasifikasi aset untuk integrasi harga (misal: "gold", "stock_GOOGL", "crypto_BTC"). Bisa null untuk aset non-pasar.';



COMMENT ON COLUMN "public"."accounts"."unit" IS 'Satuan dari aset (misal: "gram", "shares", "BTC").';



CREATE TABLE IF NOT EXISTS "public"."asset_transactions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "asset_account_id" "uuid" NOT NULL,
    "transaction_type" "text" NOT NULL,
    "quantity" numeric NOT NULL,
    "price_per_unit" numeric NOT NULL,
    "transaction_date" "date" NOT NULL,
    "household_id" "uuid" NOT NULL,
    "related_transaction_id" "text",
    CONSTRAINT "asset_transactions_price_per_unit_check" CHECK (("price_per_unit" >= (0)::numeric)),
    CONSTRAINT "asset_transactions_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "asset_transactions_transaction_type_check" CHECK (("transaction_type" = ANY (ARRAY['buy'::"text", 'sell'::"text"])))
);


ALTER TABLE "public"."asset_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."asset_transactions" IS 'Mencatat pembelian dan penjualan unit/kuantitas aset.';



COMMENT ON COLUMN "public"."asset_transactions"."asset_account_id" IS 'Referensi ke akun tipe Aset di tabel accounts.';



COMMENT ON COLUMN "public"."asset_transactions"."related_transaction_id" IS 'ID transaksi transfer terkait di tabel transactions.';



ALTER TABLE "public"."asset_transactions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."asset_transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."budget_assignments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "category_id" integer NOT NULL,
    "month" "date" NOT NULL,
    "assigned_amount" numeric(15,2) DEFAULT 0 NOT NULL,
    "is_flex_budget" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."budget_assignments" OWNER TO "postgres";


ALTER TABLE "public"."budget_assignments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."budget_assignments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."budget_category_monthly_settings" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "category_id" integer NOT NULL,
    "month" "date" NOT NULL,
    "is_flex_budget" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."budget_category_monthly_settings" OWNER TO "postgres";


ALTER TABLE "public"."budget_category_monthly_settings" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."budget_category_monthly_settings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "type" "text",
    "user_id" "uuid",
    "parent_id" bigint,
    "household_id" "uuid",
    "is_archived" boolean DEFAULT false NOT NULL,
    "is_rollover" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


ALTER TABLE "public"."categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."current_prices" (
    "asset_key" "text" NOT NULL,
    "price" numeric NOT NULL,
    "last_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."current_prices" OWNER TO "postgres";


COMMENT ON TABLE "public"."current_prices" IS 'Menyimpan harga pasar terkini untuk berbagai aset.';



COMMENT ON COLUMN "public"."current_prices"."asset_key" IS 'Kunci unik untuk aset, contoh: GOLD_IDR, STOCK_BBCA.';



CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "household_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_email" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "household_id" "uuid" NOT NULL,
    "period_start_day" smallint DEFAULT 1 NOT NULL,
    CONSTRAINT "profiles_period_start_day_check" CHECK ((("period_start_day" >= 1) AND ("period_start_day" <= 31)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."period_start_day" IS 'The day of the month the user''s financial period starts.';



CREATE TABLE IF NOT EXISTS "public"."recurring_instances" (
    "id" bigint NOT NULL,
    "recurring_template_id" bigint NOT NULL,
    "household_id" "uuid" NOT NULL,
    "due_date" "date" NOT NULL,
    "status" "text" DEFAULT 'upcoming'::"text",
    "confirmed_amount" numeric(15,2),
    "confirmed_category" bigint,
    "confirmed_account_id" "uuid",
    "confirmed_to_account_id" "uuid",
    "confirmed_note" "text",
    "actual_transaction_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recurring_instances_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'confirmed'::"text", 'done'::"text", 'done_with_difference'::"text", 'overdue'::"text"])))
);


ALTER TABLE "public"."recurring_instances" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."recurring_instances_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."recurring_instances_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."recurring_instances_id_seq" OWNED BY "public"."recurring_instances"."id";



CREATE TABLE IF NOT EXISTS "public"."recurring_templates" (
    "id" bigint NOT NULL,
    "household_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "template_name" "text" NOT NULL,
    "type" "public"."transaction_type" NOT NULL,
    "amount" numeric(15,2) NOT NULL,
    "category_id" bigint,
    "account_id" "uuid" NOT NULL,
    "to_account_id" "uuid",
    "note" "text",
    "frequency" "public"."frequency_enum" NOT NULL,
    "interval_value" smallint DEFAULT 1,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "next_due_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recurring_templates" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."recurring_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."recurring_templates_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."recurring_templates_id_seq" OWNED BY "public"."recurring_templates"."id";



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "user_id" "uuid",
    "type" "public"."transaction_type",
    "amount" numeric,
    "category" bigint,
    "note" "text",
    "date" "date",
    "sequence_number" integer,
    "id" "text" NOT NULL,
    "account_id" "uuid",
    "to_account_id" "uuid",
    "household_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_budget_priorities" (
    "user_id" "uuid" NOT NULL,
    "category_id" bigint NOT NULL,
    "household_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_budget_priorities" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_budget_priorities" IS 'Stores which budget categories a user wants to prioritize on their dashboard.';



COMMENT ON COLUMN "public"."user_budget_priorities"."user_id" IS 'The user who set the priority.';



COMMENT ON COLUMN "public"."user_budget_priorities"."category_id" IS 'The category being prioritized.';



COMMENT ON COLUMN "public"."user_budget_priorities"."household_id" IS 'The household this priority belongs to, for RLS.';



ALTER TABLE ONLY "public"."recurring_instances" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."recurring_instances_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."recurring_templates" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."recurring_templates_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_transactions"
    ADD CONSTRAINT "asset_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_household_id_category_id_month_key" UNIQUE ("household_id", "category_id", "month");



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."budget_category_monthly_settings"
    ADD CONSTRAINT "budget_category_monthly_setti_household_id_category_id_mont_key" UNIQUE ("household_id", "category_id", "month");



ALTER TABLE ONLY "public"."budget_category_monthly_settings"
    ADD CONSTRAINT "budget_category_monthly_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."current_prices"
    ADD CONSTRAINT "current_prices_pkey" PRIMARY KEY ("asset_key");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_household_id_invitee_email_key" UNIQUE ("household_id", "invitee_email");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_instances"
    ADD CONSTRAINT "recurring_instances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recurring_templates"
    ADD CONSTRAINT "recurring_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_budget_priorities"
    ADD CONSTRAINT "user_budget_priorities_pkey" PRIMARY KEY ("user_id", "category_id");



CREATE INDEX "idx_accounts_type" ON "public"."accounts" USING "btree" ("type");



CREATE INDEX "idx_asset_transactions_asset_account_id" ON "public"."asset_transactions" USING "btree" ("asset_account_id");



CREATE INDEX "idx_asset_transactions_household_id" ON "public"."asset_transactions" USING "btree" ("household_id");



CREATE INDEX "idx_categories_is_archived" ON "public"."categories" USING "btree" ("household_id", "is_archived");



CREATE INDEX "idx_categories_parent_id" ON "public"."categories" USING "btree" ("parent_id");



CREATE INDEX "idx_recurring_instances_due_date" ON "public"."recurring_instances" USING "btree" ("due_date");



CREATE INDEX "idx_recurring_instances_household" ON "public"."recurring_instances" USING "btree" ("household_id");



CREATE INDEX "idx_recurring_instances_status" ON "public"."recurring_instances" USING "btree" ("status");



CREATE INDEX "idx_recurring_instances_template" ON "public"."recurring_instances" USING "btree" ("recurring_template_id");



CREATE INDEX "idx_recurring_instances_transaction" ON "public"."recurring_instances" USING "btree" ("actual_transaction_id");



CREATE INDEX "idx_recurring_templates_active" ON "public"."recurring_templates" USING "btree" ("is_active");



CREATE INDEX "idx_recurring_templates_household" ON "public"."recurring_templates" USING "btree" ("household_id");



CREATE INDEX "idx_recurring_templates_next_due" ON "public"."recurring_templates" USING "btree" ("next_due_date");



CREATE INDEX "idx_recurring_templates_user" ON "public"."recurring_templates" USING "btree" ("user_id");



CREATE INDEX "idx_transactions_to_account_id" ON "public"."transactions" USING "btree" ("to_account_id");



CREATE INDEX "transactions_account_id_idx" ON "public"."transactions" USING "btree" ("account_id");



CREATE OR REPLACE TRIGGER "transaction_delete_trigger" BEFORE DELETE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_transaction_delete"();



CREATE OR REPLACE TRIGGER "transactions_generate_id" BEFORE INSERT ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."set_transaction_id"();



ALTER TABLE ONLY "public"."asset_transactions"
    ADD CONSTRAINT "asset_transactions_asset_account_id_fkey" FOREIGN KEY ("asset_account_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_transactions"
    ADD CONSTRAINT "asset_transactions_related_transaction_id_fkey" FOREIGN KEY ("related_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."budget_assignments"
    ADD CONSTRAINT "budget_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."budget_category_monthly_settings"
    ADD CONSTRAINT "budget_category_monthly_settings_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recurring_instances"
    ADD CONSTRAINT "fk_recurring_instances_account" FOREIGN KEY ("confirmed_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."recurring_instances"
    ADD CONSTRAINT "fk_recurring_instances_category" FOREIGN KEY ("confirmed_category") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."recurring_instances"
    ADD CONSTRAINT "fk_recurring_instances_template" FOREIGN KEY ("recurring_template_id") REFERENCES "public"."recurring_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recurring_instances"
    ADD CONSTRAINT "fk_recurring_instances_to_account" FOREIGN KEY ("confirmed_to_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."recurring_instances"
    ADD CONSTRAINT "fk_recurring_instances_transaction" FOREIGN KEY ("actual_transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."recurring_templates"
    ADD CONSTRAINT "fk_recurring_templates_account" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."recurring_templates"
    ADD CONSTRAINT "fk_recurring_templates_category" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."recurring_templates"
    ADD CONSTRAINT "fk_recurring_templates_to_account" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id");



ALTER TABLE ONLY "public"."recurring_templates"
    ADD CONSTRAINT "fk_recurring_templates_user" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "public"."accounts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_budget_priorities"
    ADD CONSTRAINT "user_budget_priorities_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_budget_priorities"
    ADD CONSTRAINT "user_budget_priorities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "All for user V2" ON "public"."accounts" TO "authenticated" USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "All for user v2" ON "public"."categories" TO "authenticated" USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "All for user v2" ON "public"."transactions" TO "authenticated" USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Allow service_role to update prices" ON "public"."current_prices" USING (("auth"."role"() = 'service_role'::"text")) WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Enable all access for users based on household_id" ON "public"."asset_transactions" USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Enable read access for all authenticated users" ON "public"."current_prices" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Pengguna bisa mengelola profilnya sendiri" ON "public"."profiles" TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete recurring instances in their household" ON "public"."recurring_instances" FOR DELETE USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can delete their own recurring templates" ON "public"."recurring_templates" FOR DELETE USING ((("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can insert recurring instances in their household" ON "public"."recurring_instances" FOR INSERT WITH CHECK (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can insert recurring templates in their household" ON "public"."recurring_templates" FOR INSERT WITH CHECK ((("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can manage invites for their own household" ON "public"."invitations" TO "authenticated" USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))) WITH CHECK (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can manage their own budget priorities" ON "public"."user_budget_priorities" USING ((("auth"."uid"() = "user_id") AND ("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own household's budget assignments" ON "public"."budget_assignments" USING ((( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = "household_id")) WITH CHECK ((( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = "household_id"));



CREATE POLICY "Users can manage their own household's budget settings" ON "public"."budget_category_monthly_settings" USING ((( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = "household_id")) WITH CHECK ((( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = "household_id"));



CREATE POLICY "Users can update recurring instances in their household" ON "public"."recurring_instances" FOR UPDATE USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own recurring templates" ON "public"."recurring_templates" FOR UPDATE USING ((("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "Users can view recurring instances in their household" ON "public"."recurring_instances" FOR SELECT USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view recurring templates in their household" ON "public"."recurring_templates" FOR SELECT USING (("household_id" = ( SELECT "profiles"."household_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asset_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."budget_category_monthly_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."current_prices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_instances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recurring_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_budget_priorities" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."accounts";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."categories";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."transactions";









GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."backup_get_budget_summary"("p_household_id" "uuid", "p_period" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."backup_get_budget_summary"("p_household_id" "uuid", "p_period" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."backup_get_budget_summary"("p_household_id" "uuid", "p_period" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."backup_get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."backup_get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."backup_get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."bulk_update_transaction_category"("transaction_ids" "text"[], "new_category_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."bulk_update_transaction_category"("transaction_ids" "text"[], "new_category_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."bulk_update_transaction_category"("transaction_ids" "text"[], "new_category_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."confirm_recurring_instance"("p_instance_id" bigint, "p_confirmed_amount" numeric, "p_confirmed_category" bigint, "p_confirmed_account_id" "uuid", "p_confirmed_to_account_id" "uuid", "p_confirmed_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."confirm_recurring_instance"("p_instance_id" bigint, "p_confirmed_amount" numeric, "p_confirmed_category" bigint, "p_confirmed_account_id" "uuid", "p_confirmed_to_account_id" "uuid", "p_confirmed_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_recurring_instance"("p_instance_id" bigint, "p_confirmed_amount" numeric, "p_confirmed_category" bigint, "p_confirmed_account_id" "uuid", "p_confirmed_to_account_id" "uuid", "p_confirmed_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_asset_with_initial_balance"("p_household_id" "uuid", "p_user_id" "uuid", "p_asset_name" "text", "p_asset_class" "text", "p_unit" "text", "p_initial_quantity" numeric, "p_total_cost" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."create_asset_with_initial_balance"("p_household_id" "uuid", "p_user_id" "uuid", "p_asset_name" "text", "p_asset_class" "text", "p_unit" "text", "p_initial_quantity" numeric, "p_total_cost" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_asset_with_initial_balance"("p_household_id" "uuid", "p_user_id" "uuid", "p_asset_name" "text", "p_asset_class" "text", "p_unit" "text", "p_initial_quantity" numeric, "p_total_cost" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_household_invite"("p_invitee_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_household_invite"("p_invitee_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_household_invite"("p_invitee_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "text", "p_template_name" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "text", "p_template_name" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_recurring_from_transaction"("p_transaction_id" "text", "p_template_name" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("p_household_id" "uuid", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("p_household_id" "uuid", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recurring_instances"("p_household_id" "uuid", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_transaction_id"("t_type" "text", "t_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_transaction_id"("t_type" "text", "t_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_transaction_id"("t_type" "text", "t_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid", "p_household_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid", "p_household_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balance"("p_user_id" "uuid", "p_household_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accounts_with_balance (not used)"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balance (not used)"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accounts_with_balance (not used)"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_budget_categories_for_period"("p_ref_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_budget_categories_for_period"("p_ref_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_budget_categories_for_period"("p_ref_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_assets_with_details"("p_household_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_assets_with_details"("p_household_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_assets_with_details"("p_household_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_balance_for_account"("p_account_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_balance_for_account"("p_account_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_balance_for_account"("p_account_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_budget_data"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_budget_plan_with_rollover"("p_household_id" "uuid", "p_period" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_budget_plan_with_rollover"("p_household_id" "uuid", "p_period" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_budget_plan_with_rollover"("p_household_id" "uuid", "p_period" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cash_flow_and_balance_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cash_flow_and_balance_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cash_flow_and_balance_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_cash_flow_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_cash_flow_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_cash_flow_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_analytics"("p_household_id" "uuid", "p_category_id" integer, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_analytics"("p_household_id" "uuid", "p_category_id" integer, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_analytics"("p_household_id" "uuid", "p_category_id" integer, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" integer, "p_current_period_start" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" integer, "p_current_period_start" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" integer, "p_current_period_start" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" bigint, "p_reference_date" "date", "p_period_start_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" bigint, "p_reference_date" "date", "p_period_start_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_spending_history"("p_household_id" "uuid", "p_category_id" bigint, "p_reference_date" "date", "p_period_start_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_category_with_descendants"("p_category_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_category_with_descendants"("p_category_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_category_with_descendants"("p_category_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_comparison_metrics"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date", "p_previous_start_date" "date", "p_previous_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_comparison_metrics"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date", "p_previous_start_date" "date", "p_previous_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_comparison_metrics"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date", "p_previous_start_date" "date", "p_previous_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_household_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_household_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_household_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_custom_period_start"("reference_date" "date", "start_day" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_custom_period_start"("reference_date" "date", "start_day" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_custom_period_start"("reference_date" "date", "start_day" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dynamic_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_interval_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dynamic_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_interval_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dynamic_cash_flow"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_interval_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_goal_achievement_stats"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_goal_achievement_stats"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_goal_achievement_stats"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_goal_projection"("p_account_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_goal_projection"("p_account_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_goal_projection"("p_account_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_cash_flow"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_cash_flow"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_cash_flow"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_quick_budget_overview"("p_ref_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quick_budget_overview"("p_ref_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quick_budget_overview"("p_ref_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_month" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_month" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_month" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_ready_to_assign_value"("p_household_id" "uuid", "p_current_start_date" "date", "p_current_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recent_transactions"("p_user_id" "uuid", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recent_transactions"("p_user_id" "uuid", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recent_transactions"("p_user_id" "uuid", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recurring_instances"("p_start_date" "date", "p_end_date" "date", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_recurring_instances"("p_start_date" "date", "p_end_date" "date", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recurring_instances"("p_start_date" "date", "p_end_date" "date", "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_recurring_templates"("p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."get_recurring_templates"("p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_recurring_templates"("p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_report_summary_metrics"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_report_summary_metrics"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_report_summary_metrics"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_by_bucket"("p_household_id" "uuid", "p_period_start" "text", "p_period_end" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_by_bucket"("p_household_id" "uuid", "p_period_start" "text", "p_period_end" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_by_bucket"("p_household_id" "uuid", "p_period_start" "text", "p_period_end" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_by_budget_plan"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_by_budget_plan"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_by_budget_plan"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_by_category"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_by_category"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_by_category"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_by_parent_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_by_parent_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_by_parent_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_spending_over_time_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_spending_over_time_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_spending_over_time_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_level_parent"("p_category_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_level_parent"("p_category_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_level_parent"("p_category_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_top_transactions_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_top_transactions_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_top_transactions_report"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_total_income_by_period"("p_household_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_total_income_by_period"("p_household_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_total_income_by_period"("p_household_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_summary"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_summary"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_summary"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_summary"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_summary"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_summary"("p_user_id" "uuid", "p_start_date" "text", "p_end_date" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transactions_for_export"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transactions_for_export"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transactions_for_export"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transactions_grouped"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transactions_grouped"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transactions_grouped"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transactions_grouped"("user_id" "uuid", "filter_type" "text", "filter_category" "text", "filter_account" "uuid", "filter_start_date" "date", "filter_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transactions_grouped"("user_id" "uuid", "filter_type" "text", "filter_category" "text", "filter_account" "uuid", "filter_start_date" "date", "filter_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transactions_grouped"("user_id" "uuid", "filter_type" "text", "filter_category" "text", "filter_account" "uuid", "filter_start_date" "date", "filter_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transactions_summary"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_transactions_summary"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transactions_summary"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_transaction_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_transaction_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_transaction_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."import_transactions_batch"("p_transactions" "jsonb", "p_household_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."import_transactions_batch"("p_transactions" "jsonb", "p_household_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_transactions_batch"("p_transactions" "jsonb", "p_household_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_transaction_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_transaction_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_transaction_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."toggle_flex_budget_status"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_is_flex" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_flex_budget_status"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_is_flex" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_flex_budget_status"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_is_flex" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_category_budget_types"("updates" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."update_category_budget_types"("updates" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_category_budget_types"("updates" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_category_flex_status"("p_category_id" integer, "p_month" "date", "p_is_flex" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_category_flex_status"("p_category_id" integer, "p_month" "date", "p_is_flex" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_category_flex_status"("p_category_id" integer, "p_month" "date", "p_is_flex" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_category_rollover_status"("p_category_id" integer, "p_is_rollover" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_category_rollover_status"("p_category_id" integer, "p_is_rollover" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_category_rollover_status"("p_category_id" integer, "p_is_rollover" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_household_period_start_day"("new_day" smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."update_household_period_start_day"("new_day" smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_household_period_start_day"("new_day" smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_rollover_status"("p_budget_id" bigint, "p_category_id" bigint, "p_is_rollover" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_rollover_status"("p_budget_id" bigint, "p_category_id" bigint, "p_is_rollover" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_rollover_status"("p_budget_id" bigint, "p_category_id" bigint, "p_is_rollover" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_budget_allocation"("p_household_id" "uuid", "p_period" "date", "p_budget_id" bigint, "p_category_id" bigint, "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_budget_allocation"("p_household_id" "uuid", "p_period" "date", "p_budget_id" bigint, "p_category_id" bigint, "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_budget_allocation"("p_household_id" "uuid", "p_period" "date", "p_budget_id" bigint, "p_category_id" bigint, "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_budget_assignment"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_budget_assignment"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_budget_assignment"("p_household_id" "uuid", "p_category_id" integer, "p_month" "date", "p_amount" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_budget_plan_with_categories_v2"("p_plan_id" bigint, "p_plan_name" "text", "p_household_id" "uuid", "p_category_settings" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_budget_plan_with_categories_v2"("p_plan_id" bigint, "p_plan_name" "text", "p_household_id" "uuid", "p_category_settings" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_budget_plan_with_categories_v2"("p_plan_id" bigint, "p_plan_name" "text", "p_household_id" "uuid", "p_category_settings" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_recurring_template"("p_template_data" "jsonb", "p_template_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_recurring_template"("p_template_data" "jsonb", "p_template_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_recurring_template"("p_template_data" "jsonb", "p_template_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."upsert_recurring_template"("p_template_id" bigint, "p_template_name" "text", "p_type" "public"."transaction_type", "p_amount" numeric, "p_category_id" bigint, "p_account_id" "uuid", "p_to_account_id" "uuid", "p_note" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."upsert_recurring_template"("p_template_id" bigint, "p_template_name" "text", "p_type" "public"."transaction_type", "p_amount" numeric, "p_category_id" bigint, "p_account_id" "uuid", "p_to_account_id" "uuid", "p_note" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."upsert_recurring_template"("p_template_id" bigint, "p_template_name" "text", "p_type" "public"."transaction_type", "p_amount" numeric, "p_category_id" bigint, "p_account_id" "uuid", "p_to_account_id" "uuid", "p_note" "text", "p_frequency" "public"."frequency_enum", "p_interval_value" smallint, "p_start_date" "date", "p_end_date" "date") TO "service_role";
























GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."asset_transactions" TO "anon";
GRANT ALL ON TABLE "public"."asset_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."asset_transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."asset_transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."asset_transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."budget_assignments" TO "anon";
GRANT ALL ON TABLE "public"."budget_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_assignments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."budget_assignments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."budget_assignments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."budget_assignments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."budget_category_monthly_settings" TO "anon";
GRANT ALL ON TABLE "public"."budget_category_monthly_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."budget_category_monthly_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."budget_category_monthly_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."budget_category_monthly_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."budget_category_monthly_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."current_prices" TO "anon";
GRANT ALL ON TABLE "public"."current_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."current_prices" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_instances" TO "anon";
GRANT ALL ON TABLE "public"."recurring_instances" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_instances" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recurring_instances_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recurring_instances_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recurring_instances_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."recurring_templates" TO "anon";
GRANT ALL ON TABLE "public"."recurring_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."recurring_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."recurring_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."recurring_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."recurring_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."user_budget_priorities" TO "anon";
GRANT ALL ON TABLE "public"."user_budget_priorities" TO "authenticated";
GRANT ALL ON TABLE "public"."user_budget_priorities" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
