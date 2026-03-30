# Feature: Unsaved changes in Company

```gherkin
Feature: Warn before leaving Company pages with unsaved work
  Scenario: User edits a save-based Company form and clicks another nav link
    Given the user changed content on a Company page that uses a Save button
    When they click a link to another route (Company sidebar or main sidebar)
    Then a dialog appears offering Stay on page, Leave without saving, and Save and leave when applicable

  Scenario: User saves and leaves
    Given the unsaved dialog is open
    When they choose Save and leave
    Then pending changes are saved and navigation continues

  Scenario: Browser tab close or refresh
    Given there are unsaved changes
    When the user closes the tab or refreshes
    Then the browser shows a native beforeunload warning

  Scenario: Draft flow that cannot save mid-flight
    Given the user is filling Start new quarter without submitting
    When they try to navigate away
    Then they see Stay and Leave without saving only (no Save and leave)
```
