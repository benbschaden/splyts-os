# Feature: Customer Discovery

Feature: Customer Discovery

  Scenario: Admin adds an interview entry to a research project
    Given I am an admin on a project
    When I open the Discovery tab
    And I click "Add entry" and select type "Interview"
    And I fill in the source, date, raw content, sentiment, tags, segment, and key quotes
    And I click "Create entry"
    Then the entry appears in the discovery feed with the correct type badge

  Scenario: Admin adds a public review entry
    Given I am an admin on a project
    When I open the Discovery tab and click "Add entry"
    And I select type "Review" and fill in the platform, star rating, and review text
    And I click "Create entry"
    Then the review appears in the discovery feed with a star rating indicator

  Scenario: Admin adds a survey response entry
    Given I am an admin on a project
    When I open the Discovery tab and click "Add entry"
    And I select type "Survey" and fill in the source and response content
    And I click "Create entry"
    Then the survey response appears in the discovery feed

  Scenario: Admin adds an observation entry
    Given I am an admin on a project
    When I open the Discovery tab and click "Add entry"
    And I select type "Observation" and fill in the pattern content
    And I click "Create entry"
    Then the observation appears in the discovery feed

  Scenario: Team member filters discovery entries by type
    Given there are discovery entries of types interview, review, survey, and observation
    When I select "Review" from the type filter
    Then only review entries are shown in the feed

  Scenario: Team member filters discovery entries by sentiment
    Given there are entries with positive and negative sentiment
    When I select "Negative" from the sentiment filter
    Then only negative-sentiment entries are shown

  Scenario: Team member filters discovery entries by tag
    Given there are entries tagged with "churn" and "activation"
    When I select "churn" from the tag filter
    Then only entries with the "churn" tag are shown

  Scenario: Admin marks an entry for AI inclusion
    Given I am viewing a discovery entry
    When I open the entry for editing and toggle "Include in AI"
    And I save the entry
    Then the entry shows the AI-included indicator in the feed

  Scenario: Admin edits an existing discovery entry
    Given I am viewing an interview entry in the discovery feed
    When I click "Edit" and update the key quotes
    And I click "Save changes"
    Then the updated key quotes are shown when the entry is viewed

  Scenario: Admin deletes a discovery entry
    Given I am viewing a discovery entry in the feed
    When I click "Delete" and confirm
    Then the entry is removed from the feed

  Scenario: New organisation receives Customer Discovery project automatically
    Given a new organisation completes setup
    Then a project named "Customer Discovery" exists under the "Research" category
    And the project has a description explaining what to capture here
