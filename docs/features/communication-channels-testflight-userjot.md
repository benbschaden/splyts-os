# Communication Channels: TestFlight and UserJot

```gherkin
Feature: Communication channels — TestFlight and UserJot
  As an organisation member
  I want to log communications that came through TestFlight or UserJot
  So that in-app feedback from beta testers and support users is captured alongside other contact history

  Scenario: Log a TestFlight feedback communication
    Given I am viewing the contact "Jordan Kim"
    When I click "Log communication"
    And I open the "Channel" dropdown
    Then "TestFlight" is listed as an option
    When I select the channel "TestFlight"
    And I fill in the content "Crash on login — TestFlight build 42"
    And I click "Save"
    Then a new communication is created for Jordan Kim
    And it appears in their communication history with channel "TestFlight"

  Scenario: Log a UserJot feedback communication
    Given I am viewing the contact "Sam Okonkwo"
    When I click "Log communication"
    And I open the "Channel" dropdown
    Then "UserJot" is listed as an option
    When I select the channel "UserJot"
    And I fill in the content "Requested dark mode via UserJot widget"
    And I click "Save"
    Then a new communication is created for Sam Okonkwo
    And it appears in their communication history with channel "UserJot"
```
