Feature: Organisation Setup

  Scenario: Admin is prompted to set up their workspace on first sign-in
    Given I am logged in as the first admin user
    And no organisation has been configured yet
    When I am redirected to the dashboard
    Then I am shown a setup screen instead of the main dashboard
    And I see fields to enter my company name and confirm setup

  Scenario: Admin completes org setup
    Given I am on the org setup screen
    When I enter a company name (e.g. "Splyts") and click "Set up workspace"
    Then the organisation is created in the database
    And I am taken to the main dashboard
    And the sidebar shows "Splyts" instead of "Company OS"

  Scenario: Company name is empty on submit
    Given I am on the org setup screen
    When I click "Set up workspace" without entering a company name
    Then I see a validation error: "Company name is required"
    And nothing is saved

  Scenario: Subsequent sign-ins skip setup
    Given the organisation has already been configured
    When I sign in
    Then I am taken directly to the dashboard
    And the setup screen is never shown again
