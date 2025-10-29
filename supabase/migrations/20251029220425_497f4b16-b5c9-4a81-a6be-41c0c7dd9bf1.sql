-- Adicionar campo para armazenar URL da miniatura otimizada
ALTER TABLE profile_stories 
ADD COLUMN thumbnail_url TEXT;