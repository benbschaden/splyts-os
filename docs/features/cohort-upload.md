Feature: Cohort document upload and AI insight extraction

  Scenario: User uploads a survey CSV for beta users
    Given I am on the Customer Hub
    When I click the Cohorts tab
    And I click "Upload" on the Beta Users card
    And I select a CSV file exported from my survey tool
    Then the file is uploaded
    And AI reads the file and extracts a list of draft insights
    And I see the draft insights listed for review

  Scenario: User reviews and saves extracted insights
    Given I have uploaded a cohort document and AI has extracted draft insights
    When I remove one insight I don't want
    And I edit the text of another insight
    And I click "Save insights"
    Then all approved insights are saved to the Insights board
    And each saved insight is tagged with the cohort segment (e.g. Beta Users)
    And each saved insight is included in AI context across the OS

  Scenario: User views past uploads for a cohort
    Given I have previously uploaded documents to the Beta Users cohort
    When I open the Cohorts tab
    Then I can see the list of uploaded documents for Beta Users
    And I can see how many insights were extracted from each document
