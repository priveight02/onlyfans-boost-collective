-- Allow authenticated users to upload to copilot-media bucket
CREATE POLICY "Authenticated users can upload to copilot-media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'copilot-media' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their own copilot-media files  
CREATE POLICY "Authenticated users can delete own copilot-media"
ON storage.objects FOR DELETE
USING (bucket_id = 'copilot-media' AND auth.role() = 'authenticated');