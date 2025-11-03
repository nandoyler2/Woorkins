-- Enable RLS and add policies for story_stickers to ensure stickers are visible in viewer while keeping write access restricted to owners

-- Enable RLS (safe to run if already enabled)
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'story_stickers' AND policyname = 'Public can view stickers for active stories'
  ) THEN
    DROP POLICY "Public can view stickers for active stories" ON public.story_stickers;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'story_stickers' AND policyname = 'Owners can insert stickers'
  ) THEN
    DROP POLICY "Owners can insert stickers" ON public.story_stickers;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'story_stickers' AND policyname = 'Owners can update stickers'
  ) THEN
    DROP POLICY "Owners can update stickers" ON public.story_stickers;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'story_stickers' AND policyname = 'Owners can delete stickers'
  ) THEN
    DROP POLICY "Owners can delete stickers" ON public.story_stickers;
  END IF;
END$$;

-- Allow anyone to read stickers for non-expired stories
CREATE POLICY "Public can view stickers for active stories"
ON public.story_stickers
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profile_stories ps
    WHERE ps.id = story_stickers.story_id
      AND ps.expires_at > now()
  )
);

-- Allow story owners to insert stickers
CREATE POLICY "Owners can insert stickers"
ON public.story_stickers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profile_stories ps
    JOIN public.profiles p ON p.id = ps.profile_id
    WHERE ps.id = story_stickers.story_id
      AND p.user_id = auth.uid()
  )
);

-- Allow story owners to update stickers
CREATE POLICY "Owners can update stickers"
ON public.story_stickers
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profile_stories ps
    JOIN public.profiles p ON p.id = ps.profile_id
    WHERE ps.id = story_stickers.story_id
      AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profile_stories ps
    JOIN public.profiles p ON p.id = ps.profile_id
    WHERE ps.id = story_stickers.story_id
      AND p.user_id = auth.uid()
  )
);

-- Allow story owners to delete stickers
CREATE POLICY "Owners can delete stickers"
ON public.story_stickers
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.profile_stories ps
    JOIN public.profiles p ON p.id = ps.profile_id
    WHERE ps.id = story_stickers.story_id
      AND p.user_id = auth.uid()
  )
);
