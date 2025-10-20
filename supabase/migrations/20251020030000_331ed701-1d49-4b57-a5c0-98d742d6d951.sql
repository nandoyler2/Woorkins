-- Enable RLS on portfolio_items if not already enabled
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Business owners can manage their portfolio items" ON portfolio_items;
DROP POLICY IF EXISTS "Everyone can view portfolio items" ON portfolio_items;

-- Allow business owners to manage their own portfolio items
CREATE POLICY "Business owners can manage their portfolio items"
ON portfolio_items
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = portfolio_items.business_id
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE bp.id = portfolio_items.business_id
    AND p.user_id = auth.uid()
  )
);

-- Allow everyone to view portfolio items
CREATE POLICY "Everyone can view portfolio items"
ON portfolio_items
FOR SELECT
TO public
USING (true);