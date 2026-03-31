# Feature: Project deliverable — conversational generation

```gherkin
Feature: Project deliverable chat generation

  Background:
    Given I am logged in
    And I am viewing a project (not a marketing publish workspace)

  Scenario: User starts a project output session
    When I click Generate
    Then I choose an output type (including Email draft) and an AI model
    And I click Start to open a chat

  Scenario: User converses until satisfied
    Given I am in the project output chat
    When I describe what I need
    Then the AI may ask clarifying questions
    And when ready it produces a draft starting with "Here's your draft:"
    And I can request refinements with "Here's your updated draft:"

  Scenario: User saves when ready
    Given a draft has been produced
    When I click Save to project and confirm
    Then an output is created on the project with no content type
    And the dialog closes and the new output appears in the list

  Scenario: User closes without saving
    Given I have chatted but not saved
    When I close the dialog
    Then no new output is created
```

**Future-proofing:** Deliverables remain `content_type_id` null; session is stateless (messages only on the client until save), matching the marketing generation pattern.
