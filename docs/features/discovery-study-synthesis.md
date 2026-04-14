Feature: AI synthesis of a discovery study

  Scenario: Synthesise findings across all entries in a study
    Given a discovery study has one or more entries
    When the user clicks "Synthesise with AI" on the Analysis tab
    Then Claude reads all entries in the study (quotes, JTBD, sentiment, tags, WTP, severity)
    And returns a structured markdown report covering themes, patterns, and signal strength
    And the report populates the analysis text area
    And the report is automatically saved to the study

  Scenario: Re-synthesise after new entries are added
    Given a study already has a saved analysis
    When the user clicks "Re-synthesise"
    Then Claude re-runs across all current entries
    And the analysis is updated and saved

  Scenario: No entries in study
    Given a discovery study has zero entries
    When the user opens the Analysis tab
    Then the Synthesise button is disabled with a tooltip explaining entries are needed
