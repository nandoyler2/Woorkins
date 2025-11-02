-- Função para atualizar o updated_at de um story quando recebe interação
CREATE OR REPLACE FUNCTION update_story_on_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profile_stories
  SET updated_at = NOW()
  WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar story quando recebe curtida
DROP TRIGGER IF EXISTS trigger_update_story_on_like ON story_likes;
CREATE TRIGGER trigger_update_story_on_like
  AFTER INSERT ON story_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_story_on_interaction();

-- Trigger para atualizar story quando recebe comentário
DROP TRIGGER IF EXISTS trigger_update_story_on_comment ON story_comments;
CREATE TRIGGER trigger_update_story_on_comment
  AFTER INSERT ON story_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_story_on_interaction();