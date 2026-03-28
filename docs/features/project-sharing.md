Feature: Project sharing settings

  Scenario: Create project shared with whole company
    Given I am creating a new project
    When I select "Whole company" visibility
    Then all org members can see the project in their projects list

  Scenario: Create project shared with a specific team
    Given I am creating a new project
    When I select "Team" visibility
    And I select the "Growth" team
    Then only Growth team members (and I as the creator) can see the project

  Scenario: Create project shared with specific users
    Given I am creating a new project
    When I select "Specific people" visibility
    And I select two users from the member list
    Then only those two users and I can see the project

  Scenario: Create private project
    Given I am creating a new project
    When I select "Only me" visibility
    Then only I can see the project

  Scenario: Edit sharing after creation — creator changes from private to team
    Given I created a project set to "Only me"
    When I open sharing settings on the project
    And I change visibility to "Team" and select "Engineering"
    Then Engineering team members can now see the project

  Scenario: Edit sharing after creation — creator adds specific users
    Given I created a project set to "Whole company"
    When I open sharing settings on the project
    And I change visibility to "Specific people" and select one user
    Then only that user and I can see the project

  Scenario: Non-creator, non-admin cannot edit sharing
    Given a project was created by another user
    And I am not an admin
    When I view the project
    Then I do not see the sharing settings control

  Scenario: Admin can edit any project's sharing
    Given I am an org admin
    And a project was created by another user
    When I open sharing settings on that project
    Then I can change the visibility

  Scenario: Teams are seeded when a new org is created
    Given I sign up and create a new organisation
    Then default teams (Product, Engineering, Design, etc.) are created for my org

  Scenario: Projects list only shows projects the user can access
    Given a private project exists created by another user
    When I view the projects list
    Then that private project does not appear in my list
