-- Criar bucket para certificados Efí Pay
INSERT INTO storage.buckets (id, name, public)
VALUES ('efi-certificates', 'efi-certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Política: Admins podem fazer upload de certificados
CREATE POLICY "Admins can upload Efí certificates"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'efi-certificates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Admins podem visualizar certificados
CREATE POLICY "Admins can view Efí certificates"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'efi-certificates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Admins podem atualizar certificados
CREATE POLICY "Admins can update Efí certificates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'efi-certificates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política: Admins podem deletar certificados
CREATE POLICY "Admins can delete Efí certificates"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'efi-certificates' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Adicionar campo para o certificado público mTLS
ALTER TABLE payment_gateway_config
ADD COLUMN IF NOT EXISTS efi_mtls_cert_path text;