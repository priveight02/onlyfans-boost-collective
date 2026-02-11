
-- Create storage bucket for copilot attachments (images, audio, files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('copilot-attachments', 'copilot-attachments', true, 20971520, 
  ARRAY['image/png','image/jpeg','image/webp','image/gif','audio/mpeg','audio/wav','audio/ogg','audio/mp4','audio/webm','video/mp4','video/webm','application/pdf','text/plain','text/csv']
) ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read copilot attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'copilot-attachments');

-- Authenticated users can upload
CREATE POLICY "Auth users upload copilot attachments" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'copilot-attachments' AND auth.role() = 'authenticated');

-- Authenticated users can delete their uploads
CREATE POLICY "Auth users delete copilot attachments" ON storage.objects
FOR DELETE USING (bucket_id = 'copilot-attachments' AND auth.role() = 'authenticated');
