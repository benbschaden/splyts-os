# Feature: Discuss a project output with AI

```gherkin
Feature: Output AI chat with apply

  Background:
    Given I am logged in
    And I am viewing a project with at least one output

  Scenario: User opens the AI chat panel on an output
    When I click "Discuss with AI" on an output card
    Then an inline chat panel opens below the output content

  Scenario: User asks a question about the output
    Given the chat panel is open
    When I type a question and send it
    Then the AI responds with relevant information about the output

  Scenario: AI suggests a revised version
    Given the chat panel is open
    When I ask the AI to improve or rewrite the output
    Then the AI responds with a "Revised version" block containing the updated content
    And an "Accept" button appears below the revision

  Scenario: User accepts the AI suggestion
    Given the AI has suggested a revised version
    When I click "Accept"
    Then the output content is saved with the new version
    And the Accept button changes to "Applied"

  Scenario: User closes the chat panel
    Given the chat panel is open
    When I click the close button
    Then the panel closes and the output card returns to normal
```
