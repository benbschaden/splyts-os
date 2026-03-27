Feature: Content calendar

  Scenario: User creates a calendar item from the calendar
    Given I am logged in as any org member
    When I navigate to Calendar
    And I click on a date in the month grid
    And I fill in the title, platform, and content type
    And I click Create
    Then a new calendar item appears on that date with status "idea"

  Scenario: Calendar shows items as coloured pills by status
    Given calendar items exist with different statuses
    When I view the month grid
    Then each day cell shows up to 3 pills coloured by status (idea=grey, scheduled=blue, generated=amber, published=green)

  Scenario: User generates content from a calendar item
    Given a calendar item exists with a brief and content type
    When I open the calendar item drawer
    And I click "Generate"
    Then the generation dialog opens pre-filled with the calendar item's content type and brief
    When I save the generated output
    Then the output is linked to the calendar item
    And the calendar item status advances to "generated"

  Scenario: User links an existing output to a calendar item
    Given a calendar item exists with no output linked
    When I open the calendar item drawer
    And I link an existing output from the output's project page
    Then the calendar item's output_id is set
    And the status advances to "generated"

  Scenario: Published output stats appear on calendar
    Given a calendar item is linked to a published output with reach data
    When I view the calendar list view
    Then the reach number is shown inline on that calendar item's row

  Scenario: User switches between month grid and list view
    Given calendar items exist
    When I click "List" on the calendar page
    Then items are shown chronologically grouped by week
    With date, title, platform badge, status, and assigned user visible
