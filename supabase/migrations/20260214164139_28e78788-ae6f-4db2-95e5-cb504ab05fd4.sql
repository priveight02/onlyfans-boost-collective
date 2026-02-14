-- Create storage bucket for default assets (free pics etc)
INSERT INTO storage.buckets (id, name, public) VALUES ('default-assets', 'default-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read policy
CREATE POLICY "Public read default assets" ON storage.objects FOR SELECT USING (bucket_id = 'default-assets');

-- Only authenticated users can upload
CREATE POLICY "Authenticated upload default assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'default-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated update default assets" ON storage.objects FOR UPDATE USING (bucket_id = 'default-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated delete default assets" ON storage.objects FOR DELETE USING (bucket_id = 'default-assets' AND auth.role() = 'authenticated');