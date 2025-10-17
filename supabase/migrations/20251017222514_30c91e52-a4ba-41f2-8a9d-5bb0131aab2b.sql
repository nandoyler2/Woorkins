-- Create business_post_comments table
CREATE TABLE IF NOT EXISTS public.business_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_post_comments ENABLE ROW LEVEL SECURITY;

-- Everyone can view comments
CREATE POLICY "Everyone can view comments"
ON public.business_post_comments
FOR SELECT
USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
ON public.business_post_comments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = business_post_comments.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
ON public.business_post_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = business_post_comments.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Create business_post_likes table
CREATE TABLE IF NOT EXISTS public.business_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.business_post_likes ENABLE ROW LEVEL SECURITY;

-- Everyone can view likes
CREATE POLICY "Everyone can view likes"
ON public.business_post_likes
FOR SELECT
USING (true);

-- Authenticated users can create likes
CREATE POLICY "Authenticated users can create likes"
ON public.business_post_likes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = business_post_likes.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Users can delete their own likes
CREATE POLICY "Users can delete their own likes"
ON public.business_post_likes
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = business_post_likes.profile_id
    AND profiles.user_id = auth.uid()
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_business_post_comments_post_id ON public.business_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_business_post_likes_post_id ON public.business_post_likes(post_id);