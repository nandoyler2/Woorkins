-- Enable DELETE for negotiations (only creator or business owner can delete)
CREATE POLICY "Users can delete their own negotiations"
ON public.negotiations
FOR DELETE
USING (
  user_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.business_profiles bp
    JOIN public.profiles p ON p.id = bp.profile_id
    WHERE bp.id = negotiations.business_id AND p.user_id = auth.uid()
  )
);

-- Enable DELETE for proposals (only freelancer or project owner can delete)
CREATE POLICY "Users can delete their own proposals"
ON public.proposals
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = proposals.freelancer_id AND profiles.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.projects
    JOIN public.profiles ON profiles.id = projects.profile_id
    WHERE projects.id = proposals.project_id AND profiles.user_id = auth.uid()
  )
);

-- Enable DELETE for negotiation_messages (participants can delete)
CREATE POLICY "Users can delete messages in their negotiations"
ON public.negotiation_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.negotiations n
    WHERE n.id = negotiation_messages.negotiation_id
    AND (
      n.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.business_profiles bp
        JOIN public.profiles p ON p.id = bp.profile_id
        WHERE bp.id = n.business_id AND p.user_id = auth.uid()
      )
    )
  )
);

-- Enable DELETE for proposal_messages (participants can delete)
CREATE POLICY "Users can delete messages in their proposals"
ON public.proposal_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.proposals p
    WHERE p.id = proposal_messages.proposal_id
    AND (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = p.freelancer_id AND profiles.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.projects pr
        JOIN public.profiles ON profiles.id = pr.profile_id
        WHERE pr.id = p.project_id AND profiles.user_id = auth.uid()
      )
    )
  )
);