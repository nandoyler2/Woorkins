-- Alterar o valor padrão de average_rating para 5.0
ALTER TABLE profiles 
ALTER COLUMN average_rating SET DEFAULT 5.0;

-- Atualizar perfis existentes que têm rating 0 e não têm avaliações para 5.0
UPDATE profiles 
SET average_rating = 5.0
WHERE average_rating = 0 
  AND (total_reviews = 0 OR total_reviews IS NULL);