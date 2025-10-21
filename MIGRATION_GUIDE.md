# Guia Completo de Migração - Woorkins

## 📋 Visão Geral

Este documento contém TUDO que você precisa para recriar o banco de dados em um Supabase externo.

**Estrutura:**
- 50+ tabelas
- 100+ RLS policies
- 30+ database functions
- 9 storage buckets
- 20+ edge functions

---

## 🗄️ PARTE 1: SCHEMA DO BANCO DE DADOS

### Execute este SQL no SQL Editor do seu Supabase

```sql
-- ============================================================================
-- TIPOS CUSTOMIZADOS
-- ============================================================================

CREATE TYPE app_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE evaluation_type AS ENUM ('user', 'business');

-- ============================================================================
-- TABELAS PRINCIPAIS
-- ============================================================================

-- Tabela: profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  phone TEXT,
  cpf TEXT,
  birth_date DATE,
  nationality TEXT,
  place_of_birth TEXT,
  filiation TEXT,
  skills TEXT[],
  hourly_rate NUMERIC,
  availability TEXT,
  portfolio_url TEXT,
  linkedin_url TEXT,
  github_url TEXT,
  document_verified BOOLEAN DEFAULT false,
  document_verification_status TEXT DEFAULT 'pending',
  profile_photo_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Tabela: global_identifiers
CREATE TABLE public.global_identifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT UNIQUE NOT NULL,
  identifier_type TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_profiles
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE,
  category TEXT,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  address TEXT,
  website_url TEXT,
  facebook TEXT,
  instagram TEXT,
  linkedin TEXT,
  twitter TEXT,
  working_hours TEXT,
  services_offered TEXT[],
  portfolio_description TEXT,
  enable_negotiation BOOLEAN DEFAULT false,
  average_rating NUMERIC DEFAULT 0.0,
  total_reviews INTEGER DEFAULT 0,
  response_time_avg INTEGER DEFAULT 0,
  linktree_slug TEXT,
  linktree_logo_url TEXT,
  linktree_config JSONB DEFAULT '{"layout": "minimal"}'::jsonb,
  linktree_social_links JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID,
  last_slug_change_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_admins
CREATE TABLE public.business_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_by_profile_id UUID REFERENCES public.profiles(id),
  permissions JSONB DEFAULT '{"manage_team": false, "edit_profile": false, "manage_posts": false, "view_finances": false, "manage_products": false, "manage_appointments": false}'::jsonb,
  status TEXT DEFAULT 'pending',
  invited_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, profile_id)
);

-- Tabela: projects
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget NUMERIC,
  deadline DATE,
  status TEXT DEFAULT 'open',
  category TEXT,
  skills_required TEXT[],
  proposals_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: proposals
CREATE TABLE public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  freelancer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  delivery_time INTEGER NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: counter_proposals
CREATE TABLE public.counter_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  from_profile_id UUID REFERENCES public.profiles(id) NOT NULL,
  to_profile_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Tabela: proposal_messages
CREATE TABLE public.proposal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: negotiations
CREATE TABLE public.negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: negotiation_messages
CREATE TABLE public.negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID REFERENCES public.negotiations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) NOT NULL,
  sender_type TEXT NOT NULL,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_type TEXT,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: evaluations
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  evaluation_type evaluation_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  tags TEXT[],
  media_urls TEXT[],
  media_types TEXT[],
  evaluation_category TEXT DEFAULT 'positive',
  is_verified BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  public_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: follows
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Tabela: notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_posts
CREATE TABLE public.business_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  media_types TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_post_likes
CREATE TABLE public.business_post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.business_posts(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- Tabela: business_post_comments
CREATE TABLE public.business_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.business_posts(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_profile_features
CREATE TABLE public.business_profile_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  feature_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, feature_key)
);

-- Tabela: business_catalog_items
CREATE TABLE public.business_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_banners
CREATE TABLE public.business_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  image_url TEXT NOT NULL,
  link_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_videos
CREATE TABLE public.business_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  youtube_url TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_custom_links
CREATE TABLE public.business_custom_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon_name TEXT,
  image_url TEXT,
  youtube_url TEXT,
  order_index INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_certifications
CREATE TABLE public.business_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  issued_by TEXT,
  issued_date DATE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_testimonials
CREATE TABLE public.business_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_profile_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  status TEXT DEFAULT 'pending',
  moderated_by UUID REFERENCES public.profiles(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_job_vacancies
CREATE TABLE public.business_job_vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT,
  work_mode TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  requirements TEXT,
  deadline DATE,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_job_applications
CREATE TABLE public.business_job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID REFERENCES public.business_job_vacancies(id) ON DELETE CASCADE NOT NULL,
  applicant_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  cover_letter TEXT,
  resume_url TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_appointments
CREATE TABLE public.business_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  client_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  service_description TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  google_calendar_event_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_availability
CREATE TABLE public.business_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: business_profile_views
CREATE TABLE public.business_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE NOT NULL,
  viewer_profile_id UUID REFERENCES public.profiles(id),
  ip_address TEXT,
  user_agent TEXT,
  viewed_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: document_verifications
CREATE TABLE public.document_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  document_front_url TEXT NOT NULL,
  document_back_url TEXT NOT NULL,
  selfie_url TEXT,
  verification_status TEXT DEFAULT 'pending',
  verification_result JSONB,
  ai_analysis JSONB,
  extracted_name TEXT,
  extracted_cpf TEXT,
  extracted_birth_date DATE,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: manual_document_submissions
CREATE TABLE public.manual_document_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  document_front_url TEXT NOT NULL,
  document_back_url TEXT NOT NULL,
  selfie_url TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  social_media_link TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: subscription_plans
CREATE TABLE public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: user_subscription_plans
CREATE TABLE public.user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES public.subscription_plans(id) NOT NULL,
  plan_type TEXT NOT NULL,
  start_date TIMESTAMPTZ DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: woorkoins_balance
CREATE TABLE public.woorkoins_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: woorkoins_transactions
CREATE TABLE public.woorkoins_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: woorkoins_mercadopago_payments
CREATE TABLE public.woorkoins_mercadopago_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  woorkoins_amount INTEGER NOT NULL,
  payment_id TEXT UNIQUE,
  preference_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: freelancer_wallet
CREATE TABLE public.freelancer_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  available_balance NUMERIC DEFAULT 0,
  pending_balance NUMERIC DEFAULT 0,
  total_earned NUMERIC DEFAULT 0,
  total_withdrawn NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: wallet_transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES public.freelancer_wallet(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: withdrawal_requests
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  bank_details JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.profiles(id),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: platform_settings
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: payment_transactions
CREATE TABLE public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id),
  payer_id UUID REFERENCES public.profiles(id) NOT NULL,
  payee_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount NUMERIC NOT NULL,
  platform_fee NUMERIC,
  stripe_fee NUMERIC,
  status TEXT DEFAULT 'pending',
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: message_unread_counts
CREATE TABLE public.message_unread_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID NOT NULL,
  conversation_type TEXT NOT NULL,
  unread_count INTEGER DEFAULT 0,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, conversation_id, conversation_type)
);

-- Tabela: typing_indicators
CREATE TABLE public.typing_indicators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  conversation_type TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, conversation_type, user_id)
);

-- Tabela: message_spam_tracking
CREATE TABLE public.message_spam_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  context TEXT NOT NULL,
  spam_count INTEGER DEFAULT 0,
  last_spam_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ,
  block_duration_minutes INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, context)
);

-- Tabela: blocked_messages
CREATE TABLE public.blocked_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID,
  conversation_type TEXT NOT NULL,
  original_content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  moderation_reason TEXT NOT NULL,
  moderation_category TEXT,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: moderation_violations
CREATE TABLE public.moderation_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  violation_count INTEGER DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: system_blocks
CREATE TABLE public.system_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  block_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  blocked_until TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, block_type)
);

-- Tabela: support_conversations
CREATE TABLE public.support_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'open',
  assigned_to UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: support_messages
CREATE TABLE public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID,
  content TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: ai_assistant_conversations
CREATE TABLE public.ai_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  messages JSONB DEFAULT '[]'::jsonb,
  archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: ai_faq
CREATE TABLE public.ai_faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_pattern TEXT NOT NULL,
  keywords TEXT[] NOT NULL,
  response TEXT NOT NULL,
  faq_display_response TEXT,
  category TEXT DEFAULT 'general',
  link TEXT,
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: legal_pages
CREATE TABLE public.legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela: email_change_verifications
CREATE TABLE public.email_change_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  new_email TEXT NOT NULL,
  verification_code TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================================

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_business_profiles_slug ON public.business_profiles(slug);
CREATE INDEX idx_business_profiles_profile_id ON public.business_profiles(profile_id);
CREATE INDEX idx_projects_profile_id ON public.projects(profile_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_proposals_project_id ON public.proposals(project_id);
CREATE INDEX idx_proposals_freelancer_id ON public.proposals(freelancer_id);
CREATE INDEX idx_evaluations_business_id ON public.evaluations(business_id);
CREATE INDEX idx_evaluations_user_id ON public.evaluations(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_business_posts_business_id ON public.business_posts(business_id);
CREATE INDEX idx_proposal_messages_proposal_id ON public.proposal_messages(proposal_id);
CREATE INDEX idx_negotiation_messages_negotiation_id ON public.negotiation_messages(negotiation_id);

-- ============================================================================
-- FIM PARTE 1
-- ============================================================================
```

---

## 🔐 PARTE 2: ROW LEVEL SECURITY (RLS)

### Execute este SQL após criar as tabelas

```sql
-- ============================================================================
-- ATIVAR RLS EM TODAS AS TABELAS
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_identifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profile_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_custom_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_job_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_document_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woorkoins_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woorkoins_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.woorkoins_mercadopago_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freelancer_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_unread_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_spam_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_change_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLICIES - PROFILES
-- ============================================================================

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - USER_ROLES
-- ============================================================================

CREATE POLICY "User roles are viewable by everyone"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage roles"
  ON public.user_roles FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - BUSINESS_PROFILES
-- ============================================================================

CREATE POLICY "Business profiles are viewable by everyone"
  ON public.business_profiles FOR SELECT
  USING (deleted = false OR deleted IS NULL);

CREATE POLICY "Admins can view all business profiles including deleted"
  ON public.business_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own business profile"
  ON public.business_profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = business_profiles.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own business profile"
  ON public.business_profiles FOR UPDATE
  USING (is_profile_owner(profile_id))
  WITH CHECK (is_profile_owner(profile_id));

CREATE POLICY "Admins can update any business profile"
  ON public.business_profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own business profile"
  ON public.business_profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = business_profiles.profile_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - PROJECTS
-- ============================================================================

CREATE POLICY "Projects are viewable by everyone"
  ON public.projects FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = projects.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = projects.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = projects.profile_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - PROPOSALS
-- ============================================================================

CREATE POLICY "Proposals are viewable by project owner and freelancer"
  ON public.proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      JOIN public.profiles p ON p.id = pr.profile_id
      WHERE pr.id = proposals.project_id
      AND p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = proposals.freelancer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = proposals.freelancer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Freelancers can update their own proposals"
  ON public.proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = proposals.freelancer_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update proposal status"
  ON public.proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects pr
      JOIN public.profiles p ON p.id = pr.profile_id
      WHERE pr.id = proposals.project_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - EVALUATIONS
-- ============================================================================

CREATE POLICY "Evaluations are viewable by everyone"
  ON public.evaluations FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create evaluations"
  ON public.evaluations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = evaluations.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own evaluations"
  ON public.evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = evaluations.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update public responses"
  ON public.evaluations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = evaluations.business_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own evaluations"
  ON public.evaluations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = evaluations.user_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - FOLLOWS
-- ============================================================================

CREATE POLICY "Follows are viewable by everyone"
  ON public.follows FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can follow"
  ON public.follows FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = follows.follower_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = follows.follower_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - NOTIFICATIONS
-- ============================================================================

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = notifications.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = notifications.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLICIES - BUSINESS_POSTS
-- ============================================================================

CREATE POLICY "Business posts are viewable by everyone"
  ON public.business_posts FOR SELECT
  USING (true);

CREATE POLICY "Business owners can create posts"
  ON public.business_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_posts.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update their posts"
  ON public.business_posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_posts.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete their posts"
  ON public.business_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_posts.business_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - BUSINESS_POST_LIKES
-- ============================================================================

CREATE POLICY "Everyone can view likes"
  ON public.business_post_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON public.business_post_likes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = business_post_likes.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own likes"
  ON public.business_post_likes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = business_post_likes.profile_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - BUSINESS_POST_COMMENTS
-- ============================================================================

CREATE POLICY "Everyone can view comments"
  ON public.business_post_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.business_post_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = business_post_comments.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.business_post_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = business_post_comments.profile_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - WOORKOINS
-- ============================================================================

CREATE POLICY "Users can view their own woorkoins balance"
  ON public.woorkoins_balance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = woorkoins_balance.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage woorkoins balance"
  ON public.woorkoins_balance FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view their own transactions"
  ON public.woorkoins_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = woorkoins_transactions.profile_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - WALLET
-- ============================================================================

CREATE POLICY "Users can view their own wallet"
  ON public.freelancer_wallet FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = freelancer_wallet.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage wallets"
  ON public.freelancer_wallet FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- POLICIES - MESSAGES
-- ============================================================================

CREATE POLICY "Users can view messages for their proposals"
  ON public.proposal_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = proposal_messages.proposal_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = p.freelancer_id AND user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.projects pr
          JOIN public.profiles ON profiles.id = pr.profile_id
          WHERE pr.id = p.project_id AND profiles.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert messages for their proposals"
  ON public.proposal_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = proposal_messages.sender_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - NEGOTIATIONS
-- ============================================================================

CREATE POLICY "Users can view their negotiations"
  ON public.negotiations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = negotiations.user_id
      AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = negotiations.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create negotiations"
  ON public.negotiations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = negotiations.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their negotiation messages"
  ON public.negotiation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.negotiations n
      WHERE n.id = negotiation_messages.negotiation_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = n.user_id AND user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.business_profiles bp
          JOIN public.profiles p ON p.id = bp.profile_id
          WHERE bp.id = n.business_id AND p.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can insert negotiation messages"
  ON public.negotiation_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = negotiation_messages.sender_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - DOCUMENT VERIFICATION
-- ============================================================================

CREATE POLICY "Users can view their own verification"
  ON public.document_verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = document_verifications.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all verifications"
  ON public.document_verifications FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users and system can insert verifications"
  ON public.document_verifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = document_verifications.profile_id
      AND user_id = auth.uid()
    )
    OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Admins can update verifications"
  ON public.document_verifications FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - AI ASSISTANT
-- ============================================================================

CREATE POLICY "Users can manage their own AI conversations"
  ON public.ai_assistant_conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = ai_assistant_conversations.profile_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = ai_assistant_conversations.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all AI conversations"
  ON public.ai_assistant_conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - AI FAQ
-- ============================================================================

CREATE POLICY "FAQs are viewable by everyone"
  ON public.ai_faq FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage FAQs"
  ON public.ai_faq FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - LEGAL PAGES
-- ============================================================================

CREATE POLICY "Legal pages are viewable by everyone"
  ON public.legal_pages FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage legal pages"
  ON public.legal_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - SUPPORT
-- ============================================================================

CREATE POLICY "Users can view their own support conversations"
  ON public.support_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all support conversations"
  ON public.support_conversations FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create support conversations"
  ON public.support_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their conversations"
  ON public.support_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations
      WHERE id = support_messages.conversation_id
      AND user_id = auth.uid()
    )
    OR
    has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can send support messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_conversations
      WHERE id = support_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can send support messages"
  ON public.support_messages FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - SPAM & MODERATION
-- ============================================================================

CREATE POLICY "Users can view their own spam tracking"
  ON public.message_spam_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = message_spam_tracking.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage spam tracking"
  ON public.message_spam_tracking FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can view all blocked messages"
  ON public.blocked_messages FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert blocked messages"
  ON public.blocked_messages FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLICIES - SUBSCRIPTION PLANS
-- ============================================================================

CREATE POLICY "Subscription plans are viewable by everyone"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage subscription plans"
  ON public.subscription_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscription_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage user subscriptions"
  ON public.user_subscription_plans FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- POLICIES - BUSINESS FEATURES (Catalog, Banners, Videos, etc.)
-- ============================================================================

CREATE POLICY "Everyone can view active catalog items"
  ON public.business_catalog_items FOR SELECT
  USING (active = true);

CREATE POLICY "Business owners can manage their catalog"
  ON public.business_catalog_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_catalog_items.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active banners"
  ON public.business_banners FOR SELECT
  USING (active = true);

CREATE POLICY "Business owners can manage their banners"
  ON public.business_banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_banners.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active videos"
  ON public.business_videos FOR SELECT
  USING (active = true);

CREATE POLICY "Business owners can manage their videos"
  ON public.business_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_videos.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active links"
  ON public.business_custom_links FOR SELECT
  USING (active = true);

CREATE POLICY "Business owners can manage their links"
  ON public.business_custom_links FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_custom_links.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view certifications"
  ON public.business_certifications FOR SELECT
  USING (true);

CREATE POLICY "Business owners can manage their certifications"
  ON public.business_certifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_certifications.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view approved testimonials"
  ON public.business_testimonials FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authenticated users can create testimonials"
  ON public.business_testimonials FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage testimonials"
  ON public.business_testimonials FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can view open vacancies"
  ON public.business_job_vacancies FOR SELECT
  USING (status = 'open');

CREATE POLICY "Business owners can manage their vacancies"
  ON public.business_job_vacancies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_job_vacancies.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Applicants can create and view their applications"
  ON public.business_job_applications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_job_applications.applicant_profile_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can view applications for their vacancies"
  ON public.business_job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_job_vacancies v
      JOIN public.business_profiles bp ON bp.id = v.business_id
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE v.id = business_job_applications.vacancy_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update applications status"
  ON public.business_job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.business_job_vacancies v
      JOIN public.business_profiles bp ON bp.id = v.business_id
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE v.id = business_job_applications.vacancy_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view availability"
  ON public.business_availability FOR SELECT
  USING (active = true);

CREATE POLICY "Business owners can manage their availability"
  ON public.business_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_availability.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can create and view their appointments"
  ON public.business_appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_appointments.client_profile_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can manage appointments"
  ON public.business_appointments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_appointments.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can insert profile views"
  ON public.business_profile_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Business owners can view their profile views"
  ON public.business_profile_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_profile_views.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active features"
  ON public.business_profile_features FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage their business features"
  ON public.business_profile_features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_profile_features.business_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - BUSINESS ADMINS
-- ============================================================================

CREATE POLICY "Business owners can manage admins"
  ON public.business_admins FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.business_profiles bp
      JOIN public.profiles p ON p.id = bp.profile_id
      WHERE bp.id = business_admins.business_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view their own status"
  ON public.business_admins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = business_admins.profile_id
      AND p.user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - COUNTER PROPOSALS
-- ============================================================================

CREATE POLICY "Users can view counter proposals for their proposals"
  ON public.counter_proposals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.proposals p
      WHERE p.id = counter_proposals.proposal_id
      AND (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = p.freelancer_id AND user_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.projects pr
          JOIN public.profiles ON profiles.id = pr.profile_id
          WHERE pr.id = p.project_id AND profiles.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create counter proposals"
  ON public.counter_proposals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = counter_proposals.from_profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their counter proposals"
  ON public.counter_proposals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = counter_proposals.to_profile_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - PLATFORM SETTINGS
-- ============================================================================

CREATE POLICY "Platform settings are viewable by admins"
  ON public.platform_settings FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - GLOBAL IDENTIFIERS
-- ============================================================================

CREATE POLICY "Everyone can read identifiers"
  ON public.global_identifiers FOR SELECT
  USING (true);

CREATE POLICY "System can manage identifiers"
  ON public.global_identifiers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- POLICIES - EMAIL CHANGE VERIFICATIONS
-- ============================================================================

CREATE POLICY "Users can view their own email verifications"
  ON public.email_change_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own email verifications"
  ON public.email_change_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email verifications"
  ON public.email_change_verifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- POLICIES - MANUAL DOCUMENT SUBMISSIONS
-- ============================================================================

CREATE POLICY "Users can view their own manual submissions"
  ON public.manual_document_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = manual_document_submissions.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own manual submissions"
  ON public.manual_document_submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = manual_document_submissions.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all manual submissions"
  ON public.manual_document_submissions FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update manual submissions"
  ON public.manual_document_submissions FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - SYSTEM BLOCKS
-- ============================================================================

CREATE POLICY "Admins can manage system blocks"
  ON public.system_blocks FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own blocks"
  ON public.system_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = system_blocks.profile_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - MESSAGE UNREAD COUNTS
-- ============================================================================

CREATE POLICY "Users can view their own unread counts"
  ON public.message_unread_counts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = message_unread_counts.user_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own unread counts"
  ON public.message_unread_counts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = message_unread_counts.user_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = message_unread_counts.user_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - TYPING INDICATORS
-- ============================================================================

CREATE POLICY "Users can manage their own typing indicators"
  ON public.typing_indicators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = typing_indicators.user_id
      AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = typing_indicators.user_id
      AND user_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES - PAYMENT TRANSACTIONS
-- ============================================================================

CREATE POLICY "Users can view transactions they're involved in"
  ON public.payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE (id = payment_transactions.payer_id OR id = payment_transactions.payee_id)
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage payment transactions"
  ON public.payment_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- POLICIES - WITHDRAWAL REQUESTS
-- ============================================================================

CREATE POLICY "Users can view their own withdrawal requests"
  ON public.withdrawal_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = withdrawal_requests.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create withdrawal requests"
  ON public.withdrawal_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = withdrawal_requests.profile_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage withdrawal requests"
  ON public.withdrawal_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- ============================================================================
-- POLICIES - WALLET TRANSACTIONS
-- ============================================================================

CREATE POLICY "Users can view their own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.freelancer_wallet fw
      JOIN public.profiles p ON p.id = fw.profile_id
      WHERE fw.id = wallet_transactions.wallet_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage wallet transactions"
  ON public.wallet_transactions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FIM PARTE 2
-- ============================================================================
```

---

Continua no próximo arquivo... (Este é muito grande, vou criar em partes)

Quer que eu continue gerando as PARTES 3, 4 e 5 que incluem:
- Database Functions
- Triggers
- Storage configuration
- Edge Functions reference
- Secrets necessários

?
