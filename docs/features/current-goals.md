Feature: Current goals

  Scenario: Admin saves quarterly goals
    Given I am logged in as an admin
    When I navigate to Company > Goals
    And I fill in the Period, Focus areas, Key results, What to push, and What to defer sections
    And I click Save
    Then the goals are saved for the organisation

  Scenario: Goals are injected into AI chat when enabled
    Given current goals have been saved
    And the chat session has "current_goals" context enabled
    When I send a message in chat
    Then the AI system prompt includes a [CURRENT GOALS] block with the quarter's focus and OKRs

  Scenario: Goals are always injected into content generation
    Given current goals have been saved
    When I generate any content
    Then the AI system prompt always includes the current goals section regardless of toggle settings

  Scenario: Non-admin can view but not edit goals
    Given I am a non-admin member
    When I navigate to Company > Goals
    Then the goal fields are read-only
    And no Save button is shown
