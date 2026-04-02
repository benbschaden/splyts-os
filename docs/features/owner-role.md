Feature: Owner role

  Background:
    Given three roles exist: owner, admin, member

  Scenario: Owner can do everything admin can do
    Given I am logged in as owner
    Then I can access all features available to admin
    And I can access all features available to member

  Scenario: Owner can edit business plan
    Given I am logged in as owner
    When I navigate to the business plan
    Then I can view and edit the business plan

  Scenario: Admin cannot edit business plan
    Given I am logged in as admin
    When I navigate to the business plan
    Then I can view the business plan
    But I cannot edit the business plan

  Scenario: Owner can access activity reports
    Given I am logged in as owner
    When I navigate to Performance > Reports
    Then I see the reports interface

  Scenario: Admin cannot see activity reports
    Given I am logged in as admin
    When I view the Performance section
    Then I do not see the Reports link
    And navigating to /dashboard/performance/reports returns not found

  Scenario: Member cannot access admin features
    Given I am logged in as member
    Then I cannot access brand configuration
    And I cannot access team management
    And I cannot see the business plan
    And I cannot see activity reports
