# Feature: Discovery Chunked Analysis

Long discovery entries (e.g. 60–90 minute interview transcripts) and cross-study
synthesis of 10–20 such entries cannot be safely analysed by sending the full
text to one LLM call. This feature introduces a chunked map → verify → reduce
pipeline so every word of every transcript is processed and every claim made
by the AI is grounded in a verbatim quote that can be string-matched against
the source.

The two flows that change are:

1. **Per-entry analyse** — `POST /api/discovery-entries/analyse`
   was a single Anthropic call with `raw_content.slice(0, 30000)`. It now
   chunks the transcript, runs an extraction call per chunk in parallel,
   verifies every returned quote against the chunk it came from (drops
   unverifiable quotes), then reduces chunk findings into a single entry
   digest (sentiment, tags, key quotes, JTBD, WTP, severity, adoption,
   plus a Markdown analysis).

2. **Study synthesis** — `POST /api/discovery-studies/[id]/synthesise`
   was sending a 500-character excerpt of each entry to one Anthropic call.
   It now reads each entry's stored chunks + verified findings, builds a
   per-entry digest, and synthesises across digests. A `synthesis run`
   row is written that records which chunks were included, which model
   ran, and how many quotes were dropped during verification.

## Hard guarantees

- **Full coverage**: Every byte of `discovery_entries.raw_content` is sent
  to an LLM at least once during analysis (via its chunk).
- **No invented quotes**: A quote returned by the LLM that is not present
  verbatim in its source chunk is dropped before it reaches the user.
- **Provenance**: Every claim in a study synthesis can be traced back to
  one or more chunks of one or more entries via the synthesis run record.

Feature: Discovery Chunked Analysis

  # ---- Per-entry analyse ----

  Scenario: Admin analyses a long interview transcript
    Given I have a discovery entry with a transcript longer than 30,000 characters
    When I click "Analyse with AI" in the entry drawer
    Then the transcript is split into chunks of at most 12,000 characters with 1,000 character overlap
    And every chunk is sent to an extraction LLM call in parallel
    And the chunk count and progress are visible while analysis is running
    And every extracted quote is verified against its source chunk via string match
    And quotes that fail verification are dropped before being shown
    And the entry receives a Markdown analysis grounded only in verified findings
    And the entry's structured fields (sentiment, tags, key quotes, JTBD, WTP, severity, willingness) are derived from the verified findings

  Scenario: Admin re-analyses an entry whose content has not changed
    Given an entry has already been chunked and analysed
    And the entry's raw_content has not changed since the last analysis
    When I click "Analyse with AI" again
    Then the existing chunks are reused
    And only the reduce step runs again
    And the result is returned within seconds

  Scenario: Admin re-analyses an entry whose content has changed
    Given an entry was analysed at hash X
    And I have edited raw_content so its hash is now Y
    When I click "Analyse with AI"
    Then the previous chunks are deleted
    And the entry is re-chunked and re-analysed end-to-end

  Scenario: A chunk extraction call fails
    Given a chunk extraction LLM call returns an error or unparseable JSON
    When the pipeline runs
    Then the failed chunk is recorded with status "failed"
    And the rest of the chunks still complete
    And the entry digest is still produced from the successful chunks
    And the user sees a warning that N of M chunks could not be processed

  Scenario: An LLM returns a quote that is not in the source
    Given a chunk extraction returns a quote string
    When the verifier checks the chunk text for that quote
    And the quote is not present verbatim
    Then the quote is dropped
    And the drop is recorded in the chunk's verification stats
    And the entry digest never includes that quote

  # ---- Study synthesis ----

  Scenario: Admin synthesises a study with 20 long interviews
    Given a study has 20 entries, each with a 60–90 minute transcript
    And every entry has been analysed (chunks + verified findings exist)
    When I click "Synthesise" on the study Analysis tab
    Then a synthesis run is created
    And each entry contributes its verified digest (not its raw transcript)
    And the synthesis report is written in clean Markdown with citations of (participant, chunk index, quote)
    And the synthesis run row records: model used, entries included, chunk count consulted, quotes dropped during entry analysis
    And the study analysis_markdown is updated with the new report

  Scenario: Admin synthesises a study where some entries were never analysed
    Given a study has 5 entries, 3 of which have chunks/findings and 2 of which do not
    When I click "Synthesise"
    Then the unanalysed entries are analysed first as part of the synthesis run
    And the synthesis only proceeds once all entries have a verified digest
    And the synthesis report only references verified content

  Scenario: Synthesis report avoids hallucination
    Given a synthesis run is in progress
    When the report is written
    Then every direct quote in the report must match a verified quote from at least one chunk of at least one entry
    And any unverifiable claim is removed before the report is saved

  # ---- Provenance ----

  Scenario: Admin views a synthesis run's provenance
    Given a study has at least one synthesis run
    When I open the Analysis tab
    Then I see the timestamp of the latest synthesis run
    And I see the number of entries and chunks it consulted
    And I see the number of quotes that were dropped during verification across the included entries
