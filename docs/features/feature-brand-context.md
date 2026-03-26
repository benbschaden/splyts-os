Feature: Brand Context

  Scenario: Admin configures brand context for the first time
    Given I am logged in as an admin
    And brand context has not yet been configured
    When I go to Settings > Brand and fill in all required fields:
      | Field           | Example value                                                        |
      | Company name    | Acme Corp                                                            |
      | Mission         | We exist to give every athlete access to elite training intelligence |
      | Vision          | A world where every coach and athlete makes smarter training decisions|
      | North star      | Help athletes train better, not just harder                          |
      | Voice           | Direct, confident, science-led                                       |
      | Tone            | Professional but approachable                                        |
      | Pillars         | Training intelligence, athlete science                               |
      | Target audience | Competitive athletes and coaches                                     |
      | Values          | Optional — e.g. Integrity, Science-first, Athlete-led               |
    And I click Save
    Then the brand context is saved for my organisation
    And a success message confirms it was saved

  Scenario: Admin updates brand context
    Given brand context has already been configured
    When I update one or more fields and click Save
    Then the changes are saved
    And all future AI generation for this org uses the updated context

  Scenario: Admin saves with required fields empty
    Given I am on the brand context settings page
    When I clear a required field and click Save
    Then I see a validation error for each missing field
    And nothing is saved

  Scenario: Member views brand context
    Given I am logged in as a member
    When I am directed to Settings > Brand
    Then I can see the configured brand context
    And all fields are read-only with no Save button visible

  Scenario: Generation is blocked when brand context is missing
    Given brand context has not been configured
    When any user tries to generate content
    Then generation is blocked
    And they see: "Brand context must be configured before generating content"
    And a link to Settings > Brand is shown to admins only
