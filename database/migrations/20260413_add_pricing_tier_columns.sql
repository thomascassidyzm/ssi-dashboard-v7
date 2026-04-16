-- Add pricing_tier and is_community columns to courses table
-- These are used by the Production Overview dashboard to mark courses as free/premium/community
-- Without these columns, the pricing tier setting silently fails to persist

ALTER TABLE courses ADD COLUMN IF NOT EXISTS pricing_tier TEXT DEFAULT 'premium';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT false;

-- Add a check constraint for valid pricing tiers
ALTER TABLE courses ADD CONSTRAINT valid_pricing_tier
  CHECK (pricing_tier IN ('free', 'premium', 'community'));
