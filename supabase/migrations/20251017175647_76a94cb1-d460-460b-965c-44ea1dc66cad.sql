-- Políticas RLS para business-logos bucket
CREATE POLICY "Usuários podem fazer upload de logos dos seus perfis"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT bp.id::text
    FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar logos dos seus perfis"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT bp.id::text
    FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar logos dos seus perfis"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT bp.id::text
    FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Logos são visíveis publicamente"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'business-logos');

-- Políticas RLS para business-covers bucket
CREATE POLICY "Usuários podem fazer upload de capas dos seus perfis"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-covers' AND
  (storage.foldername(name))[1] IN (
    SELECT bp.id::text
    FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar capas dos seus perfis"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-covers' AND
  (storage.foldername(name))[1] IN (
    SELECT bp.id::text
    FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar capas dos seus perfis"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-covers' AND
  (storage.foldername(name))[1] IN (
    SELECT bp.id::text
    FROM business_profiles bp
    JOIN profiles p ON p.id = bp.profile_id
    WHERE p.user_id = auth.uid()
  )
);

CREATE POLICY "Capas são visíveis publicamente"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'business-covers');