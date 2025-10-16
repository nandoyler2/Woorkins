-- Melhorar a função de exclusão de documentos rejeitados
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
  IF NEW.verification_status = 'rejected' AND (OLD.verification_status IS NULL OR OLD.verification_status != 'rejected') THEN
    
    -- Extrair os paths dos arquivos das URLs
    IF NEW.document_front_url IS NOT NULL THEN
      front_path := substring(NEW.document_front_url from 'identity-documents/(.+)$');
    END IF;
    
    IF NEW.document_back_url IS NOT NULL THEN
      back_path := substring(NEW.document_back_url from 'identity-documents/(.+)$');
    END IF;
    
    IF NEW.selfie_url IS NOT NULL THEN
      selfie_path := substring(NEW.selfie_url from 'identity-documents/(.+)$');
    END IF;
    
    -- Excluir arquivos do storage
    BEGIN
      IF front_path IS NOT NULL THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'identity-documents' AND name = front_path;
      END IF;
      
      IF back_path IS NOT NULL AND back_path != front_path THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'identity-documents' AND name = back_path;
      END IF;
      
      IF selfie_path IS NOT NULL THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'identity-documents' AND name = selfie_path;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE WARNING 'Error deleting storage files: %', SQLERRM;
    END;
    
    -- Garantir que o perfil está com status correto
    UPDATE public.profiles
    SET 
      document_verified = false,
      document_verification_status = 'pending',
      updated_at = now()
    WHERE id = NEW.profile_id;
    
    -- Excluir o registro da verificação
    DELETE FROM public.document_verifications WHERE id = NEW.id;
    
    -- Retornar NULL para cancelar a operação UPDATE original
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Garantir que a trigger existe
DROP TRIGGER IF EXISTS trigger_delete_rejected_documents ON public.document_verifications;
CREATE TRIGGER trigger_delete_rejected_documents
  AFTER UPDATE ON public.document_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_rejected_documents();