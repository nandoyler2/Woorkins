-- Create function to get plan by profile_id to avoid needing profiles.user_id client-side
CREATE OR REPLACE FUNCTION public.get_user_plan_by_profile(_profile_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (
      SELECT plan_type
      FROM public.user_subscription_plans
      WHERE user_id = (
        SELECT user_id FROM public.profiles WHERE id = _profile_id
      )
      AND is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    ),
    'free'
  );
$$;