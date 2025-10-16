-- Limpar documentos rejeitados órfãos e resetar perfis
DO $$
DECLARE
  doc_record RECORD;
BEGIN
  -- Para cada documento rejeitado
  FOR doc_record IN 
    SELECT dv.id, dv.profile_id, dv.document_front_url, dv.document_back_url, dv.selfie_url
    FROM document_verifications dv
    WHERE dv.verification_status = 'rejected'
  LOOP
    -- Atualizar perfil
    UPDATE profiles
    SET 
      document_verified = false,
      document_verification_status = 'pending',
      updated_at = now()
    WHERE id = doc_record.profile_id;
    
    -- Deletar registro de verificação
    DELETE FROM document_verifications WHERE id = doc_record.id;
  END LOOP;
END $$;