-- Adicionar campos necessários à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS enable_negotiation BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Criar tabela user_banners (espelho de business_banners)
CREATE TABLE IF NOT EXISTS public.user_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  link_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_videos (espelho de business_videos)
CREATE TABLE IF NOT EXISTS public.user_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  title TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_catalog_items (espelho de business_catalog_items)
CREATE TABLE IF NOT EXISTS public.user_catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_testimonials (espelho de business_testimonials)
CREATE TABLE IF NOT EXISTS public.user_testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_certifications (espelho de business_certifications)
CREATE TABLE IF NOT EXISTS public.user_certifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  issued_by TEXT,
  issued_date DATE,
  file_url TEXT NOT NULL,
  file_type TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_availability (espelho de business_availability)
CREATE TABLE IF NOT EXISTS public.user_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_appointments (espelho de business_appointments)
CREATE TABLE IF NOT EXISTS public.user_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  service_description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  google_calendar_event_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_custom_links (espelho de business_custom_links)
CREATE TABLE IF NOT EXISTS public.user_custom_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT,
  icon_name TEXT,
  youtube_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_job_vacancies (espelho de business_job_vacancies)
CREATE TABLE IF NOT EXISTS public.user_job_vacancies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT,
  work_mode TEXT,
  requirements TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  deadline DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'filled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_job_applications (espelho de business_job_applications)
CREATE TABLE IF NOT EXISTS public.user_job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vacancy_id UUID NOT NULL REFERENCES public.user_job_vacancies(id) ON DELETE CASCADE,
  applicant_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_portfolio (espelho de business_portfolio)
CREATE TABLE IF NOT EXISTS public.user_portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  category TEXT,
  tags TEXT[],
  link_url TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela user_profile_features (espelho de business_profile_features)
CREATE TABLE IF NOT EXISTS public.user_profile_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(profile_id, feature_key)
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.user_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_features ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para user_banners
CREATE POLICY "Users can manage their own banners" ON public.user_banners
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_banners.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view active banners" ON public.user_banners
  FOR SELECT USING (active = true);

-- Políticas RLS para user_videos
CREATE POLICY "Users can manage their own videos" ON public.user_videos
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_videos.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view active videos" ON public.user_videos
  FOR SELECT USING (active = true);

-- Políticas RLS para user_catalog_items
CREATE POLICY "Users can manage their own catalog" ON public.user_catalog_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_catalog_items.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view active catalog items" ON public.user_catalog_items
  FOR SELECT USING (active = true);

-- Políticas RLS para user_testimonials
CREATE POLICY "Authenticated users can create testimonials" ON public.user_testimonials
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Everyone can view approved testimonials" ON public.user_testimonials
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can manage testimonials" ON public.user_testimonials
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para user_certifications
CREATE POLICY "Users can manage their own certifications" ON public.user_certifications
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_certifications.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view certifications" ON public.user_certifications
  FOR SELECT USING (true);

-- Políticas RLS para user_availability
CREATE POLICY "Users can manage their own availability" ON public.user_availability
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_availability.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view availability" ON public.user_availability
  FOR SELECT USING (active = true);

-- Políticas RLS para user_appointments
CREATE POLICY "Users can manage appointments" ON public.user_appointments
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_appointments.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Clients can view their appointments" ON public.user_appointments
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_appointments.client_profile_id 
    AND profiles.user_id = auth.uid()
  ));

-- Políticas RLS para user_custom_links
CREATE POLICY "Users can manage their own links" ON public.user_custom_links
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_custom_links.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view active links" ON public.user_custom_links
  FOR SELECT USING (active = true);

-- Políticas RLS para user_job_vacancies
CREATE POLICY "Users can manage their own vacancies" ON public.user_job_vacancies
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_job_vacancies.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view open vacancies" ON public.user_job_vacancies
  FOR SELECT USING (status = 'open');

-- Políticas RLS para user_job_applications
CREATE POLICY "Applicants can create and view their applications" ON public.user_job_applications
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_job_applications.applicant_profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Vacancy owners can view applications" ON public.user_job_applications
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.user_job_vacancies v
    JOIN public.profiles p ON p.id = v.profile_id
    WHERE v.id = user_job_applications.vacancy_id 
    AND p.user_id = auth.uid()
  ));

-- Políticas RLS para user_portfolio
CREATE POLICY "Users can manage their own portfolio" ON public.user_portfolio
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_portfolio.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view portfolio" ON public.user_portfolio
  FOR SELECT USING (true);

-- Políticas RLS para user_profile_features
CREATE POLICY "Users can manage their own features" ON public.user_profile_features
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = user_profile_features.profile_id 
    AND profiles.user_id = auth.uid()
  ));

CREATE POLICY "Everyone can view active features" ON public.user_profile_features
  FOR SELECT USING (is_active = true);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_banners_profile ON public.user_banners(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_videos_profile ON public.user_videos(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_catalog_profile ON public.user_catalog_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_testimonials_profile ON public.user_testimonials(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_certifications_profile ON public.user_certifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_availability_profile ON public.user_availability(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_appointments_profile ON public.user_appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_appointments_client ON public.user_appointments(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_custom_links_profile ON public.user_custom_links(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_job_vacancies_profile ON public.user_job_vacancies(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_job_applications_vacancy ON public.user_job_applications(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_user_portfolio_profile ON public.user_portfolio(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_features_profile ON public.user_profile_features(profile_id);