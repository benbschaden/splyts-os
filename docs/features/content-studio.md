# Feature: Content Studio

## Background
  Given I am authenticated
  And my organization has brand context configured
  And the Content Studio tool project exists for my organization

## Scenario: View Content Studio sections
  When I navigate to the Content Studio tool
  Then I see three collapsible sections: "Backlog", "Generate", "Published"

## Scenario: Add a content idea to the backlog
  Given I am on the Content Studio page
  When I open the Backlog section
  And I click "Add idea"
  And I enter a title, optional description, platform, and platform owner
  And I click "Save"
  Then the idea appears in the Backlog list

## Scenario: Build out a content idea from the backlog
  Given I have a content idea in the Backlog
  When I click "Build" on the idea
  Then the Generate section opens with the idea's text pre-filled in the chat input
  And the chat has not been submitted

## Scenario: Generate content in Content Studio
  Given I am on the Content Studio Generate section
  When I pick a content type and author and click Start
  Then I can send messages and generate content
  And I can save the output to the Content Studio project

## Scenario: Mark an output as published (Marketing projects only)
  Given I have a generated output in a Marketing-category project
  When I click the "Mark as published" button on the output
  Then the output's published_at is set to now
  And it appears in the Content Studio Published section

## Scenario: Mark as Published not shown for non-Marketing projects
  Given I have a generated output in a Research or Strategy project
  Then the "Mark as published" button is not visible on that output

## Scenario: Enter performance data for a published output
  Given an output appears in the Content Studio Published section
  When I click the stats button on that output
  And I enter views after 1 day, 7 days, 30 days, website visits, email signups
  And I click "Save stats"
  Then the data is saved and visible as a summary strip on the Published card

## Scenario: AI uses performance data during generation
  Given some published outputs have performance data entered
  When I generate new content in any project
  Then the AI system prompt includes top-performing outputs with their time-windowed view counts

## Scenario: Content Calendar is removed from company nav
  Given I am on any company page
  Then the "Calendar" link does not appear in the company navigation
