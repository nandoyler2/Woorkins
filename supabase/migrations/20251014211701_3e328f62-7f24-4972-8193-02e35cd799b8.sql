-- Update the handle_new_user function to include CPF
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  username_value TEXT;
BEGIN
  -- Generate username from email
  username_value := LOWER(SPLIT_PART(NEW.email, '@', 1));
  
  -- Make username unique if it already exists
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = username_value) LOOP
    username_value := username_value || floor(random() * 1000)::TEXT;
  END LOOP;

  -- Insert profile with CPF if provided
  INSERT INTO public.profiles (user_id, username, full_name, cpf)
  VALUES (
    NEW.id,
    username_value,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'cpf'
  );

  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;