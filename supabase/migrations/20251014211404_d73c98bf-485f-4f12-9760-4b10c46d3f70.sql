-- Add CPF field to profiles table
ALTER TABLE public.profiles
ADD COLUMN cpf text UNIQUE;

-- Add constraint to ensure CPF format (11 digits)
ALTER TABLE public.profiles
ADD CONSTRAINT cpf_format CHECK (cpf IS NULL OR cpf ~ '^\d{11}$');

-- Create index for better performance on CPF lookups
CREATE INDEX idx_profiles_cpf ON public.profiles(cpf) WHERE cpf IS NOT NULL;