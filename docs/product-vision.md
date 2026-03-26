# Product Vision — Company OS

> A project-centric operating system that turns all company inputs (emails, data, docs, discussions) into clear outputs (content, decisions, insights) with AI assistance.

**Projects → Inputs → Context → Outputs → Workflows → Intelligence**

---

## V1: Marketing Content Engine

*The thing that has immediate daily value.*

- **Projects** — create marketing content projects (the core object everything attaches to)
- **Brand context** — configure company voice, tone, pillars, target audience (stored per org)
- **AI content generation** — social posts, video scripts, email drafts from brand context + brief
- **Output library** — all generated content saved to the project, searchable, editable
- **External API** — read-only endpoints so hub-os can display brand context and recent outputs
- **Team access** — multiple users can log in, see projects, generate content
- **Roles** — basic admin/member distinction (admin configures brand, member generates)

**Not in V1:** documents, file uploads, email, calendar, tasks, chat, metrics

---

## Phase 2: Document Management

*Replace Google Drive. All company files live here, organized by projects — not folders.*

- **File uploads** — attach documents to one or more projects (not folders)
- **Metadata** — every document has type (brief, report, research, asset), status, tags
- **Multi-project linking** — a document can belong to multiple projects
- **Unassigned bucket** — for raw uploads not yet linked to a project
- **AI search** — natural language search across all documents
- **AI summarization** — summarize any document on demand
- **View controls** — admin can restrict downloads, view-only in dashboard
- **Views replace folders** — "show all briefs," "show everything for Project X," "show recent uploads"

---

## Phase 3: Input Integration

*Reduce manual work. Everything flows in automatically.*

- **Email ingestion** — connect company Gmail/Outlook, emails flow into the system
- **Auto-classification** — AI suggests which project an email belongs to
- **Splyts app DB integration** — read-only connection to existing Splyts product database
- **KPI dashboard** — live metrics from the app (user growth, engagement, subscriptions)
- **File parsing** — extract text from uploaded PDFs, docs, spreadsheets for search/AI

---

## Phase 4: Context Engine

*The system starts to "understand" your company.*

- **Project memory** — rolling AI summary of each project (auto-updated as content is added)
- **Related content linking** — AI surfaces related items across projects
- **Entity extraction** — automatically identify people, features, themes, metrics across content
- **Timeline view** — see everything that happened in a project chronologically
- **Deduplication** — AI detects and flags duplicate information
- **"What's happening?" view** — cross-project summary of recent activity and key changes

---

## Phase 5: Workflows & Tasks

*Reduce coordination overhead. Clear execution.*

- **Project states** — active, blocked, on hold, completed
- **Tasks** — lightweight, always linked to a project, assignable to team members
- **AI task suggestions** — AI proposes tasks from project context ("brief needs review," "KPI report due")
- **Approval flows** — content approval before publishing, decision sign-off
- **Advanced permissions** — per-user, per-project access settings
- **Admin dashboard** — manage team, view activity, audit trail
- **Notifications** — in-app alerts for assignments, approvals, mentions

---

## Phase 6: Discussions

*Project-scoped conversations. Not Slack — better.*

- **Discussions** — threaded conversations attached to projects (not a general chat room)
- **AI summarization** — every discussion auto-summarized, key decisions extracted
- **Linked to decisions** — mark a discussion conclusion as a "decision" that lives on the project
- **Mentions** — tag team members, reference documents or outputs
- **Searchable** — all discussions indexed and searchable alongside documents and outputs
- **AI context** — AI has full access to discussions when generating content or answering questions

---

## Phase 7: Intelligence Layer

*The system becomes proactive.*

- **Priority scoring** — AI ranks what matters most across projects
- **Anomaly detection** — flags when KPIs drop, deadlines approach, projects stall
- **Cross-project insights** — patterns the team might miss (themes, recurring blockers)
- **Trend detection** — track how metrics and output quality change over time
- **Suggested actions** — "Project X hasn't been updated in 2 weeks," "KPI Y dropped 15%"
- **Strategy suggestions** — AI recommends adjustments based on accumulated context

---

## Future / Optional

- **Native web app** — polished experience beyond internal dashboard
- **Mobile app** — iOS/Android for on-the-go access

---

## Design Principles

1. **Projects are the center** — everything attaches to projects
2. **Outputs are the goal** — the system exists to produce content, decisions, insights
3. **Inputs are secondary** — emails, files, data are just inputs to be organized
4. **AI is a layer, not the system** — build workflows that use AI, not "AI features"
5. **Start manual, automate later** — wrong automation early = broken system
6. **No folders** — metadata, views, and search replace folder navigation
7. **Full context, one system** — the power is everything in one place, not scattered across tools
