-- ============================================
-- UN IFICAÇÃO COMPLETA: PROFILES + BUSINESS PROFILES (FINAL)
-- ============================================

-- PASSO 1: Adicionar campos faltantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_type TEXT DEFAULT 'user' CHECK (profile_type IN ('user', 'business'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS services_offered TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS working_hours TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS average_rating NUMERIC DEFAULT 0.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS response_time_avg INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_by UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS portfolio_description TEXT;

-- PASSO 2: Deletar perfis business se ainda existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_profiles' AND table_schema = 'public') THEN
    DELETE FROM public.business_profile_views;
    DELETE FROM public.business_post_likes;
    DELETE FROM public.business_post_comments;
    DELETE FROM public.business_posts;
    DELETE FROM public.business_videos;
    DELETE FROM public.business_whatsapp_config;
    DELETE FROM public.business_testimonials;
    DELETE FROM public.business_custom_links;
    DELETE FROM public.business_certifications;
    DELETE FROM public.business_catalog_items;
    DELETE FROM public.business_banners;
    DELETE FROM public.business_availability;
    DELETE FROM public.business_job_applications;
    DELETE FROM public.business_job_vacancies;
    DELETE FROM public.business_admins;
    DELETE FROM public.business_profile_features;
    DELETE FROM public.business_profiles;
  END IF;
END $$;

-- PASSO 3: Renomear tabelas se ainda não foram renomeadas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_admins' AND table_schema = 'public') THEN
    ALTER TABLE public.business_admins RENAME TO profile_admins;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_appointments' AND table_schema = 'public') THEN
    ALTER TABLE public.business_appointments RENAME TO profile_appointments;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_availability' AND table_schema = 'public') THEN
    ALTER TABLE public.business_availability RENAME TO profile_availability;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_banners' AND table_schema = 'public') THEN
    ALTER TABLE public.business_banners RENAME TO profile_banners;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_catalog_items' AND table_schema = 'public') THEN
    ALTER TABLE public.business_catalog_items RENAME TO profile_catalog_items;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_certifications' AND table_schema = 'public') THEN
    ALTER TABLE public.business_certifications RENAME TO profile_certifications;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_custom_links' AND table_schema = 'public') THEN
    ALTER TABLE public.business_custom_links RENAME TO profile_custom_links;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_job_applications' AND table_schema = 'public') THEN
    ALTER TABLE public.business_job_applications RENAME TO profile_job_applications;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_job_vacancies' AND table_schema = 'public') THEN
    ALTER TABLE public.business_job_vacancies RENAME TO profile_job_vacancies;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_profile_features' AND table_schema = 'public') THEN
    ALTER TABLE public.business_profile_features RENAME TO profile_features;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_testimonials' AND table_schema = 'public') THEN
    ALTER TABLE public.business_testimonials RENAME TO profile_testimonials;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_videos' AND table_schema = 'public') THEN
    ALTER TABLE public.business_videos RENAME TO profile_videos;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_whatsapp_config' AND table_schema = 'public') THEN
    ALTER TABLE public.business_whatsapp_config RENAME TO profile_whatsapp_config;
  END IF;
END $$;

-- Deletar tabelas temporárias
DROP TABLE IF EXISTS public.business_post_comments CASCADE;
DROP TABLE IF EXISTS public.business_post_likes CASCADE;
DROP TABLE IF EXISTS public.business_posts CASCADE;
DROP TABLE IF EXISTS public.business_profile_views CASCADE;
DROP TABLE IF EXISTS public.business_profiles CASCADE;
DROP TABLE IF EXISTS public.user_profile_features CASCADE;

-- PASSO 4: Renomear colunas
DO $$
DECLARE
  tables_to_update TEXT[] := ARRAY[
    'profile_admins', 'profile_appointments', 'profile_availability',
    'profile_banners', 'profile_catalog_items', 'profile_certifications',
    'profile_custom_links', 'profile_job_vacancies', 'profile_testimonials',
    'profile_videos', 'profile_whatsapp_config'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables_to_update
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'business_id') THEN
      EXECUTE format('ALTER TABLE public.%I RENAME COLUMN business_id TO target_profile_id', t);
    END IF;
  END LOOP;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_features' AND column_name = 'business_id') THEN
    ALTER TABLE public.profile_features RENAME COLUMN business_id TO profile_id;
  END IF;
END $$;

-- PASSO 5: Renomear posts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts' AND table_schema = 'public') THEN
    ALTER TABLE public.posts RENAME TO profile_posts;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profile_posts' AND column_name = 'author_id') THEN
    ALTER TABLE public.profile_posts RENAME COLUMN author_id TO profile_id;
  END IF;
END $$;

-- PASSO 6: Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_profile_type ON public.profiles(profile_type);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_deleted ON public.profiles(deleted);
CREATE INDEX IF NOT EXISTS idx_profile_posts_profile_id ON public.profile_posts(profile_id);

-- PASSO 7: Atualizar evaluations e negotiations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'business_id') THEN
    ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_business_id_fkey;
    ALTER TABLE public.evaluations RENAME COLUMN business_id TO target_profile_id;
    ALTER TABLE public.evaluations ADD CONSTRAINT evaluations_target_profile_id_fkey 
      FOREIGN KEY (target_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evaluations' AND column_name = 'user_id') THEN
    ALTER TABLE public.evaluations RENAME COLUMN user_id TO author_profile_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'negotiations' AND column_name = 'business_id') THEN
    ALTER TABLE public.negotiations DROP CONSTRAINT IF EXISTS negotiations_business_id_fkey;
    ALTER TABLE public.negotiations RENAME COLUMN business_id TO target_profile_id;
    ALTER TABLE public.negotiations ADD CONSTRAINT negotiations_target_profile_id_fkey 
      FOREIGN KEY (target_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'negotiations' AND column_name = 'user_id') THEN
    ALTER TABLE public.negotiations RENAME COLUMN user_id TO client_user_id;
  END IF;
END $$;