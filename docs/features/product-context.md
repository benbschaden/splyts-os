Feature: Product context

  Scenario: Admin saves product context
    Given I am logged in as an admin
    When I navigate to Company > Product
    And I fill in the "Product overview" section
    And I click Save
    Then the product context is saved to the database
    And a success indicator is shown

  Scenario: Product context is injected into AI generation
    Given product context has been saved for the organisation
    When I generate content for any content type
    Then the AI system prompt includes a [PRODUCT CONTEXT] block with the saved sections

  Scenario: Non-admin can view but not edit product context
    Given I am logged in as a non-admin member
    When I navigate to Company > Product
    Then I can see the product context fields
    And the fields are read-only
    And no Save button is shown
