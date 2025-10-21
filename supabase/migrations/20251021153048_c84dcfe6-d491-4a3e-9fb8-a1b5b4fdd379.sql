-- Remover política existente
DROP POLICY IF EXISTS "Users can manage their own portfolio items" ON public.user_portfolio_items;

-- Criar políticas separadas para melhor controle
CREATE POLICY "Users can view their own portfolio items"
ON public.user_portfolio_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolio_items.profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own portfolio items"
ON public.user_portfolio_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolio_items.profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own portfolio items"
ON public.user_portfolio_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolio_items.profile_id
    AND profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolio_items.profile_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own portfolio items"
ON public.user_portfolio_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = user_portfolio_items.profile_id
    AND profiles.user_id = auth.uid()
  )
);