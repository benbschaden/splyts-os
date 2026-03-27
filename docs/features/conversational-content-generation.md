Feature: Conversational Content Generation

  Background:
    Given I am logged in
    And brand context is configured
    And at least one content type exists
    And I am on a project page

  Scenario: User starts a generation session
    Given the project has no outputs
    When I click "Generate content"
    Then a setup panel appears
    And I can select a content type, author, and AI model
    And there is no brief field (the AI will discover what it needs)

  Scenario: AI leads intake conversation
    Given I have selected a content type, author, and model
    When I click "Start"
    Then a chat panel opens
    And the AI immediately asks all of its clarifying questions in a single organized list
    And the AI states any assumptions it is making
    And no draft is produced yet

  Scenario: User answers questions and receives a draft
    Given I am in a generation chat
    When I answer the AI's intake questions
    Then the AI produces a complete, ready-to-use draft of the content
    And the draft is clearly marked so I know it is ready to save

  Scenario: User refines the draft through back-and-forth chat
    Given the AI has produced a draft
    When I send a refinement request (e.g. "make it shorter" or "add a call to action")
    Then the AI produces a revised draft
    And I can keep iterating as many times as I need

  Scenario: User changes the AI model mid-conversation
    Given I am in a generation chat
    When I select a different model from the model switcher in the chat header
    Then the model updates immediately
    And the next message I send uses the new model
    And all previous conversation history is preserved
    And the AI continues the conversation seamlessly

  Scenario: User saves the draft as an output
    Given the AI has produced a draft I am happy with
    When I click "Save as output"
    Then a save panel appears showing the last AI draft as editable content
    And I can write or edit a brief describing what was created
    And clicking "Confirm save" creates an output on the project
    And the output appears immediately in the outputs list
    And the generation dialog closes

  Scenario: User closes the dialog without saving
    Given I am in a generation chat
    When I click the close button
    Then the dialog closes
    And no output is created
    And the conversation is not persisted (stateless)
