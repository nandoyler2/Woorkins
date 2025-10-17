-- Function to avoid RLS recursion when checking business ownership
create or replace function public.is_profile_owner(_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = _profile_id
      and user_id = auth.uid()
  );
$$;

-- Recreate UPDATE policy to use the security definer function
DROP POLICY IF EXISTS "Users can update their own business profile" ON public.business_profiles;

CREATE POLICY "Users can update their own business profile"
ON public.business_profiles
FOR UPDATE
USING (public.is_profile_owner(profile_id))
WITH CHECK (public.is_profile_owner(profile_id));