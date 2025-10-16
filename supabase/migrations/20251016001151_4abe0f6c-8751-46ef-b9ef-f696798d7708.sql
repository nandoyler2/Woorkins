-- Criar trigger para excluir automaticamente documentos rejeitados e seus anexos do storage
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
    -- Extrair os paths dos arquivos das URLs
    front_path := substring(NEW.document_front_url from 'identity-documents/(.+)$');
    back_path := substring(NEW.document_back_url from 'identity-documents/(.+)$');
    selfie_path := substring(NEW.selfie_url from 'identity-documents/(.+)$');
    
    -- Excluir arquivos do storage (se existirem)
    IF front_path IS NOT NULL THEN
      PERFORM storage.objects 
      FROM storage.objects 
      WHERE bucket_id = 'identity-documents' 
        AND name = front_path;
      
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
    -- pois já deletamos o registro
    RETURN NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa após UPDATE
DROP TRIGGER IF EXISTS trigger_delete_rejected_documents ON public.document_verifications;
CREATE TRIGGER trigger_delete_rejected_documents
AFTER UPDATE ON public.document_verifications
FOR EACH ROW
EXECUTE FUNCTION public.delete_rejected_documents();