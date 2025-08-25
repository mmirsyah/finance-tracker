-- SMOKE TEST FUNCTION
-- This function ignores all calculation logic and tries to write a static value
-- to a specific row to test if the UPDATE operation itself is working.
CREATE OR REPLACE FUNCTION public.update_rollover_for_period(p_household_id uuid, p_current_month_anchor date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.budget_assignments
    SET rollover_amount = 12345.00 -- Static test value
    WHERE
        household_id = p_household_id
        AND month = date_trunc('month', p_current_month_anchor)::DATE
        -- We target a specific category that we know has a budget assignment in August 2025
        AND category_id = 82;
END;
$$;
