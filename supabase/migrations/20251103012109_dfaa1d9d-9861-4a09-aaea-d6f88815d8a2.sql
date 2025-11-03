-- Create hub_articles table
CREATE TABLE public.hub_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  views_count INTEGER DEFAULT 0,
  featured BOOLEAN DEFAULT false,
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_hub_articles_slug ON public.hub_articles(slug);
CREATE INDEX idx_hub_articles_published ON public.hub_articles(published, published_at DESC);
CREATE INDEX idx_hub_articles_category ON public.hub_articles(category);
CREATE INDEX idx_hub_articles_featured ON public.hub_articles(featured, published);
CREATE INDEX idx_hub_articles_author ON public.hub_articles(author_profile_id);

-- Enable RLS
ALTER TABLE public.hub_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view published articles"
  ON public.hub_articles
  FOR SELECT
  USING (published = true);

CREATE POLICY "Admins can view all articles"
  ON public.hub_articles
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create articles"
  ON public.hub_articles
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update articles"
  ON public.hub_articles
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete articles"
  ON public.hub_articles
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_hub_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hub_articles_updated_at
  BEFORE UPDATE ON public.hub_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_hub_articles_updated_at();