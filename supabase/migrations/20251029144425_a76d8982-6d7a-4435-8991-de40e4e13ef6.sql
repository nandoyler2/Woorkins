-- Enable realtime for proposal_status_history table
ALTER TABLE public.proposal_status_history REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.proposal_status_history;