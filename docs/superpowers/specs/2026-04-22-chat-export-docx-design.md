# Chat Export as .docx — Design Spec

**Date:** 2026-04-22

## Summary

Allow users to type a message in any chat session describing what they want exported (e.g. "give me the email you wrote as a Google Doc"), and have the system automatically download a `.docx` file of the AI's response — ready to upload to Google Drive.

## User Flow

1. User asks AI to produce some content (email, strategy, report, etc.)
2. AI responds with the content
3. User types a follow-up like "give me that as a Google Doc" or "export the email as a doc"
4. System detects export intent client-side (regex match)
5. Message is sent to the API with `export_doc: true` flag
6. Server appends export instruction to the system prompt so the AI responds with clean content only (no preamble)
7. AI response is displayed in chat AND triggers a `.docx` download automatically
8. Filename is the session title + `.docx`

## Intent Detection

Client-side regex patterns that trigger export mode:
- Any message containing "google doc", "word doc", ".docx"
- Phrases like "as a doc", "as a document", "export as doc", "download as doc", "in doc format"

Case-insensitive. Matched before sending. Does not modify the displayed user message.

## System Prompt Instruction (Export Mode)

When `export_doc: true`, this line is appended to the system prompt before calling the AI:

> EXPORT MODE: The user wants to download your response as a document. Respond with ONLY the clean content they want exported. No preamble, no "here is the document", no explanation — start directly with the content.

## .docx Generation

- Uses the `docx` npm package, executed client-side in the browser
- Parses the AI's markdown response into Word document elements:
  - `# ` → Heading 1
  - `## ` → Heading 2  
  - `### ` → Heading 3
  - `- ` / `* ` → bullet list items
  - `1. ` etc → numbered list items
  - `**text**` / `__text__` → bold runs
  - `*text*` / `_text_` → italic runs
  - Empty lines → paragraph breaks
  - Everything else → body paragraph
- `Packer.toBlob()` creates the file in memory
- Browser download triggered via `<a>` with object URL
- Filename: `{session.title}.docx`

## Files Touched

| File | Change |
|------|--------|
| `lib/export/docx.ts` | New — markdown-to-docx conversion + download trigger |
| `lib/ai/prompts.ts` | Add `exportDoc?: boolean` param to `buildChatSystemPrompt` |
| `app/api/chat/sessions/[id]/messages/route.ts` | Accept `export_doc` in schema, pass to prompt builder, return `exportDoc` in response |
| `components/chat/chat-interface.tsx` | Detect intent, send flag, auto-download on response |

## No Database Changes

No schema changes. No new API routes. No Google account connection required.

## Constraints

- Export only triggers on the AI response to the export-intent message (not historical messages)
- The AI response is still saved to the database and displayed in chat normally
- If the user's message is just asking to export but references a previous response, the AI uses conversation history to know what to return
