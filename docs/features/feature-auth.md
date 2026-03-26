Feature: Authentication

  Scenario: Team member signs up via invite
    Given an admin has sent me an invite to my email address
    When I open the invite link and enter a password
    Then my account is created and linked to the organisation
    And I am logged in and taken to the team dashboard

  Scenario: Team member logs in
    Given I have an existing account
    When I enter my email and password and click Sign In
    Then I am logged in and taken to the team dashboard

  Scenario: Wrong password on login
    Given I have an existing account
    When I enter my email and an incorrect password
    Then I see an error: "Invalid email or password"
    And I remain on the login page

  Scenario: Session expires
    Given I am logged in
    When my session expires
    Then I am redirected to the login page
    And after logging in again I am returned to the page I was on

  Scenario: Invite link is expired or invalid
    Given an invite link that has expired or been used
    When I open the link
    Then I see an error: "This invite link is no longer valid"
    And I am shown a prompt to contact my admin
