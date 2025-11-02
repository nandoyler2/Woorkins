-- Atualizar função format_short_name para considerar todas as preposições
CREATE OR REPLACE FUNCTION format_short_name(name TEXT)
RETURNS TEXT AS $$
DECLARE
  words TEXT[];
  first_name TEXT;
  first_last_name TEXT;
  second_word TEXT;
BEGIN
  IF name IS NULL OR TRIM(name) = '' THEN
    RETURN '';
  END IF;
  
  -- Formatar o nome completo primeiro
  name := format_full_name(name);
  
  -- Dividir em palavras
  words := STRING_TO_ARRAY(name, ' ');
  
  -- Se só tem uma palavra, retornar ela
  IF ARRAY_LENGTH(words, 1) = 1 THEN
    RETURN words[1];
  END IF;
  
  first_name := words[1];
  first_last_name := words[2];
  
  -- Se o primeiro sobrenome for preposição e existir uma terceira palavra, incluir também
  IF (first_last_name IN ('de', 'da', 'do', 'dos', 'das')) AND ARRAY_LENGTH(words, 1) > 2 THEN
    second_word := words[3];
    RETURN first_name || ' ' || first_last_name || ' ' || second_word;
  END IF;
  
  RETURN first_name || ' ' || first_last_name;
END;
$$ LANGUAGE plpgsql IMMUTABLE;