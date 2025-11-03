-- Função para deletar arquivos de stories do storage
CREATE OR REPLACE FUNCTION public.delete_story_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  file_path TEXT;
BEGIN
  -- Deletar arquivo de mídia se existir
  IF OLD.media_url IS NOT NULL THEN
    file_path := substring(OLD.media_url from 'stories/(.+)$');
    
    IF file_path IS NOT NULL THEN
      BEGIN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'stories' AND name = file_path;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error deleting media file: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  -- Deletar thumbnail se existir
  IF OLD.thumbnail_url IS NOT NULL THEN
    file_path := substring(OLD.thumbnail_url from 'stories/(.+)$');
    
    IF file_path IS NOT NULL THEN
      BEGIN
        DELETE FROM storage.objects 
        WHERE bucket_id = 'stories' AND name = file_path;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Error deleting thumbnail file: %', SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Criar trigger para deletar arquivos antes de deletar o story
DROP TRIGGER IF EXISTS delete_story_files_trigger ON profile_stories;
CREATE TRIGGER delete_story_files_trigger
BEFORE DELETE ON profile_stories
FOR EACH ROW
EXECUTE FUNCTION public.delete_story_files();

-- Atualizar a função de cleanup para usar o trigger automaticamente
-- (a função cleanup_expired_stories já existe e simplesmente deleta os registros,
-- o trigger vai cuidar de deletar os arquivos automaticamente)