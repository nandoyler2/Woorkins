-- Add new fields to portfolio_items table for Behance-like features
ALTER TABLE portfolio_items
ADD COLUMN IF NOT EXISTS category text,
ADD COLUMN IF NOT EXISTS tags text[],
ADD COLUMN IF NOT EXISTS external_link text;