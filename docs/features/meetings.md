# Meeting Intelligence

```gherkin
Feature: Meeting Intelligence
  As an organisation member
  I want to paste a meeting transcript, process it with AI, and route extracted information to the right projects
  So that decisions, actions, and insights from meetings are captured and usable across the OS

  # -------------------------------------------------------
  # Upload and create
  # -------------------------------------------------------

  Scenario: Create a new meeting with a transcript
    Given I am on the Meetings page
    When I click "New meeting"
    And I fill in the title "Q2 Planning Sync"
    And I set the meeting date to "2026-04-05"
    And I paste the transcript text
    And I add myself and two colleagues as attendees
    And I click "Save"
    Then a new meeting is created with visibility "attendees_only"
    And the meeting appears in my meetings list
    And the three attendees can all see it
    And no other org members can see it

  Scenario: Non-attendee cannot access a meeting
    Given a meeting exists with attendees Alice and Bob
    And I am not an attendee of that meeting
    When I navigate directly to that meeting's URL
    Then I see a 404 page
    And no meeting content is revealed

  # -------------------------------------------------------
  # AI processing
  # -------------------------------------------------------

  Scenario: Process a meeting transcript
    Given I am viewing a meeting with a pasted transcript
    And the meeting has not been processed yet
    When I click "Process"
    Then the AI analyses the transcript
    And returns a structured summary
    And returns extracted decisions with owners where named
    And returns extracted action items with assignees where named
    And returns extracted open questions
    And suggests which projects the meeting content is relevant to with a rationale
    And the meeting is marked as processed

  Scenario: Process a meeting that mentions multiple projects
    Given a transcript covering Q2 Campaign planning and a Pricing discussion
    And both "Q2 Campaign" and "Pricing Strategy" exist as projects in the org
    When the meeting is processed
    Then the AI suggests "Q2 Campaign" for content-related items
    And suggests "Pricing Strategy" for pricing-related items
    And each suggestion includes only the relevant decisions and actions

  # -------------------------------------------------------
  # Review and accept suggestions
  # -------------------------------------------------------

  Scenario: Accept project routing suggestions
    Given a meeting has been processed
    And the AI has suggested linking it to two projects
    When I review the suggestions
    And I accept the link to "Q2 Campaign"
    And I reject the link to "Pricing Strategy"
    And I click "Confirm"
    Then "Q2 Campaign" shows this meeting in its Meetings tab
    And "Pricing Strategy" does not
    And the meeting is marked as accepted

  Scenario: View a meeting from a linked project
    Given a meeting has been accepted and linked to "Q2 Campaign"
    And I am a member of the Q2 Campaign project
    When I visit the Q2 Campaign project and click the Meetings tab
    Then I see the meeting listed with its title, date, and summary
    And I can click through to view the full meeting detail
    And I can see all decisions and actions linked to that project

  # -------------------------------------------------------
  # Access control in projects
  # -------------------------------------------------------

  Scenario: Project member sees only meetings they attended
    Given a meeting linked to "Q2 Campaign" has attendees Alice and Bob
    And Carol is a member of "Q2 Campaign" but was not in the meeting
    When Carol views the Q2 Campaign Meetings tab
    Then Carol does not see that meeting
    And Alice and Bob see it normally

  Scenario: Org-wide meeting is visible to all org members
    Given a meeting is created with visibility "org_wide"
    When any org member views the meeting or a linked project's Meetings tab
    Then they can see the meeting regardless of whether they were an attendee
```
