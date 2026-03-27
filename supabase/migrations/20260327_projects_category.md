# Migration: projects_category

Adds a `category TEXT` column to `projects`.

Free-text category allows grouping projects by department or function (e.g. Marketing, Engineering, HR, Product, Operations). The UI uses a `<datalist>` populated from existing categories to suggest values while allowing any free-text entry.

Uncategorized projects (NULL category) are grouped under an "(Uncategorized)" section in the UI.

**Index:** `(organization_id, category)` WHERE `deleted_at IS NULL` for fast grouped queries.
