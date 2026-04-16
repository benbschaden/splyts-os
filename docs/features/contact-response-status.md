# Contact Response Status

```gherkin
Feature: Outstanding response tracking
  As an organisation member
  I want to know which contacts are waiting for a reply
  So that no inbound message goes unanswered

  Scenario: AI flags a contact as needing a response
    Given a contact "Alex Rivera" has an inbound communication logged
    And no outbound reply has been sent
    When the AI scans the communication thread
    Then Alex Rivera is flagged with response_status "needs_response"
    And a "Needs Response" badge appears on Alex Rivera in the contacts list

  Scenario: Contacts list shows a Needs Response filter
    Given multiple contacts have response_status "needs_response"
    When I click the "Needs Response" filter in the contacts list
    Then only contacts awaiting a reply are shown
    And a count badge shows how many are waiting

  Scenario: Contact detail shows an outstanding response banner
    Given Alex Rivera has response_status "needs_response"
    When I open Alex Rivera's contact detail
    Then a yellow banner reads "Awaiting response"
    And a "Generate reply" button is visible
    And a "Mark as responded" button is visible

  Scenario: Mark a contact as responded
    Given Alex Rivera has a "Needs Response" banner
    When I click "Mark as responded"
    Then response_status is set to "no_action_needed"
    And the banner disappears

  Scenario: Generate a reply from the banner
    Given Alex Rivera has a "Needs Response" banner
    When I click "Generate reply"
    Then the generate email panel opens
    With the purpose pre-filled as "Reply to most recent inbound message"

  Scenario: Inbox shows a Needs Response tab
    Given some contacts have response_status "needs_response"
    When I open the Inbox tab
    Then I can switch to a "Needs Response" view
    And see only the most recent inbound communication per flagged contact

  Scenario: Scan auto-triggers after an inbound communication is logged
    Given I log a new inbound communication for "Jordan Kim"
    Then the AI scan runs automatically in the background
    And Jordan Kim is flagged if the thread is awaiting a reply
```
