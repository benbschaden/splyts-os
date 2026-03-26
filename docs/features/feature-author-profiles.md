Feature: Author Profiles

  Scenario: Admin adds a new author profile
    Given I am logged in as an admin
    When I go to Settings > Authors and click "Add author"
    And I fill in the author's name and any other fields, then click Save
    Then the author profile is created
    And the author appears in the authors list
    And the author becomes selectable when generating content

  Scenario: Admin edits an existing author profile
    Given an author profile exists
    When I click Edit on the author and change one or more fields, then click Save
    Then the updated details are saved
    And future content generated for this author uses the updated profile

  Scenario: Admin deletes an author profile
    Given an author profile exists
    When I click Delete on the author and confirm
    Then the author profile is permanently deleted
    And the author no longer appears in the generation dropdown

  Scenario: Author list is empty
    Given no author profiles have been created
    When I go to Settings > Authors
    Then I see an empty state: "No authors yet. Add your first author profile."
    And I see an "Add author" button

  Scenario: Member views author profiles
    Given I am logged in as a member
    When I go to Settings > Authors
    Then I can see the list of author profiles
    And all profiles are read-only with no Add, Edit, or Delete options

  Scenario: Author is available at content generation
    Given one or more author profiles exist
    When I go to generate content
    Then I can choose "Company (brand)" or any named author from a dropdown
    And selecting an author injects their voice profile into the AI prompt

  Scenario: Name is required, all other fields optional
    Given I am adding or editing an author profile
    When I try to save with the name field empty
    Then I see a validation error: "Name is required"
    And nothing is saved
