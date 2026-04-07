-- ========================================================
-- MIGRATION: Agency Daily Limits & Enforcement
-- ========================================================

-- 1. Add the column to store the limit per agency
ALTER TABLE public.agence 
ADD COLUMN IF NOT EXISTS limite_quotidienne numeric DEFAULT NULL;

-- 2. Create the RPC function to check the limit before a transaction
-- This function will be called by the agent-facing application.
-- It returns the status (allowed or not), the limit, the total used today and the remaining amount.

CREATE OR REPLACE FUNCTION public.check_agency_daily_limit(p_agence_id int)
RETURNS json AS $$
DECLARE
    v_limit numeric;
    v_total_today numeric;
    v_result json;
BEGIN
    -- Get the agency's limit
    SELECT limite_quotidienne INTO v_limit 
    FROM public.agence 
    WHERE id = p_agence_id;

    -- If no limit is set (NULL), always allowed
    IF v_limit IS NULL THEN
        RETURN json_build_object(
            'allowed', true,
            'limite', null,
            'total_today', 0,
            'remaining', null
        );
    END IF;

    -- Calculate current total of transfers sent today for this agency
    -- We assume 'user_envoi' is the agent and we join to get the agency
    SELECT COALESCE(SUM(montant), 0) INTO v_total_today
    FROM public.transferts t
    JOIN public.agents a ON t.user_envoi = a.id
    WHERE a.agence_agens = p_agence_id
      AND t.date_transfert::date = CURRENT_DATE;

    -- Build the response
    v_result := json_build_object(
        'allowed', (v_total_today < v_limit),
        'limite', v_limit,
        'total_today', v_total_today,
        'remaining', GREATEST(0, v_limit - v_total_today)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. (Optional) Update existing agencies with a default limit if needed
-- UPDATE public.agence SET limite_quotidienne = 10000 WHERE limite_quotidienne IS NULL;
