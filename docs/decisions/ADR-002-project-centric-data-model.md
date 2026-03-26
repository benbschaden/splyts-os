# ADR-002: Project-Centric Data Model — No Folder Hierarchy

**Status:** Decided

**Decision:** Projects are the primary object. All content (documents, outputs, emails, tasks, discussions) attaches to projects via a many-to-many join table. There are no folders. Organisation is done via metadata (type, status, tags) and views, not by location.

**Why:** Folders impose a single location on items that naturally belong to multiple contexts. A brief can belong to the "Onboarding" project and the "Content Strategy" project simultaneously. Folder-based systems require duplication or force an arbitrary primary location. Project-centric systems with multi-project linking eliminate both problems. Search and views replace navigation. The system accumulates context over time instead of files in directories.

**Alternatives considered:** Folder-based organisation (Google Drive model).

**Why rejected:** Folders recreate the problem this system is designed to solve. They are static, single-location, and dumb. They fragment context. Once a system grows to hundreds of files, folders become a navigation problem rather than a solution. Projects + metadata + search scales indefinitely and aligns with how work actually happens.
