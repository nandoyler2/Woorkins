DO $$
DECLARE
BEGIN
  -- 1) Remover dados órfãos de tabelas relacionadas a perfis já removidos
  
  -- Conversas do assistente
  DELETE FROM public.ai_assistant_conversations c
  WHERE c.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Mensagens bloqueadas
  DELETE FROM public.blocked_messages bm
  WHERE bm.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Contra-propostas
  DELETE FROM public.counter_proposals cp
  WHERE cp.from_profile_id NOT IN (SELECT id FROM public.profiles)
     OR cp.to_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Mensagens de disputa
  DELETE FROM public.dispute_messages dm
  WHERE dm.sender_id NOT IN (SELECT id FROM public.profiles);

  -- Verificações de documento
  DELETE FROM public.document_verifications dv
  WHERE dv.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Avaliações
  DELETE FROM public.evaluations e
  WHERE e.author_profile_id NOT IN (SELECT id FROM public.profiles)
     OR e.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Follows
  DELETE FROM public.follows f
  WHERE f.follower_id NOT IN (SELECT id FROM public.profiles)
     OR f.following_id NOT IN (SELECT id FROM public.profiles);

  -- Carteira do freelancer
  DELETE FROM public.freelancer_wallet fw
  WHERE fw.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Submissões manuais de documentos
  DELETE FROM public.manual_document_submissions mds
  WHERE mds.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Rastreamento de spam
  DELETE FROM public.message_spam_tracking mst
  WHERE mst.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Contadores de não lidos
  DELETE FROM public.message_unread_counts muc
  WHERE muc.user_id NOT IN (SELECT id FROM public.profiles);

  -- Violações de moderação
  DELETE FROM public.moderation_violations mv
  WHERE mv.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Mensagens de negociação
  DELETE FROM public.negotiation_messages nm
  WHERE nm.sender_id NOT IN (SELECT id FROM public.profiles);

  -- Negociações (por perfil alvo)
  DELETE FROM public.negotiations n
  WHERE n.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Notificações
  DELETE FROM public.notifications n
  WHERE n.user_id NOT IN (SELECT id FROM public.profiles);

  -- Configurações de pagamento
  DELETE FROM public.payment_settings ps
  WHERE ps.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Portfolio (para user e business)
  DELETE FROM public.portfolio_items pi
  WHERE (pi.profile_id IS NOT NULL AND pi.profile_id NOT IN (SELECT id FROM public.profiles))
     OR (pi.business_id IS NOT NULL AND pi.business_id NOT IN (SELECT id FROM public.profiles));

  -- Admins de perfil
  DELETE FROM public.profile_admins pa
  WHERE pa.profile_id NOT IN (SELECT id FROM public.profiles)
     OR pa.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Agendamentos
  DELETE FROM public.profile_appointments pa
  WHERE pa.client_profile_id NOT IN (SELECT id FROM public.profiles)
     OR pa.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Disponibilidade
  DELETE FROM public.profile_availability pav
  WHERE pav.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Banners
  DELETE FROM public.profile_banners pb
  WHERE pb.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Catálogo
  DELETE FROM public.profile_catalog_items pci
  WHERE pci.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Certificações
  DELETE FROM public.profile_certifications pc
  WHERE pc.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Links customizados
  DELETE FROM public.profile_custom_links pcl
  WHERE pcl.target_profile_id NOT IN (SELECT id FROM public.profiles);

  -- Features de perfil
  DELETE FROM public.profile_features pf
  WHERE pf.profile_id NOT IN (SELECT id FROM public.profiles);

  -- Candidaturas a vagas
  DELETE FROM public.profile_job_applications pja
  WHERE pja.applicant_profile_id NOT IN (SELECT id FROM public.profiles);

  -- 2) Liberar identificadores globais (usernames/ slugs) de perfis que não existem mais
  DELETE FROM public.global_identifiers gi
  WHERE gi.owner_id NOT IN (SELECT id FROM public.profiles);

  -- 3) Limpar arquivos do Storage associados a perfis removidos
  -- Estratégia: apagar objetos nos buckets de usuário cuja "name" contenha um UUID
  -- e esse UUID não exista mais em public.profiles
  
  -- Coletar UUIDs presentes nos nomes dos arquivos dos buckets relevantes
  CREATE TEMP TABLE tmp_storage_uuids AS
  SELECT DISTINCT
    (regexp_matches(name, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})'))[1]::uuid AS file_uuid,
    bucket_id
  FROM storage.objects
  WHERE bucket_id IN (
    'avatars','profile-photos','user-covers','user-media',
    'business-logos','business-covers','business-media',
    'portfolio','message-attachments','identity-documents','support-attachments'
  )
  AND name ~* '([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})';

  -- Apagar arquivos cujo UUID não pertence mais a perfis existentes
  DELETE FROM storage.objects so
  USING tmp_storage_uuids t
  WHERE so.bucket_id = t.bucket_id
    AND so.name ~* t.file_uuid::text
    AND t.file_uuid NOT IN (SELECT id FROM public.profiles);

  -- 4) Opcional: limpar objetos de documentos de identidade órfãos (fallback extra)
  DELETE FROM storage.objects so
  WHERE so.bucket_id = 'identity-documents'
    AND NOT EXISTS (
      SELECT 1
      FROM public.document_verifications dv
      WHERE dv.document_front_url ILIKE '%' || so.name || '%'
         OR dv.document_back_url ILIKE '%' || so.name || '%'
         OR dv.selfie_url ILIKE '%' || so.name || '%'
    );
END$$;