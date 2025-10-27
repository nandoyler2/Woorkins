-- 1) Garantir RLS e política de UPDATE no profiles para o dono
alter table if exists public.profiles enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_update_own'
  ) then
    create policy "profiles_update_own" on public.profiles
    for update
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

-- 2) Permitir que o dono gerencie profile_features
alter table if exists public.profile_features enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_features' and policyname='profile_features_manage_own'
  ) then
    create policy "profile_features_manage_own" on public.profile_features
    for all
    using (exists (select 1 from public.profiles p where p.id = profile_features.profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = profile_features.profile_id and p.user_id = auth.uid()));
  end if;
end $$;

-- 3) Permitir que o dono gerencie recursos que usam target_profile_id
-- profile_banners
alter table if exists public.profile_banners enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_banners' and policyname='profile_banners_manage_own'
  ) then
    create policy "profile_banners_manage_own" on public.profile_banners
    for all
    using (exists (select 1 from public.profiles p where p.id = profile_banners.target_profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = profile_banners.target_profile_id and p.user_id = auth.uid()));
  end if;
end $$;

-- profile_catalog_items
alter table if exists public.profile_catalog_items enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_catalog_items' and policyname='profile_catalog_items_manage_own'
  ) then
    create policy "profile_catalog_items_manage_own" on public.profile_catalog_items
    for all
    using (exists (select 1 from public.profiles p where p.id = profile_catalog_items.target_profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = profile_catalog_items.target_profile_id and p.user_id = auth.uid()));
  end if;
end $$;

-- profile_certifications
alter table if exists public.profile_certifications enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_certifications' and policyname='profile_certifications_manage_own'
  ) then
    create policy "profile_certifications_manage_own" on public.profile_certifications
    for all
    using (exists (select 1 from public.profiles p where p.id = profile_certifications.target_profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = profile_certifications.target_profile_id and p.user_id = auth.uid()));
  end if;
end $$;

-- profile_custom_links
alter table if exists public.profile_custom_links enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_custom_links' and policyname='profile_custom_links_manage_own'
  ) then
    create policy "profile_custom_links_manage_own" on public.profile_custom_links
    for all
    using (exists (select 1 from public.profiles p where p.id = profile_custom_links.target_profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = profile_custom_links.target_profile_id and p.user_id = auth.uid()));
  end if;
end $$;

-- profile_job_vacancies
alter table if exists public.profile_job_vacancies enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_job_vacancies' and policyname='profile_job_vacancies_manage_own'
  ) then
    create policy "profile_job_vacancies_manage_own" on public.profile_job_vacancies
    for all
    using (exists (select 1 from public.profiles p where p.id = profile_job_vacancies.target_profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = profile_job_vacancies.target_profile_id and p.user_id = auth.uid()));
  end if;
end $$;

-- profile_availability
alter table if exists public.profile_availability enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='profile_availability' and policyname='profile_availability_manage_own'
  ) then
    create policy "profile_availability_manage_own" on public.profile_availability
    for all
    using (exists (select 1 from public.profiles p where p.id = profile_availability.target_profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = profile_availability.target_profile_id and p.user_id = auth.uid()));
  end if;
end $$;

-- 4) portfolio_items: adicionar profile_id e políticas do dono
alter table if exists public.portfolio_items add column if not exists profile_id uuid;

-- Backfill simples copiando business_id -> profile_id quando profile_id está nulo
update public.portfolio_items set profile_id = business_id where profile_id is null;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='portfolio_items' and policyname='portfolio_items_manage_own'
  ) then
    create policy "portfolio_items_manage_own" on public.portfolio_items
    for all
    using (exists (select 1 from public.profiles p where p.id = portfolio_items.profile_id and p.user_id = auth.uid()))
    with check (exists (select 1 from public.profiles p where p.id = portfolio_items.profile_id and p.user_id = auth.uid()));
  end if;
end $$;