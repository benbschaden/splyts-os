-- ============================================================
-- Expand content_type_templates with three new formats:
-- email-newsletter, podcast-script, case-study
-- ============================================================

INSERT INTO content_type_templates (slug, name, description, base_prompt) VALUES
  (
    'email-newsletter',
    'Email Newsletter',
    'Subject line, preview text, opening hook, body sections, and CTA',
    'Write an email newsletter. Structure: subject line (labelled "SUBJECT:"), preview text (labelled "PREVIEW:"), an opening paragraph that earns the read, 2–4 body sections each with a clear subheading, and a single call-to-action paragraph at the end. Write in plain prose — no heavy formatting, no walls of bullet points. The email should feel personal and direct, like it was written by a human for a human. Keep sentences short.'
  ),
  (
    'podcast-script',
    'Podcast Script',
    'Cold open, episode intro, main segments, and outro with CTA',
    'Write a podcast episode script. Structure: cold open (a compelling question, story, or statement — 20–30 seconds spoken, labelled "COLD OPEN:"), episode intro with host welcome and episode summary (labelled "INTRO:"), 3–5 main discussion segments each with a topic label in ALL CAPS, and an outro with a recap and listener CTA (labelled "OUTRO:"). Write entirely for speech — conversational, natural, no bullet lists or markdown. Include natural transition phrases between segments.'
  ),
  (
    'case-study',
    'Case Study',
    'Challenge, solution, results with data, and testimonial or quote',
    'Write a customer case study. Structure: a punchy headline that leads with the result, a brief overview (1–2 sentences), a "The Challenge" section describing the problem the customer faced, a "The Solution" section describing what was done and why, a "The Results" section with specific measurable outcomes (numbers, percentages, timeframes), and a closing section with a customer quote or next steps. Use plain prose with ## subheadings for each section. Be specific — vague outcomes are not results.'
  )
ON CONFLICT (slug) DO NOTHING;
