Feature: Roles and Permissions

  Background:
    Given the organisation has two roles: admin and member

  Scenario: Admin can access Settings
    Given I am logged in as an admin
    When I open the navigation
    Then I see a Settings option

  Scenario: Member cannot access Settings
    Given I am logged in as a member
    When I open the navigation
    Then I do not see a Settings option
    And if I navigate to /settings directly I see: "You do not have permission to view this page"

  Scenario: Only admin can configure brand context
    Given I am logged in as a member
    When I navigate to Settings > Brand
    Then I see "You do not have permission to edit brand settings"

  Scenario: Only admin can create content types
    Given I am logged in as a member
    When I navigate to Settings > Content Types
    Then I see the list of active content types but no option to create or edit

  Scenario: Only admin can invite team members
    Given I am logged in as a member
    When I navigate to Settings > Team
    Then I see the team list but no invite option

  Scenario: Both admin and member can create projects
    Given I am logged in as either an admin or member
    When I click "New Project"
    Then I can create a project

  Scenario: Both admin and member can generate content
    Given I am logged in as either an admin or member
    And brand context is configured
    And at least one content type is active
    When I open a project and click "Generate Content"
    Then I can submit a brief and receive generated outputs

  Scenario: Both admin and member can view and edit outputs
    Given I am logged in as either an admin or member
    When I open a project with existing outputs
    Then I can view, edit, copy, and delete outputs
