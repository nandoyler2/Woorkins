-- Fix wrong foreign key on portfolio_items.business_id (pointing to profiles)
-- 1) Drop existing FK if present
ALTER TABLE public.portfolio_items
  DROP CONSTRAINT IF EXISTS portfolio_items_business_id_fkey;

-- 2) Create correct FK to business_profiles(id)
ALTER TABLE public.portfolio_items
  ADD CONSTRAINT portfolio_items_business_id_fkey
  FOREIGN KEY (business_id)
  REFERENCES public.business_profiles(id)
  ON DELETE CASCADE;

-- 3) Ensure helpful index exists for lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_items_business_id
  ON public.portfolio_items(business_id);
