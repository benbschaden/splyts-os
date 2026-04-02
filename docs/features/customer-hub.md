# Customer Hub

```gherkin
Feature: Customer Hub
  As an organisation member
  I want to manage contacts, log communications, and extract learnings
  So that I can build stronger customer relationships and feed real signal into every project

  # -------------------------------------------------------
  # Contacts
  # -------------------------------------------------------

  Scenario: Add a contact
    Given I am on the Customer Hub page
    When I click "Add contact"
    And I fill in the name "Alex Rivera"
    And I fill in the email "alex@example.com"
    And I select the segment "customer"
    And I click "Save"
    Then a new contact record is created for my organisation
    And Alex Rivera appears in the contacts list

  # -------------------------------------------------------
  # Communications — Inbox
  # -------------------------------------------------------

  Scenario: Log an inbound email from a contact
    Given I am viewing the contact "Alex Rivera"
    When I click "Log communication"
    And I select the channel "email"
    And I select the direction "inbound"
    And I fill in the subject "Feedback on the onboarding flow"
    And I paste the email body into the content field
    And I click "Save"
    Then a new communication is created linked to Alex Rivera
    And it appears in the Inbox tab with the direction badge "inbound"

  Scenario: Draft a reply to a contact
    Given I am viewing a communication from "Alex Rivera"
    When I click "Draft reply"
    Then I am navigated to the AI chat with the communication pre-loaded as context
    And the chat prompt is pre-filled with "Draft a reply to Alex Rivera about: Feedback on the onboarding flow"

  Scenario: View all recent communications in the Inbox tab
    Given my organisation has several logged communications across multiple contacts
    When I navigate to the Customer Hub "Inbox" tab
    Then I see all communications sorted by sent_at descending
    And each row shows the contact name, subject, channel, direction, and date
    And deleted communications are not shown

  # -------------------------------------------------------
  # Insights
  # -------------------------------------------------------

  Scenario: Extract an insight from a communication
    Given I am viewing a communication from "Alex Rivera"
    When I click "Extract insight"
    And I fill in the insight content "Users find the onboarding flow confusing after step 3"
    And I select the category "pain_point"
    And I select the impact "high"
    And I leave "Include in AI context" enabled
    And I click "Save"
    Then a new customer insight is created linked to Alex Rivera's communication
    And it appears on the Insights board under the "pain_point" column

  Scenario: Filter insights by category on the Insights board
    Given the Insights board has insights across multiple categories
    When I select the filter "feature_request"
    Then only insights with category "feature_request" are displayed
    And insights with other categories are hidden

  # -------------------------------------------------------
  # AI Context
  # -------------------------------------------------------

  Scenario: Include customer insights in AI context
    Given a customer insight exists with include_in_ai set to true
    When an AI generation is triggered for any project in my organisation
    Then the insight content is included in the AI context payload
    And insights with include_in_ai set to false are excluded from the AI context
```
