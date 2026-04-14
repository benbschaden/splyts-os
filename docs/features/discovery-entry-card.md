Feature: Expanded discovery entry cards

  Scenario: Collapse and expand an entry card
    Given entries are visible in the feed
    When the user clicks the expand toggle on an entry
    Then the full details (JTBD, key quotes, metrics) expand inline
    When the user clicks again
    Then the card collapses back to summary view

  Scenario: JTBD and key quotes visible on expanded card
    Given an entry has been analysed with AI
    When the user expands the entry card
    Then the JTBD statement is shown
    And each key quote is shown as a blockquote
    And if the entry has a diarized transcript, each quote shows a timestamp (e.g. 2:14)

  Scenario: Collapsible speaker stats
    Given an interview entry has speaker metrics
    When the user expands the entry
    Then speaker stats are shown collapsed by default
    And clicking "Talk dynamics" expands the full metrics panel

  Scenario: Discuss with AI per interview
    Given an interview entry is expanded
    When the user clicks "Discuss with AI"
    Then an inline chat panel opens scoped to that interview's transcript
    And the user can ask questions about this specific interview
    And Claude responds with context from this entry only

  Scenario: Save discussion notes to interview
    Given the user has discussed an interview with AI
    When the user clicks "Save notes"
    Then the full discussion is saved as discussion_notes on the entry
    And a success confirmation appears

  Scenario: Toggle include in AI from the card
    Given an entry is expanded
    When the user clicks the "Include in AI" toggle
    Then include_in_ai is updated on the entry immediately
    And the sparkles icon updates to reflect the new state
