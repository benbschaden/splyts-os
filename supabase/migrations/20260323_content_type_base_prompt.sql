-- ============================================================
-- Migration: add base_prompt to content_type_templates
-- Adds structural AI prompt foundation to each template,
-- and updates seed data with real defaults.
-- ============================================================

ALTER TABLE content_type_templates
  ADD COLUMN base_prompt TEXT NOT NULL DEFAULT '';

UPDATE content_type_templates SET base_prompt =
  'Write a short social media post. Structure: one strong hook sentence that stops the scroll, 2–3 supporting sentences, one call to action. Plain prose — no bullet points, no markdown, no hashtags unless the custom rules say otherwise. Optimised to be read in a single screen scroll.'
WHERE slug = 'social-post';

UPDATE content_type_templates SET base_prompt =
  'Write a video script for a short-form or long-form video. Structure: cold open (pattern interrupt, 10–15 seconds spoken), 3–4 content sections each with a clear header and spoken-word prose beneath, closing CTA (10 seconds). Format the output with section labels in ALL CAPS followed by the spoken content. Write for speech — no bullet lists, no markdown syntax.'
WHERE slug = 'video-script';

UPDATE content_type_templates SET base_prompt =
  'Write a long-form article or post. Structure: a strong headline, an opening paragraph that frames the problem or promise, 3–5 body sections each with a subheading, and a conclusion with a clear takeaway or call to action. Use plain prose. Subheadings may use markdown (##) if the custom rules do not specify otherwise.'
WHERE slug = 'long-form';
