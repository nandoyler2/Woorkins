-- Add reply and like functionality to story comments

-- Add parent_comment_id to allow threaded replies
ALTER TABLE story_comments
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES story_comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- Create story_comment_likes table
CREATE TABLE IF NOT EXISTS story_comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES story_comments(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, profile_id)
);

-- Enable RLS
ALTER TABLE story_comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_comment_likes
CREATE POLICY "Users can view comment likes"
  ON story_comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like comments"
  ON story_comment_likes FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

CREATE POLICY "Users can unlike their own likes"
  ON story_comment_likes FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM profiles WHERE id = profile_id));

-- Function to update comment like count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE story_comments
    SET like_count = like_count + 1
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE story_comments
    SET like_count = GREATEST(0, like_count - 1)
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update like count
DROP TRIGGER IF EXISTS update_comment_like_count_trigger ON story_comment_likes;
CREATE TRIGGER update_comment_like_count_trigger
  AFTER INSERT OR DELETE ON story_comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_like_count();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_story_comments_parent ON story_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_story_comment_likes_comment ON story_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_story_comment_likes_profile ON story_comment_likes(profile_id);