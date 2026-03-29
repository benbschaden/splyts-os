UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'text/markdown')
WHERE id = 'project-files'
  AND NOT ('text/markdown' = ANY(allowed_mime_types));
