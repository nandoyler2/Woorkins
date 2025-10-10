-- Create function to get freelancer balance (for individual freelancers, not businesses)
CREATE OR REPLACE FUNCTION public.get_freelancer_balance(freelancer_profile_id uuid)
RETURNS TABLE(available numeric, pending numeric, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN p.payment_status = 'released' THEN p.net_amount ELSE 0 END), 0) as available,
    COALESCE(SUM(CASE WHEN p.payment_status = 'paid_escrow' THEN p.net_amount ELSE 0 END), 0) as pending,
    COALESCE(SUM(p.net_amount), 0) as total
  FROM proposals p
  WHERE p.freelancer_id = freelancer_profile_id 
    AND p.status = 'accepted'
    AND p.payment_status IN ('paid_escrow', 'released');
END;
$$;