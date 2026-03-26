Feature: Output Library

  Scenario: Viewing outputs for a project
    Given a project has one or more outputs
    When I open the project
    Then I see all outputs listed with: content type name, date generated, and a text preview

  Scenario: Viewing the full content of an output
    Given I am viewing a project with outputs
    When I click on an output
    Then I see the full generated text

  Scenario: Output shows which content type and brief were used
    Given I am viewing an output
    Then I can see which content type was used to generate it (e.g. "LinkedIn Post")
    And I can see the brief that was submitted

  Scenario: Editing an output
    Given I am viewing an output
    When I click Edit, change the text, and click Save
    Then the updated text is saved and shown in the output list
    And the original AI-generated text is replaced

  Scenario: Copying an output to clipboard
    Given I am viewing an output
    When I click Copy
    Then the full text of the output is copied to my clipboard
    And I see a brief confirmation: "Copied"

  Scenario: Deleting an output
    Given I am viewing an output
    When I click Delete and confirm
    Then the output is permanently removed from the project
    And the project output list updates immediately

  Scenario: Empty state — no outputs yet
    Given a project has no outputs
    When I open the project
    Then I see: "No content yet. Generate your first piece."
    And I see a "Generate Content" button
