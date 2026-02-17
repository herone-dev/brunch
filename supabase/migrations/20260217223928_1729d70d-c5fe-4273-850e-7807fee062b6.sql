
-- Make menu-media bucket public so images load correctly
UPDATE storage.buckets SET public = true WHERE id = 'menu-media';
