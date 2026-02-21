INSERT INTO storage.buckets (id, name, public) VALUES ('copilot-media', 'copilot-media', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow service role uploads to copilot-media" ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'copilot-media');
CREATE POLICY "Public read access to copilot-media" ON storage.objects FOR SELECT USING (bucket_id = 'copilot-media');