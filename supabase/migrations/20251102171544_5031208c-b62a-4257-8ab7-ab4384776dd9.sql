-- Adicionar suporte para repost de stories
ALTER TABLE profile_stories 
ADD COLUMN IF NOT EXISTS original_story_id UUID REFERENCES profile_stories(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS original_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Index para melhorar performance nas queries de repost
CREATE INDEX IF NOT EXISTS idx_profile_stories_original_story_id ON profile_stories(original_story_id);

-- Atualizar coluna profile_id para permitir que seja nullable temporariamente durante inserção
-- (não é necessário alterar, já deve estar configurado corretamente)