Feature: Content Types

  Background:
    Given the system includes three base templates:
      | Template     | Description                                        |
      | social-post  | Short-form, single message, hook-driven            |
      | video-script | Cold open, sections, spoken-word CTA               |
      | long-form    | Headline, intro, body sections, conclusion         |

  Scenario: Admin views available base templates
    Given I am logged in as an admin
    When I go to Settings > Content Types
    Then I see the three base templates listed
    And I see any content types already created by my organisation

  Scenario: Admin creates a new content type from a template
    Given I am logged in as an admin
    When I click "New Content Type", select a base template, and fill in:
      | Field         | Example value                                                              |
      | Name          | LinkedIn Post                                                              |
      | Base template | social-post                                                                |
      | Custom rules  | Professional tone. Max 1,200 characters. End with a question to the reader.|
    And I click Save
    Then the new content type is saved as active
    And it is immediately available for members to use when generating content

  Scenario: Admin creates a second content type from the same template
    Given "LinkedIn Post" already exists from the social-post template
    When I create "Twitter Post" also from social-post with rules: "Punchy, under 280 characters, no hashtags"
    Then both content types exist independently with their own rules
    And both appear in the content type selector when generating

  Scenario: Admin edits a content type
    Given a content type exists
    When I click Edit, update the name or custom rules, and click Save
    Then the changes are saved
    And future generations using this content type use the updated rules

  Scenario: Admin deactivates a content type
    Given a content type is currently active
    When I toggle it to inactive and confirm
    Then it is no longer shown to members when generating content
    And existing outputs created with this type are not affected

  Scenario: Admin deletes a content type
    Given a content type exists
    When I click Delete and confirm
    Then the content type is removed from Settings
    And it is no longer selectable for generation
    And existing outputs created with this type are not affected

  Scenario: Member sees only active content types
    Given I am logged in as a member
    When I open the generate content form
    Then I see only content types that are currently active
    And I do not see inactive or deleted types

  Scenario: No content types have been created yet
    Given an admin has not yet created any content types
    When any user tries to generate content
    Then they see: "No content types have been set up yet"
    And admins see a link to Settings > Content Types
