-- Add admin SELECT access to negotiations, negotiation_messages, proposals, and proposal_messages so admins can view user conversations in the admin panel

-- Negotiations
CREATE POLICY "Admins can view all negotiations"
ON public.negotiations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Negotiation messages
CREATE POLICY "Admins can view all negotiation messages"
ON public.negotiation_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Proposals
CREATE POLICY "Admins can view all proposals"
ON public.proposals
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Proposal messages
CREATE POLICY "Admins can view all proposal messages"
ON public.proposal_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Optional: allow admins to view AI assistant conversations as part of history
CREATE POLICY "Admins can view all AI conversations"
ON public.ai_assistant_conversations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));