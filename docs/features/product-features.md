Feature: Product features

  Scenario: Admin adds a new feature
    Given I am logged in as an admin
    When I navigate to Company > Product > Features
    And I click "Add feature"
    And I fill in the name, tagline, description, surfaces, and category
    And I click Create
    Then the feature is added to the list
    And it appears grouped under its category

  Scenario: Features are grouped by category
    Given multiple features exist with different categories
    When I view the features page
    Then features are displayed in groups by category (e.g. Core, AI, Mobile)

  Scenario: Admin can edit a feature
    Given a feature exists
    When I click Edit on that feature
    And I update the name
    And I click Save changes
    Then the feature name is updated in the list

  Scenario: Admin can delete a feature
    Given a feature exists
    When I click Delete on that feature
    And I confirm the deletion
    Then the feature is removed from the list (soft deleted)

  Scenario: AI-visible features are injected into generation prompt
    Given features exist with include_in_ai = true
    When I generate content
    Then the AI system prompt includes those feature names and taglines in the [PRODUCT FEATURES] block

  Scenario: Non-admin can view but not add or edit features
    Given I am a non-admin member
    When I view the features page
    Then I can see all features
    But the Add, Edit, and Delete controls are not shown
