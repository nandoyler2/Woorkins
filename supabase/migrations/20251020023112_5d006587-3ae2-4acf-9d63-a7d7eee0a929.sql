-- Adicionar campos para mídia e categoria às avaliações
ALTER TABLE evaluations
ADD COLUMN IF NOT EXISTS media_urls text[],
ADD COLUMN IF NOT EXISTS media_types text[],
ADD COLUMN IF NOT EXISTS evaluation_category text DEFAULT 'positive' CHECK (evaluation_category IN ('positive', 'complaint'));

-- Atualizar avaliações existentes baseado no rating
UPDATE evaluations
SET evaluation_category = CASE
  WHEN rating <= 3 THEN 'complaint'
  ELSE 'positive'
END
WHERE evaluation_category IS NULL;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_evaluations_category ON evaluations(evaluation_category);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_category ON evaluations(user_id, evaluation_category);