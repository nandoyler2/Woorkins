-- Criar tabela de configuração de ferramentas do perfil
CREATE TABLE IF NOT EXISTS business_profile_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, feature_key)
);

-- Tabela de banners rotativos
CREATE TABLE IF NOT EXISTS business_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  link_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de vídeo de apresentação
CREATE TABLE IF NOT EXISTS business_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  youtube_url TEXT NOT NULL,
  title TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id)
);

-- Tabela de catálogo de serviços/produtos
CREATE TABLE IF NOT EXISTS business_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  category TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de depoimentos
CREATE TABLE IF NOT EXISTS business_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_profile_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID REFERENCES profiles(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de certificações e prêmios
CREATE TABLE IF NOT EXISTS business_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('image', 'pdf')),
  issued_by TEXT,
  issued_date DATE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de disponibilidade de agendamento
CREATE TABLE IF NOT EXISTS business_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de agendamentos
CREATE TABLE IF NOT EXISTS business_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  client_profile_id UUID NOT NULL REFERENCES profiles(id),
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

-- Tabela de links personalizados (LinkTree)
CREATE TABLE IF NOT EXISTS business_custom_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de vagas de emprego
CREATE TABLE IF NOT EXISTS business_job_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  salary_min NUMERIC(10,2),
  salary_max NUMERIC(10,2),
  work_mode TEXT CHECK (work_mode IN ('presencial', 'remoto', 'hibrido')),
  area TEXT,
  deadline DATE,
  requirements TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'filled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de candidaturas às vagas
CREATE TABLE IF NOT EXISTS business_job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES business_job_vacancies(id) ON DELETE CASCADE,
  applicant_profile_id UUID NOT NULL REFERENCES profiles(id),
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(vacancy_id, applicant_profile_id)
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE business_profile_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_custom_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_job_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_job_applications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para business_profile_features
CREATE POLICY "Users can manage their business features" ON business_profile_features
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_profile_features.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active features" ON business_profile_features
  FOR SELECT USING (is_active = true);

-- Políticas RLS para business_banners
CREATE POLICY "Business owners can manage their banners" ON business_banners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_banners.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active banners" ON business_banners
  FOR SELECT USING (active = true);

-- Políticas RLS para business_videos
CREATE POLICY "Business owners can manage their videos" ON business_videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_videos.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active videos" ON business_videos
  FOR SELECT USING (active = true);

-- Políticas RLS para business_catalog_items
CREATE POLICY "Business owners can manage their catalog" ON business_catalog_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_catalog_items.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active catalog items" ON business_catalog_items
  FOR SELECT USING (active = true);

-- Políticas RLS para business_testimonials
CREATE POLICY "Authenticated users can create testimonials" ON business_testimonials
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Everyone can view approved testimonials" ON business_testimonials
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Admins can manage testimonials" ON business_testimonials
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Políticas RLS para business_certifications
CREATE POLICY "Business owners can manage their certifications" ON business_certifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_certifications.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view certifications" ON business_certifications
  FOR SELECT USING (true);

-- Políticas RLS para business_availability
CREATE POLICY "Business owners can manage their availability" ON business_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_availability.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view availability" ON business_availability
  FOR SELECT USING (active = true);

-- Políticas RLS para business_appointments
CREATE POLICY "Business owners can manage appointments" ON business_appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_appointments.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create and view their appointments" ON business_appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = business_appointments.client_profile_id
      AND p.user_id = auth.uid()
    )
  );

-- Políticas RLS para business_custom_links
CREATE POLICY "Business owners can manage their links" ON business_custom_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_custom_links.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active links" ON business_custom_links
  FOR SELECT USING (active = true);

-- Políticas RLS para business_job_vacancies
CREATE POLICY "Business owners can manage their vacancies" ON business_job_vacancies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_profiles bp
      JOIN profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_job_vacancies.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view open vacancies" ON business_job_vacancies
  FOR SELECT USING (status = 'open');

-- Políticas RLS para business_job_applications
CREATE POLICY "Applicants can create and view their applications" ON business_job_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = business_job_applications.applicant_profile_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can view applications for their vacancies" ON business_job_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM business_job_vacancies v
      JOIN business_profiles bp ON bp.id = v.business_id
      JOIN profiles p ON p.id = bp.profile_id
      WHERE v.id = business_job_applications.vacancy_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update applications status" ON business_job_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM business_job_vacancies v
      JOIN business_profiles bp ON bp.id = v.business_id
      JOIN profiles p ON p.id = bp.profile_id
      WHERE v.id = business_job_applications.vacancy_id
      AND p.user_id = auth.uid()
    )
  );

-- Triggers para atualizar updated_at
CREATE TRIGGER update_business_profile_features_updated_at
  BEFORE UPDATE ON business_profile_features
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_banners_updated_at
  BEFORE UPDATE ON business_banners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_videos_updated_at
  BEFORE UPDATE ON business_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_catalog_items_updated_at
  BEFORE UPDATE ON business_catalog_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_testimonials_updated_at
  BEFORE UPDATE ON business_testimonials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_certifications_updated_at
  BEFORE UPDATE ON business_certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_availability_updated_at
  BEFORE UPDATE ON business_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_appointments_updated_at
  BEFORE UPDATE ON business_appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_custom_links_updated_at
  BEFORE UPDATE ON business_custom_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_job_vacancies_updated_at
  BEFORE UPDATE ON business_job_vacancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_job_applications_updated_at
  BEFORE UPDATE ON business_job_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();