# Feature: Risk Register

```gherkin
Feature: Risk Register — standalone risk matrix tool

  Scenario: Admin views the risk register
    Given the user is an admin
    When they open Company → Strategy → Risk Register
    Then they see a table of risks with columns: Title, Category, Likelihood, Impact, Priority score, Owner, Status, and Last reviewed

  Scenario: Admin adds a risk
    Given the admin is on the Risk Register page
    When they click "Add risk" and fill in the details
    Then a new row appears in the register
    And the priority score (likelihood × impact) is computed automatically

  Scenario: Admin edits a risk inline
    Given there is at least one risk in the register
    When the admin clicks a row to edit
    Then the row becomes editable inline
    When they save
    Then the updated values persist

  Scenario: Admin marks a risk as mitigated
    Given a risk with status "open"
    When the admin changes its status to "mitigated"
    Then the row is visually distinguished (muted)

  Scenario: Admin deletes a risk
    Given there is at least one risk in the register
    When the admin clicks delete and confirms
    Then the risk is removed from the register

  Scenario: Risk register is linked from business plan overview
    Given the user is on the business plan page
    When they look at the overview section
    Then they see a link to the Risk Register with a note that risk data lives there

  Scenario: Risk data feeds business plan PDF
    Given there are open risks in the register
    When the admin exports the business plan as PDF
    Then the PDF includes a "Risks & Mitigations" section built from register data
    And only risks with status "open" or "monitoring" are included

  Scenario: Member views risk register read-only
    Given the user is a member (not admin)
    When they open the Risk Register page
    Then they can read all risks but cannot edit, add, or delete
```
