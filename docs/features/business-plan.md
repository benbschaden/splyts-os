# Feature: Business plan

```gherkin
Feature: Business plan template under Company
  Scenario: Admin fills in a business plan section
    Given the user is an admin
    When they open Company → Strategy → Business plan
    Then they see an accordion with 8 sections, each with a label, description, and text field
    And there is no "Key metrics" section (metrics come from the KPIs tool)
    And there is no "Risks and mitigations" section (risks live in the Risk Register tool)
    When they type content into a section and click Save
    Then the content is persisted and the progress bar updates

  Scenario: Admin exports business plan as PDF
    Given at least one section has content
    When the admin clicks the PDF button
    Then a formatted PDF downloads with a cover page, section headings, and body text
    And the PDF includes a Competitive Landscape section sourced from the Competitors table
    And only competitors with include_in_ai set to true appear in the PDF
    And the PDF includes a KPIs & Metrics section sourced live from the KPI definitions and latest snapshot
    And the PDF includes a Risks & Mitigations section sourced from the Risk Register (open and monitoring risks only)

  Scenario: Business plan feeds into AI generation
    Given the admin has filled in sections of the business plan
    When any user generates content from a project
    Then the AI prompt includes the filled business plan sections as background context

  Scenario: Member views business plan read-only
    Given the user is a member (not admin)
    When they open the business plan page
    Then they can read completed sections but cannot edit

  Scenario: Admin opens section chat
    Given the admin has expanded a business plan section
    When they click "Discuss with AI"
    Then a chat panel opens inline beneath the section content
    And the AI is pre-loaded with the current section text, all other filled sections, and company knowledge documents

  Scenario: Admin asks AI to review the section
    Given the section chat is open
    When the admin types a question and sends it
    Then the AI responds with analysis or suggestions grounded in the company context

  Scenario: Admin asks AI for a replacement version
    Given the section chat is open
    When the admin asks the AI to rewrite or update the section
    Then the AI responds with a replacement version wrapped in replacement tags
    And an "Apply to section" button appears below that message

  Scenario: Admin applies the AI replacement to the section
    Given an "Apply to section" button is visible
    When the admin clicks it
    Then the section text field is updated with the replacement text
    And the section chat closes
    And the form shows unsaved changes (same as manual editing)
```
