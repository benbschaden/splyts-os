Feature: Platform guidelines

  Scenario: Admin adds a platform guideline
    Given I am logged in as an admin
    When I navigate to Company > Platforms
    And I click "Add platform"
    And I fill in the platform name, guidelines, and cadence
    And I click Create
    Then the platform guideline appears as a card in the list

  Scenario: Platform guideline is matched to content type during generation
    Given a platform guideline exists for "LinkedIn"
    And a content type has platform = "LinkedIn"
    When I generate content using that content type
    Then the AI system prompt includes the LinkedIn guideline in a [PLATFORM GUIDELINES] block

  Scenario: Admin can disable a platform guideline from AI context
    Given a platform guideline exists with include_in_ai = true
    When an admin edits it and disables AI inclusion
    Then that guideline is no longer injected during generation

  Scenario: Admin deletes a platform guideline
    Given a platform guideline exists
    When I click Delete and confirm
    Then the guideline is removed from the list
