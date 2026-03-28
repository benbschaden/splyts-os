# Feature: Business plan

```gherkin
Feature: Business plan template under Company
  Scenario: Admin fills in a business plan section
    Given the user is an admin
    When they open Company → Strategy → Business plan
    Then they see an accordion with 12 sections, each with a label, description, and text field
    When they type content into a section and click Save
    Then the content is persisted and the progress bar updates

  Scenario: Admin exports business plan as PDF
    Given at least one section has content
    When the admin clicks the PDF button
    Then a formatted PDF downloads with a cover page, section headings, and body text
    And the PDF includes a Competitive Landscape section sourced from the Competitors table
    And only competitors with include_in_ai set to true appear in the PDF

  Scenario: Business plan feeds into AI generation
    Given the admin has filled in sections of the business plan
    When any user generates content from a project
    Then the AI prompt includes the filled business plan sections as background context

  Scenario: Member views business plan read-only
    Given the user is a member (not admin)
    When they open the business plan page
    Then they can read completed sections but cannot edit
```
