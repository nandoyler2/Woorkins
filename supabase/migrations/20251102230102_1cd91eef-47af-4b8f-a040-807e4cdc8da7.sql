-- Adicionar coluna scale na tabela story_stickers
ALTER TABLE public.story_stickers 
ADD COLUMN IF NOT EXISTS scale numeric DEFAULT 1;