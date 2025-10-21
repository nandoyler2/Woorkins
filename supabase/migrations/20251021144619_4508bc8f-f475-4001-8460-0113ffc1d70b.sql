-- Criar bucket para posts de usuários
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-media', 'user-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para user-media bucket
CREATE POLICY "Usuários podem fazer upload de suas próprias mídias"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Mídias de posts são públicas"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-media');

CREATE POLICY "Usuários podem atualizar suas próprias mídias"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem deletar suas próprias mídias"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-media' AND
  (storage.foldername(name))[1] = auth.uid()::text
);