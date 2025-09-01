-- First, drop the old function because its return signature is changing.
DROP FUNCTION IF EXISTS public.get_spending_by_category(uuid, date, date);

-- Now, create the new version of the function with the correct signature.
CREATE OR REPLACE FUNCTION "public"."get_spending_by_category"("p_household_id" "uuid", "p_start_date" "date", "p_end_date" "date") 
RETURNS TABLE("category_id" bigint, "category_name" text, "total_spent" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.category as category_id,
        c.name as category_name,
        SUM(t.amount) as total_spent
    FROM
        transactions t
    LEFT JOIN categories c ON t.category = c.id
    WHERE
        t.household_id = p_household_id
        AND t.type = 'expense'
        AND t.category IS NOT NULL
        AND t.date BETWEEN p_start_date AND p_end_date
    GROUP BY
        t.category, c.name
    ORDER BY
        total_spent DESC;
END;
$$;