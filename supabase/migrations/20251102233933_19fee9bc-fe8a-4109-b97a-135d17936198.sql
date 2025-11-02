-- Adicionar campos de posicionamento para text stories
ALTER TABLE profile_stories 
ADD COLUMN IF NOT EXISTS text_position_x numeric,
ADD COLUMN IF NOT EXISTS text_position_y numeric,
ADD COLUMN IF NOT EXISTS text_scale numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS media_position_x numeric,
ADD COLUMN IF NOT EXISTS media_position_y numeric,
ADD COLUMN IF NOT EXISTS media_scale numeric DEFAULT 1;