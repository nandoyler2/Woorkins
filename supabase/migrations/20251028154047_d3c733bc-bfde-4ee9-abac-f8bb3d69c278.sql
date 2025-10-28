-- Verificar e criar apenas a política de INSERT se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can upload their own business covers'
    ) THEN
        CREATE POLICY "Users can upload their own business covers"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
          bucket_id = 'business-covers' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Users can delete their own business covers'
    ) THEN
        CREATE POLICY "Users can delete their own business covers"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
          bucket_id = 'business-covers' 
          AND auth.uid()::text = (storage.foldername(name))[1]
        );
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public can view business covers'
    ) THEN
        CREATE POLICY "Public can view business covers"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'business-covers');
    END IF;
END $$;