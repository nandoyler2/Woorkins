-- Maintain aggregated unread counts via triggers
-- New messages increment recipient's unread
DROP TRIGGER IF EXISTS trg_unread_on_new_negotiation_msg ON public.negotiation_messages;
CREATE TRIGGER trg_unread_on_new_negotiation_msg
AFTER INSERT ON public.negotiation_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_unread_count_on_new_message();

DROP TRIGGER IF EXISTS trg_unread_on_new_proposal_msg ON public.proposal_messages;
CREATE TRIGGER trg_unread_on_new_proposal_msg
AFTER INSERT ON public.proposal_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_unread_count_on_new_message();

-- Reading messages decrements unread
DROP TRIGGER IF EXISTS trg_unread_on_read_negotiation_msg ON public.negotiation_messages;
CREATE TRIGGER trg_unread_on_read_negotiation_msg
AFTER UPDATE OF status ON public.negotiation_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_unread_count_on_read();

DROP TRIGGER IF EXISTS trg_unread_on_read_proposal_msg ON public.proposal_messages;
CREATE TRIGGER trg_unread_on_read_proposal_msg
AFTER UPDATE OF status ON public.proposal_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_unread_count_on_read();