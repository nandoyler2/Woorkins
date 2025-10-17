-- Adicionar colunas para imagem e vídeo nos links customizados
ALTER TABLE business_custom_links
ADD COLUMN image_url TEXT,
ADD COLUMN youtube_url TEXT;