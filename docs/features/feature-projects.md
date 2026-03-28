Feature: Projects

  Scenario: Admin or member creates a project
    Given I am logged in
    When I click "New Project", enter a name, estimated end date, and optional fields, and click Create
    Then the project is created and I am taken to the project page
    And the project appears at the top of the project list

  Scenario: Project list is ordered by most recently updated
    Given multiple projects exist in my organisation
    When I view the project list
    Then projects are shown in order of most recently updated, newest first

  Scenario: Opening a project with outputs
    Given a project has one or more outputs
    When I click on the project
    Then I see the project name, description, and all outputs listed

  Scenario: Opening an empty project
    Given I have just created a new project with no outputs
    When I open it
    Then I see the project name and an empty state prompt: "No content yet. Generate your first piece."
    And I see a "Generate Content" button

  Scenario: Admin edits a project name or description
    Given I am logged in as an admin
    And I am viewing a project
    When I click Edit, change the name or description, and click Save
    Then the updated details are shown on the project page

  Scenario: Admin deletes a project
    Given I am logged in as an admin
    And I am viewing a project
    When I click Delete and confirm
    Then the project and all its outputs are permanently deleted
    And I am returned to the project list

  Scenario: Member cannot delete a project
    Given I am logged in as a member
    When I view a project
    Then I do not see a Delete option

  Scenario: Tools appear separately from projects
    Given I am logged in
    When I view the sidebar or the projects page
    Then I see a "Tools" section with platform workspaces (e.g. Marketing Content, Customer Discovery)
    And I see a "Projects" section with user-created time-bounded projects
    And Tools do not show date fields
    And the New Project button only creates a project, not a tool

  Scenario: Creating a project requires an estimated end date
    Given I am logged in
    When I click "New Project" and fill in the name
    Then I must provide an estimated end date before I can submit
    And start date is optional

  Scenario: Project card shows dates
    Given a project has a start date and estimated end date set
    When I view the project card in the projects list
    Then I can see the start date and estimated end date on the card

  Scenario: Estimated end date is stored for tracking
    Given a project is created with an estimated end date
    When the project passes its estimated end date and is still active
    Then the date remains visible so estimation accuracy can be reviewed later
