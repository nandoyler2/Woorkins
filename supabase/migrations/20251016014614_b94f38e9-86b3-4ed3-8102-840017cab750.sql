-- Gerar usernames únicos para usuários que não têm
DO $$
DECLARE
  user_record RECORD;
  base_username TEXT;
  final_username TEXT;
  counter INTEGER;
BEGIN
  FOR user_record IN 
    SELECT id, user_id, username, full_name 
    FROM public.profiles 
    WHERE username IS NULL OR username = ''
  LOOP
    -- Tentar extrair do email primeiro
    SELECT LOWER(SPLIT_PART(email, '@', 1))
    INTO base_username
    FROM auth.users
    WHERE id = user_record.user_id;
    
    -- Se não houver email, usar do nome
    IF base_username IS NULL OR base_username = '' THEN
      base_username := LOWER(REGEXP_REPLACE(COALESCE(user_record.full_name, 'user'), '[^a-zA-Z0-9]', '', 'g'));
    END IF;
    
    -- Garantir que não está vazio
    IF base_username IS NULL OR base_username = '' THEN
      base_username := 'user';
    END IF;
    
    -- Verificar disponibilidade e adicionar número se necessário
    final_username := base_username;
    counter := 1;
    
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != user_record.id) LOOP
      final_username := base_username || counter::TEXT;
      counter := counter + 1;
    END LOOP;
    
    -- Atualizar o username
    UPDATE public.profiles
    SET username = final_username
    WHERE id = user_record.id;
  END LOOP;
END $$;

-- Adicionar constraint NOT NULL após garantir que todos têm username
ALTER TABLE public.profiles ALTER COLUMN username SET NOT NULL;