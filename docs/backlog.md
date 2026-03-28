# Feature Backlog

Future feature ideas that emerged from the project materials and rich content design session.

---

## Pyodide Data Science Environment

**Priority:** High
**Depends on:** Project materials, project chat

### Problem

Users working on data-heavy content (blog posts with analysis, journal articles with research data) need to analyze CSVs, run statistical models, and generate charts. Currently the AI can discuss data as text but cannot execute code or produce visualizations.

### Solution

Embed Pyodide (Python via WebAssembly) in the project chat interface to provide a full data science environment in the browser.

### How it works

- AI writes Python code (pandas, numpy, matplotlib, scipy) in response to user requests like "plot a bar chart of this data"
- The frontend detects code blocks tagged as executable and runs them in a sandboxed Pyodide runtime
- Plot outputs (matplotlib figures) are captured as images and rendered inline in the chat
- Users can save generated plots to project materials with one click
- Saved plots are then available as output attachments when generating content

### Technical details

- Pyodide runs entirely client-side — no server-side code execution needed
- Initial download is ~15MB (cached after first load)
- Supports: pandas, numpy, matplotlib, scipy, scikit-learn, statsmodels
- Memory limit: browser-dependent, typically handles datasets up to ~100MB
- For very large datasets (>100MB), consider server-side sandboxed execution (E2B or Docker containers) as a premium tier

### Scope

- Chat interface: detect ````python` blocks, add "Run" button, execute in Pyodide, capture output
- Plot capture: matplotlib figures → PNG → display inline → "Save to materials" button
- Data loading: project material CSVs loaded into the Pyodide environment automatically
- Error handling: syntax errors and runtime errors displayed inline, AI can help fix them

### What this replaces

Currently users must export data, analyze in Jupyter/Excel/R, create charts externally, and upload the results back to the project. This feature eliminates that round-trip entirely.

---

## Cross-Project Material Linking

**Priority:** Medium
**Depends on:** Project materials

### Problem

The same research data or reference material is often relevant to multiple projects. Currently users must upload the same file to each project separately, creating duplicates and losing synchronization.

### Solution

Allow materials from one project to be linked into another project without duplication.

### How it works

- On the Materials tab, an "Link from another project" button opens a picker
- The picker shows other projects the user has access to, and their materials
- Selecting a material creates a link (not a copy) — the original stays in its source project
- Linked materials appear in the target project's AI context alongside native materials
- Changes to the original material are reflected everywhere it's linked

### Technical details

- Extend the existing `project_items` join table:
  ```sql
  ALTER TABLE project_items DROP CONSTRAINT project_items_item_type_check;
  ALTER TABLE project_items ADD CONSTRAINT project_items_item_type_check
    CHECK (item_type IN ('output', 'material'));
  ```
- When loading materials for AI context, also load linked materials via project_items
- RLS: user must have access to both the source and target project (enforced at query time)
- UI shows linked materials with a "linked" indicator and the source project name

### Scope

- `project_items` schema extension (one migration)
- Materials query: `getProjectMaterialsWithLinked` that unions native + linked materials
- UI: "Link material" picker dialog on Materials tab
- UI: linked indicator on material cards (shows source project name)
- Prompt injection: linked materials included in `[RESEARCH MATERIALS]` same as native ones

---

## Chart Rendering in Chat (Lightweight Alternative to Pyodide)

**Priority:** Medium
**Depends on:** Project chat, project materials

### Problem

Before Pyodide is implemented, users have no way to visualize data within the system.

### Solution

AI generates Chart.js configuration JSON, and the chat interface renders charts inline.

### How it works

- When the user asks for a chart, the AI outputs a structured JSON block tagged as `chart`
- The chat interface detects the chart block and renders it using Chart.js
- Users can save the rendered chart as an image to project materials

### Technical details

- Chart.js loaded via CDN (cdn.jsdelivr.net)
- AI outputs: `{ type: 'bar'|'line'|'scatter'|'pie'|..., data: {...}, options: {...} }`
- Chat message renderer detects JSON blocks with a chart schema and renders a `<canvas>` element
- "Save chart" button uses `canvas.toBlob()` → upload to project-files bucket → create material

### Scope

- Chat message renderer: detect chart JSON blocks, render Chart.js canvas
- Chart component: `components/chat/chat-chart.tsx`
- Save to materials: blob → upload → createProjectMaterial
- Prompt instruction: system prompt for project chat tells AI to use chart JSON format when data visualization is requested
