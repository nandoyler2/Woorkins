-- Tornar selfie_url opcional na tabela document_verifications
ALTER TABLE document_verifications 
ALTER COLUMN selfie_url DROP NOT NULL;