Feature: Playbooks

  Scenario: Team member creates a playbook
    Given I am a team member
    When I navigate to Playbooks and click New Playbook
    And I enter a title and choose a category
    Then a new empty playbook is created and I am taken to the editor

  Scenario: Team member writes and saves playbook content
    Given I am on a playbook I created
    When I click Edit and write step-by-step content
    And I click Save
    Then the content is saved and displayed as formatted text

  Scenario: Team member uses AI to polish playbook writing
    Given I am editing a playbook with content
    When I choose a model and click Run AI edit without extra instructions
    Then the AI rewrites the content with improved clarity and structure
    And I can accept or discard the suggestion

  Scenario: Team member gives custom instructions for AI edit
    Given I am editing a playbook with content
    When I enter instructions for how to edit and choose a model
    And I click Run AI edit
    Then the AI revises the content following those instructions

  Scenario: Repeated AI edits build on the last preview
    Given I have run AI edit and a preview is shown
    When I click Run AI edit again
    Then the model receives the preview text as the starting point
    And company context (brand, terminology, narratives) informs the revision

  Scenario: Team member browses all playbooks by category
    Given there are multiple playbooks across different categories
    When I navigate to Playbooks
    Then I see all org playbooks grouped by category
    And each row shows the title, category, owner name, and last updated date

  Scenario: Admin deletes a playbook
    Given I am an admin
    When I open any playbook and click Delete
    Then the playbook is removed from the list

  Scenario: Creator deletes their own playbook
    Given I am the creator of a playbook
    When I open it and click Delete
    Then the playbook is removed
