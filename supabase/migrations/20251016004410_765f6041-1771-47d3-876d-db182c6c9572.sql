-- Corrigir inconsistências onde o perfil está verificado mas o documento está rejeitado
UPDATE public.profiles p
SET 
  document_verified = false,
  document_verification_status = 'pending'
WHERE p.document_verified = true
  AND EXISTS (
    SELECT 1 
    FROM public.document_verifications dv 
    WHERE dv.profile_id = p.id 
      AND dv.verification_status = 'rejected'
  );

-- Melhorar a trigger de exclusão de documentos rejeitados
CREATE OR REPLACE FUNCTION public.delete_rejected_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  front_path text;
  back_path text;
  selfie_path text;
BEGIN
  -- Somente processar quando o status mudar para 'rejected'
  IF NEW.verification_status = 'rejected' AND OLD.verification_status != 'rejected' THEN
    -- Atualizar o perfil PRIMEIRO para evitar inconsistências
    UPDATE public.profiles
    SET 
      document_verified = false,
      document_verification_status = 'pending',
      updated_at = now()
    WHERE id = NEW.profile_id;
    
    -- Extrair os paths dos arquivos das URLs
    front_path := substring(NEW.document_front_url from 'identity-documents/(.+)$');
    back_path := substring(NEW.document_back_url from 'identity-documents/(.+)$');
    selfie_path := substring(NEW.selfie_url from 'identity-documents/(.+)$');
    
    -- Excluir arquivos do storage (se existirem)
    IF front_path IS NOT NULL THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'identity-documents' 
        AND name = front_path;
    END IF;
    
    IF back_path IS NOT NULL AND back_path != front_path THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'identity-documents' 
        AND name = back_path;
    END IF;
    
    IF selfie_path IS NOT NULL THEN
      DELETE FROM storage.objects 
      WHERE bucket_id = 'identity-documents' 
        AND name = selfie_path;
    END IF;
    
    -- Excluir o registro da verificação
    DELETE FROM public.document_verifications WHERE id = NEW.id;
    
    -- Retornar NULL para cancelar a operação UPDATE original
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$;