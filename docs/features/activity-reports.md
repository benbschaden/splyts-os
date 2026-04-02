Feature: Activity reports

  Background:
    Given I am logged in as owner
    And the content index contains entries with created_by and timestamps

  Scenario: Owner asks for a weekly team summary
    Given content has been created by team members this week
    When I navigate to Performance > Reports
    And I type "What did everyone do this week?"
    And I submit the query
    Then I receive a report grouped by team member
    And each member's section lists what they created with summaries

  Scenario: Owner asks for a specific employee's activity
    Given Sarah has created outputs and documents this month
    When I type "What did Sarah do in March?"
    Then I receive a report showing only Sarah's contributions
    And the report covers the full month of March

  Scenario: Owner asks for SR&ED format
    Given the team has done development work this quarter
    When I type "SR&ED report for Q1 2026"
    Then I receive a report formatted for SR&ED claims
    And it includes technical descriptions of work done

  Scenario: Owner asks for investor update
    When I type "Investor update for March 2026"
    Then I receive a narrative-style report
    And it highlights key achievements and metrics

  Scenario: Non-owner cannot access reports
    Given I am logged in as admin
    When I try to call the activity report endpoint
    Then I receive a not found response
