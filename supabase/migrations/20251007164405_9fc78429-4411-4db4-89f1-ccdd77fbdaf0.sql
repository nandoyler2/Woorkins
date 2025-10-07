-- Create projects table for service requests
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  proposals_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposals table for freelancer proposals
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.business_profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  budget NUMERIC NOT NULL,
  delivery_days INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Projects are viewable by everyone"
ON public.projects FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create projects"
ON public.projects FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = projects.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = projects.profile_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = projects.profile_id
  AND profiles.user_id = auth.uid()
));

-- Proposals policies
CREATE POLICY "Proposals are viewable by project owner and freelancer"
ON public.proposals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = proposals.freelancer_id
    AND profiles.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.projects
    JOIN public.profiles ON profiles.id = projects.profile_id
    WHERE projects.id = proposals.project_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create proposals"
ON public.proposals FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = proposals.freelancer_id
  AND profiles.user_id = auth.uid()
));

CREATE POLICY "Freelancers can update their own proposals"
ON public.proposals FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = proposals.freelancer_id
  AND profiles.user_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to update proposals count
CREATE OR REPLACE FUNCTION update_proposals_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.projects
    SET proposals_count = proposals_count + 1
    WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.projects
    SET proposals_count = proposals_count - 1
    WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_proposals_count
AFTER INSERT OR DELETE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION update_proposals_count();