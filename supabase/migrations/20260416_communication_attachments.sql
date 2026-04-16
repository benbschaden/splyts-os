-- Add attachment_paths to contact_communications.
-- Stores an array of Supabase Storage paths (not public URLs) for images
-- attached to a communication. Signed URLs are generated server-side on read.
--
-- Storage bucket: communication-attachments (private, must be created manually in Supabase dashboard)
-- Path convention: {org_id}/{comm_id}/{uuid}.{ext}

ALTER TABLE public.contact_communications
  ADD COLUMN IF NOT EXISTS attachment_paths TEXT[] NOT NULL DEFAULT '{}';
