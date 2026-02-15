-- Create email-assets bucket for logo
INSERT INTO storage.buckets (id, name, public) VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read
CREATE POLICY "Public read email assets" ON storage.objects FOR SELECT USING (bucket_id = 'email-assets');

-- Allow authenticated upload
CREATE POLICY "Auth upload email assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'email-assets' AND auth.role() = 'authenticated');