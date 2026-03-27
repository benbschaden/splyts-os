ALTER TABLE brand_context ADD COLUMN IF NOT EXISTS brand_assets JSONB DEFAULT '{}'::jsonb NOT NULL;
