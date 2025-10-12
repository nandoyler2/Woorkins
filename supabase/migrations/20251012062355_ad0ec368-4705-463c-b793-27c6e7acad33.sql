-- Update old notifications that still point to /user/orders
UPDATE notifications
SET link = CONCAT('/messages?type=negotiation&id=', 
  SUBSTRING(link FROM 'negotiation/([a-f0-9-]+)'))
WHERE link LIKE '%/user/orders%' 
  AND type = 'negotiation'
  AND link ~ 'negotiation/[a-f0-9-]+';

-- Update old notifications that point to /my-projects for proposals
UPDATE notifications
SET link = CONCAT('/messages?type=proposal&id=', id)
WHERE link = '/my-projects'
  AND type = 'proposal';