set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.bulk_update_transaction_category(transaction_ids text[], new_category_id bigint)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$
;


