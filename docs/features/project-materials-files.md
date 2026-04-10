# Project materials: open and view files

## Summary

Users can open uploaded project materials in the app: markdown renders in a large scrollable reader; other file types open via a signed URL (browser viewer or download).

## Gherkin

```gherkin
Feature: Open project material files

  Scenario: Member opens a markdown material in the reader
    Given I am logged in and viewing a project Materials tab
    And a markdown file is attached to the project
    When I choose to view the markdown file
    Then the document opens in a large scrollable panel
    And the content is rendered with readable markdown formatting

  Scenario: Member opens a non-markdown file
    Given I am logged in and viewing a project Materials tab
    And a PDF or other supported file is attached
    When I choose to open the file
    Then the file opens in a new context using a secure short-lived URL

  Scenario: Unauthorized user cannot access another organisation's file
    Given I am not authenticated or the material does not belong to my organisation
    When I request the file URL for that material
    Then I receive an error and the file is not returned
```

## ADRs

- ADR-002 project-centric data model (materials belong to projects)
