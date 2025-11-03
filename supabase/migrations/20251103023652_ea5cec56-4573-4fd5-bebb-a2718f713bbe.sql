-- Create materialized view for admin users with all related data
CREATE MATERIALIZED VIEW admin_users_view AS
SELECT 
  p.id,
  p.user_id,
  p.username,
  p.full_name,
  p.email,
  p.avatar_url,
  p.document_verified,
  p.created_at,
  p.updated_at,
  p.deleted,
  ur.role,
  COALESCE(wb.balance, 0) as woorkoins_balance,
  (
    SELECT COUNT(*) 
    FROM system_blocks sb 
    WHERE sb.profile_id = p.id 
    AND (sb.is_permanent = true OR sb.blocked_until > now())
  ) as active_blocks_count,
  (
    SELECT verification_status 
    FROM document_verifications dv 
    WHERE dv.profile_id = p.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) as document_verification_status,
  (
    SELECT plan_type
    FROM user_subscription_plans usp
    WHERE usp.user_id = p.user_id
    AND usp.is_active = true
    ORDER BY created_at DESC
    LIMIT 1
  ) as current_plan
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
LEFT JOIN woorkoins_balance wb ON wb.profile_id = p.id
WHERE p.deleted IS NOT TRUE
ORDER BY p.created_at DESC;

-- Create index for faster queries
CREATE UNIQUE INDEX idx_admin_users_view_id ON admin_users_view(id);
CREATE INDEX idx_admin_users_view_username ON admin_users_view(username);
CREATE INDEX idx_admin_users_view_email ON admin_users_view(email);
CREATE INDEX idx_admin_users_view_role ON admin_users_view(role);
CREATE INDEX idx_admin_users_view_created_at ON admin_users_view(created_at);

-- Function to refresh the materialized view
CREATE OR REPLACE FUNCTION refresh_admin_users_view()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY admin_users_view;
END;
$$;

-- Create indexes for better performance on frequently queried tables
CREATE INDEX IF NOT EXISTS idx_support_conversations_status ON support_conversations(status);
CREATE INDEX IF NOT EXISTS idx_document_verifications_status ON document_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_system_blocks_profile_id ON system_blocks(profile_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_pending_projects_status ON pending_projects(moderation_status);
CREATE INDEX IF NOT EXISTS idx_blocked_messages_created_at ON blocked_messages(created_at DESC);