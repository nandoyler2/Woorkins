-- Apenas criar o que não existe ainda
-- Criando storage buckets para logos e imagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-covers', 'business-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para business-logos
CREATE POLICY "Business logos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'business-logos');
CREATE POLICY "Authenticated users can upload business logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own business logos" ON storage.objects FOR UPDATE USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own business logos" ON storage.objects FOR DELETE USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- Storage policies para business-covers
CREATE POLICY "Business covers are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'business-covers');
CREATE POLICY "Authenticated users can upload business covers" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'business-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own business covers" ON storage.objects FOR UPDATE USING (bucket_id = 'business-covers' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own business covers" ON storage.objects FOR DELETE USING (bucket_id = 'business-covers' AND auth.role() = 'authenticated');

-- Storage policies para portfolio
CREATE POLICY "Portfolio items are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Authenticated users can upload portfolio items" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'portfolio' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own portfolio items" ON storage.objects FOR UPDATE USING (bucket_id = 'portfolio' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own portfolio items" ON storage.objects FOR DELETE USING (bucket_id = 'portfolio' AND auth.role() = 'authenticated');