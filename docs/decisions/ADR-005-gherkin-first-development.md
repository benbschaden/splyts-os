# ADR-005: Gherkin-First Development — Spec Before Code

**Status:** Decided

**Decision:** Every feature begins as a Gherkin specification (Given/When/Then format). No code is written until the spec exists and has been reviewed. Specs live in `docs/specs/`. One feature is built at a time to completion before the next begins.

**Why:** Non-developer founders directing AI tools is a new paradigm. The risk is that the AI builds the wrong thing correctly — technically sound code that solves the wrong problem. Gherkin specs force clarity before implementation. Writing "Given I am a team member / When I submit a post brief / Then the AI generates three options based on brand voice" makes requirements explicit and reviewable without reading code. The spec acts as the contract between intent and implementation.

**Alternatives considered:** Describe features in natural language, let the AI interpret and build.

**Why rejected:** Ambiguous instructions produce ambiguous code. Natural language feature descriptions leave too much to interpretation. Gherkin's structured format forces edge cases, user flows, and error states to be defined before they become bugs to fix after the fact.
