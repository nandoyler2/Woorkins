-- Habilitar extensões necessárias para cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Criar trigger para deletar arquivos quando verificação é rejeitada
CREATE OR REPLACE FUNCTION delete_rejected_verification_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  front_path text;
  back_path text;
BEGIN
  -- Apenas quando status mudar para rejected
  IF NEW.verification_status = 'rejected' AND OLD.verification_status != 'rejected' THEN
    -- Extrair paths
    IF OLD.document_front_url IS NOT NULL THEN
      front_path := substring(OLD.document_front_url from 'identity-documents/(.+)$');
    END IF;
    
    IF OLD.document_back_url IS NOT NULL THEN
      back_path := substring(OLD.document_back_url from 'identity-documents/(.+)$');
    END IF;
    
    -- Deletar do storage
    BEGIN
      IF front_path IS NOT NULL THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'identity-documents' AND name = front_path;
      END IF;
      
      IF back_path IS NOT NULL AND back_path != front_path THEN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'identity-documents' AND name = back_path;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error deleting storage files: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_delete_rejected_verification_files ON document_verifications;
CREATE TRIGGER trigger_delete_rejected_verification_files
AFTER UPDATE OF verification_status ON document_verifications
FOR EACH ROW
EXECUTE FUNCTION delete_rejected_verification_files();

-- Criar trigger para deletar arquivos quando nova verificação é aprovada
CREATE OR REPLACE FUNCTION delete_old_verification_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_verifications RECORD;
  front_path text;
  back_path text;
BEGIN
  -- Quando uma verificação é aprovada, deletar arquivos das verificações antigas do mesmo profile
  IF NEW.verification_status = 'approved' THEN
    FOR old_verifications IN 
      SELECT id, document_front_url, document_back_url 
      FROM document_verifications 
      WHERE profile_id = NEW.profile_id 
        AND id != NEW.id
        AND verification_status = 'approved'
    LOOP
      -- Extrair paths
      IF old_verifications.document_front_url IS NOT NULL THEN
        front_path := substring(old_verifications.document_front_url from 'identity-documents/(.+)$');
      END IF;
      
      IF old_verifications.document_back_url IS NOT NULL THEN
        back_path := substring(old_verifications.document_back_url from 'identity-documents/(.+)$');
      END IF;
      
      -- Deletar arquivos antigos
      BEGIN
        IF front_path IS NOT NULL THEN
          DELETE FROM storage.objects 
          WHERE bucket_id = 'identity-documents' AND name = front_path;
        END IF;
        
        IF back_path IS NOT NULL AND back_path != front_path THEN
          DELETE FROM storage.objects 
          WHERE bucket_id = 'identity-documents' AND name = back_path;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error deleting old storage files: %', SQLERRM;
      END;
      
      -- Deletar registro antigo
      DELETE FROM document_verifications WHERE id = old_verifications.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_delete_old_verification_files ON document_verifications;
CREATE TRIGGER trigger_delete_old_verification_files
AFTER UPDATE OF verification_status ON document_verifications
FOR EACH ROW
EXECUTE FUNCTION delete_old_verification_files();

-- Agendar limpeza automática diária às 3:00 AM
SELECT cron.schedule(
  'cleanup-orphaned-documents-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url:='https://bvjulkcmzfzyfwobwlnx.supabase.co/functions/v1/cleanup-orphaned-documents',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2anVsa2NtemZ6eWZ3b2J3bG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDg4OTgsImV4cCI6MjA3NTQyNDg5OH0.xtitLE6re52Uqwnu36Rr4STTcoZNR8S0SoqOsd7sxxc"}'::jsonb
  ) as request_id;
  $$
);