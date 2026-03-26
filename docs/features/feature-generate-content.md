Feature: AI Content Generation

  Scenario: Member generates content successfully
    Given I am logged in and viewing a project
    And brand context is configured for my organisation
    And at least one active content type exists
    When I click "Generate Content"
    And I select an author ("Company" or a named author profile)
    And I select a content type (e.g. "LinkedIn Post")
    And I enter a brief (e.g. "Announcing our new training load feature for coaches")
    And I click Generate
    Then the AI generates output using: brand context + author voice + content type rules + brief
    And the output is saved to this project
    And I am shown the generated content immediately

  Scenario: Author selection — Company is always the default
    Given I open the generate content form
    Then "Company" is pre-selected in the author dropdown
    And it is always the first option regardless of how many author profiles exist

  Scenario: Author selection — named authors appear when profiles exist
    Given one or more author profiles have been added in Settings > Authors
    When I open the generate content form
    Then I see "Company" plus each author profile listed below it in the author dropdown

  Scenario: Author selection — no author profiles added
    Given no author profiles have been created
    When I open the generate content form
    Then only "Company" appears in the author dropdown
    And generation proceeds normally using company brand context voice and tone

  Scenario: Generating as Company
    Given I select "Company" as the author
    Then the AI uses the voice and tone fields from brand context
    And no personal author context is injected

  Scenario: Generating as a named author
    Given I select a named author (e.g. "Ben Schaden")
    Then the AI injects that author's voice, tone, writing style, personal pillars, and platform notes
    And the brand context (mission, vision, north star, pillars, audience) is still injected
    And the content type rules are still applied

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
    And a link to Settings > Brand is shown to admins only
    And the Generate button is disabled

  Scenario: No active content types exist
    Given no content types have been created or all are inactive
    When I open the generate content form
    Then I see: "No content types have been set up yet"
    And the Generate button is disabled

  Scenario: AI generation fails
    Given I have filled in all fields and clicked Generate
    When the AI API returns an error
    Then I see: "Generation failed. Please try again."
    And my brief, author selection, and content type selection are preserved
    And I can click Generate again

  Scenario: Multiple generations for the same project
    Given I have previously generated content for a project
    When I generate again with the same or a different brief
    Then a new output is created and added to the project
    And previous outputs are not overwritten or removed
