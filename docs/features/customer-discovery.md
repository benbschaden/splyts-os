# Feature: Customer Discovery

Feature: Customer Discovery

  # ---- Studies ----

  Scenario: Admin creates a new research study
    Given I am an admin on the Customer Discovery project
    When I open the Discovery tab and click "New study"
    And I enter a study name, research goal, and method
    And I click "Create study"
    Then the study appears in the Studies list
    And I am taken into the study detail view

  Scenario: Admin writes an interview script for a study
    Given I have an open study
    When I click the "Script" tab
    And I write my interview guide in the text area
    And I click "Save script"
    Then the script is saved and shown next time I open the study

  Scenario: Admin adds entries to a study
    Given I am inside a study's "Entries" tab
    When I click "Add entry" and fill in the entry form
    And I click "Create entry"
    Then the entry appears in the study's entry list
    And the entry count on the study card updates

  Scenario: Admin writes up analysis after completing a study
    Given I have a study with entries
    When I click the "Analysis" tab
    And I write a synthesis of key findings
    And I click "Save analysis"
    Then the analysis is saved and visible next time I open the study

  Scenario: Admin marks a study as complete
    Given I am viewing a study
    When I change the status dropdown to "Complete"
    Then the study shows a "Complete" badge in the studies list

  Scenario: Admin edits a study's name and goal
    Given I am viewing a study
    When I click the edit icon and update the name and goal
    And I click "Save changes"
    Then the updated name and goal are shown in the study header

  Scenario: Admin deletes a study
    Given I am viewing the studies list
    When I click the delete icon on a study and confirm
    Then the study is removed from the list

  Scenario: Team member sees all entries across studies
    Given there are entries in multiple studies
    When I click the "All Entries" sub-tab
    Then all entries for the project are shown regardless of which study they belong to

  Scenario: Admin adds an email feedback entry
    Given I am inside a study
    When I click "Add entry" and select type "Email feedback"
    And I fill in the source email address and paste the email content
    And I click "Create entry"
    Then the email feedback entry appears in the study's entry list

  # ---- Entries (existing) ----

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
