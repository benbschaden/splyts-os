Feature: Company knowledge uploads

  Scenario: Admin uploads a text-based PDF
    Given I am an admin on the company knowledge page
    When I upload a text-based PDF file under 50MB
    Then the file appears in the list with status "Processing"
    And after processing, status changes to "Ready"
    And I can see a text preview of the extracted content

  Scenario: Upload fails for unsupported file type
    Given I am on the company knowledge page
    When I try to upload a .xlsx file
    Then I see an error "Only PDF, DOCX, TXT, and MD files are supported"
    And no file is saved to the database

  Scenario: Conflict detected between two uploads
    Given I have uploaded "roadmap-v1.pdf" describing one set of priorities
    When I upload "roadmap-v2.pdf" with different strategic priorities
    Then a conflict appears in the conflicts panel
    And I can see which topics contradict and relevant excerpts from each doc
    And I can dismiss the conflict

  Scenario: Admin uses suggest on an empty field
    Given the mission field is empty
    And I have uploaded "business-plan.pdf"
    When I click the sparkle button next to Mission
    Then a suggestion appears below the field citing "business-plan.pdf"
    And I can click "Use this" to fill the field
    Or I can click "Dismiss" to close the suggestion without saving

  Scenario: Suggest works without any uploads
    Given no files have been uploaded
    And the company name and vision fields are filled
    When I click suggest next to Mission
    Then a suggestion is generated from the other filled fields
    And no source citations appear

  Scenario: Non-admin sees files but cannot upload
    Given I am a non-admin team member
    When I visit the company knowledge page
    Then I see the uploaded files list
    And I do not see the upload button or delete buttons
