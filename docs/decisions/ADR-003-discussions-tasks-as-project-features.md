# ADR-003: Discussions and Tasks as Project Features — Not Standalone Products

**Status:** Decided

**Decision:** Team chat and task management are built as features of the project system, not as standalone replacements for Slack and Linear. Discussions are threaded conversations attached to projects. Tasks are lightweight items always linked to a project.

**Why:** The power of this system is full context in one place. If the team is in Slack for chat, Linear for tasks, and this system for content, the AI only has a fraction of the picture. Deep integration with the project data model makes every feature more valuable — a task created from a discussion is automatically linked to the project's full context. Native features with shared data are fundamentally more powerful than integrations with external tools.

**Alternatives considered:** Integrate with Slack and Linear via API rather than building native features.

**Why rejected:** Third-party integrations create dependency on external systems, data fragmentation, and context gaps. Data that lives in Slack is not available to the AI in this system. Integration gives the appearance of connectivity but not the reality of it. Building native features keeps all data in one place where the AI and search can access everything.
