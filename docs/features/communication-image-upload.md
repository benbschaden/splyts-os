# Communication Image Attachments

```gherkin
Feature: Communication image attachments
  As an organisation member
  I want to attach screenshots and images when logging a communication
  So that visual context (bug reports, UI feedback, app screenshots) is stored alongside the text
  And the AI can see and reference those images when I ask about a contact

  Scenario: Attach an image to a new communication
    Given I am viewing the contact "Alex Rivera"
    When I click "Log communication"
    And I fill in the content "Reported crash — see screenshot"
    And I click "Attach image"
    And I select a PNG file from my device
    Then a thumbnail preview of the image appears in the dialog
    When I click "Add communication"
    Then the communication is saved with the image attached
    And the image thumbnail appears in Alex Rivera's communication history

  Scenario: Attach multiple images to one communication
    Given I am viewing the contact "Jordan Kim"
    When I click "Log communication"
    And I attach two images to the form
    Then both thumbnails appear in the dialog
    When I click "Add communication"
    Then both images are stored and visible in the communication detail

  Scenario: AI uses attached image in context
    Given a communication for "Alex Rivera" has an attached screenshot
    And I open the AI chat with Alex Rivera in context
    When I ask "What did Alex report in their last message?"
    Then the AI response references the visual content from the screenshot

  Scenario: Image type validation
    Given I am in the "Add communication" dialog
    When I attempt to attach a PDF file as an image
    Then an error message says "Only images are supported (JPEG, PNG, GIF, WebP)"
    And the file is not attached

  Scenario: Image size validation
    Given I am in the "Add communication" dialog
    When I attempt to attach an image larger than 10 MB
    Then an error message says "Images must be 10 MB or smaller"
    And the file is not attached
```
