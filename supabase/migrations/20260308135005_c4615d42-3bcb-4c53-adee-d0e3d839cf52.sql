-- Create public bucket for profile photos
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-photos', 'profile-photos', true);

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload profile photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'profile-photos');

-- Allow anyone to view profile photos (public bucket)
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update profile photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete profile photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'profile-photos');