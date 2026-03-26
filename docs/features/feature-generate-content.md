Feature: AI Content Generation

  Scenario: Member generates content successfully
    Given I am logged in and viewing a project
    And brand context is configured for my organisation
    And at least one active content type exists
    When I click "Generate Content"
    And I select a content type (e.g. "LinkedIn Post")
    And I enter a brief (e.g. "Announcing our new training load feature for coaches")
    And I click Generate
    Then the AI generates output using: brand context + content type rules + brief
    And the output is saved to this project
    And I am shown the generated content immediately

  Scenario: Admin generates content (same flow as member)
    Given I am logged in as an admin
    Then the generation flow is identical to the member flow above

  Scenario: Brief is empty
    Given I am on the generate content form
    When I click Generate without entering a brief
    Then I see a validation error: "Please enter a brief before generating"
    And nothing is generated

  Scenario: Brand context is not configured
    Given brand context has not been configured
    When I open the generate content form
    Then I see a blocking message: "Brand context must be configured before generating content"
    And the Generate button is disabled

  Scenario: No active content types exist
    Given no content types have been created or all are inactive
    When I open the generate content form
    Then I see: "No content types have been set up yet"
    And the Generate button is disabled

  Scenario: AI generation fails
    Given I have filled in a brief and clicked Generate
    When the AI API returns an error
    Then I see: "Generation failed. Please try again."
    And my brief is preserved so I do not have to retype it
    And I can click Generate again

  Scenario: Multiple generations for the same project
    Given I have previously generated content for a project
    When I generate again with the same or a different brief
    Then a new output is created and added to the project
    And previous outputs are not overwritten or removed
