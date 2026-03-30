# Company milestones: mark done & overdue

```gherkin
Feature: Mark upcoming milestones done with optional notes
  Scenario: Admin marks an upcoming milestone as achieved from the list
    Given I am an admin on Company milestones
    And a milestone exists with status upcoming and a target date
    When I choose "Mark done" and optionally enter completion notes
    And I confirm
    Then the milestone shows as achieved and any completion note appears on the card

  Scenario: Overdue upcoming milestone is visible before it is marked done
    Given a milestone is still upcoming
    And its target date is before today
    Then the list shows an overdue indicator next to the date
```
