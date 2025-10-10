-- Fix proposal_messages RLS policy to work with profile_id instead of user_id
DROP POLICY IF EXISTS "Users can send messages for their proposals" ON proposal_messages;

CREATE POLICY "Users can send messages for their proposals"
ON proposal_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM proposals p
    JOIN profiles sender_profile ON sender_profile.id = proposal_messages.sender_id
    WHERE p.id = proposal_messages.proposal_id
    AND sender_profile.user_id = auth.uid()
    AND (
      -- Sender is the freelancer who made the proposal
      (p.freelancer_id = sender_profile.id)
      OR
      -- Sender is the project owner
      EXISTS (
        SELECT 1 FROM projects pr
        JOIN profiles owner_profile ON owner_profile.id = pr.profile_id
        WHERE pr.id = p.project_id
        AND owner_profile.user_id = auth.uid()
      )
    )
  )
);

-- Also fix the SELECT policy
DROP POLICY IF EXISTS "Users can view messages for their proposals" ON proposal_messages;

CREATE POLICY "Users can view messages for their proposals"
ON proposal_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_messages.proposal_id
    AND (
      -- User is the freelancer
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = p.freelancer_id
        AND profiles.user_id = auth.uid()
      )
      OR
      -- User is the project owner
      EXISTS (
        SELECT 1 FROM projects pr
        JOIN profiles ON profiles.id = pr.profile_id
        WHERE pr.id = p.project_id
        AND profiles.user_id = auth.uid()
      )
    )
  )
);