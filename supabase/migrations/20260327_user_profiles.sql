-- ============================================================
-- User Profiles
-- ============================================================
-- Stores public profile data for each user. Scoped to the user,
-- not the organisation — one row per auth.users entry.
-- Avatar images are stored in the 'avatars' Supabase Storage bucket.
-- ============================================================

CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  role        TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -------------------------------------------------------
-- RLS
-- -------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "user_profiles_select_own" ON user_profiles
  FOR SELECT USING (id = auth.uid());

-- Org members can read profiles of other members in their org
-- (needed to show names/avatars in shared views)
CREATE POLICY "user_profiles_select_org" ON user_profiles
  FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM organization_members
      WHERE organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Users can insert their own profile
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Users can only update their own profile
CREATE POLICY "user_profiles_update" ON user_profiles
  FOR UPDATE USING (id = auth.uid());

-- -------------------------------------------------------
-- Storage bucket for avatars
-- -------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Users can upload their own avatar
CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update/replace their own avatar
CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Anyone can view avatars (bucket is public)
CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can delete their own avatar
CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
