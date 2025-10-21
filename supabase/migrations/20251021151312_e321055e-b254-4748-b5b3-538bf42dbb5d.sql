-- Create business_whatsapp_config table
CREATE TABLE IF NOT EXISTS public.business_whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  welcome_message TEXT DEFAULT 'Olá! Gostaria de conversar com você.',
  auto_open BOOLEAN DEFAULT false,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Create user_whatsapp_config table
CREATE TABLE IF NOT EXISTS public.user_whatsapp_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  welcome_message TEXT DEFAULT 'Olá! Gostaria de conversar com você.',
  auto_open BOOLEAN DEFAULT false,
  questions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.business_whatsapp_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_whatsapp_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for business_whatsapp_config
CREATE POLICY "Anyone can view business WhatsApp config"
ON public.business_whatsapp_config
FOR SELECT
USING (true);

CREATE POLICY "Business owner can manage their WhatsApp config"
ON public.business_whatsapp_config
FOR ALL
USING (
  business_id IN (
    SELECT id FROM public.business_profiles
    WHERE profile_id IN (
      SELECT id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  )
);

-- RLS Policies for user_whatsapp_config
CREATE POLICY "Anyone can view user WhatsApp config"
ON public.user_whatsapp_config
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own WhatsApp config"
ON public.user_whatsapp_config
FOR ALL
USING (user_id IN (
  SELECT id FROM public.profiles
  WHERE user_id = auth.uid()
));

-- Add triggers for updated_at
CREATE TRIGGER update_business_whatsapp_config_updated_at
BEFORE UPDATE ON public.business_whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_whatsapp_config_updated_at
BEFORE UPDATE ON public.user_whatsapp_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();