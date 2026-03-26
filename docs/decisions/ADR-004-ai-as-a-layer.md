# ADR-004: AI as a Layer Over the System — Not the System Itself

**Status:** Decided

**Decision:** AI is a capability added on top of a structured data system, not the foundation of it. All prompts live in one file (`lib/ai/prompts.ts`). AI calls happen server-side only. Brand context is always injected into generation prompts. The system works without AI — AI makes it better.

**Why:** Systems built around AI as the core are brittle. Models change, costs change, APIs change. If the system's value depends entirely on AI functioning correctly, it is fragile. By building the data structure, relationships, and workflows first, the system has value independent of AI. AI then amplifies that value but is not load-bearing. Prompts centralised in one file means the model can be swapped or prompts improved without touching business logic.

**Alternatives considered:** AI-first architecture — use AI to structure and retrieve everything, minimal rigid data model.

**Why rejected:** Unstructured AI-first systems have no persistent context, poor reliability, and no clear upgrade path as models improve. Structured data with AI on top means the data gets better over time and AI can be upgraded without rearchitecting the system.
