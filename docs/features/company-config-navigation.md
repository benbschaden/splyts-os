# Feature: Company config navigation

```gherkin
Feature: Company configuration and content library
  Scenario: Member opens company area
    Given the user is signed in with a completed profile
    When they open Company from the sidebar
    Then they see org-wide generated content and navigation for Brand, Authors, and Content types when admin

  Scenario: Legacy marketing URLs keep working
    Given a bookmark to /dashboard/marketing
    When the user visits that path
    Then they are redirected to /dashboard/company

  Scenario: Project shows who created each output
    Given outputs exist for a project
    When the user opens the project
    Then each output shows creator name and timestamp when profile data exists
```
