# Feature: Company Chat with Document Capture

## Overview
A context-aware chat interface that lets users have AI-powered conversations using their company knowledge (brand context, business plan, personas), then capture the output as a private document that can be shared, filed to company knowledge, or downloaded.

## Scenarios

### Scenario: Start a new chat session
```gherkin
Feature: Company Chat

  Scenario: Start a new chat session with company context
    Given I am on the Chat page
    When I click "New Chat"
    Then a new chat session opens
    And brand context is enabled by default
    And I can toggle business plan and personas context on or off
```

### Scenario: Chat with AI using company context
```gherkin
  Scenario: Ask the AI a question with company context
    Given I have a chat session open
    And I have brand context enabled
    When I type a question and press Send
    Then the AI responds using my company's brand, voice, and knowledge
    And the message thread shows both my message and the AI response
```

### Scenario: Capture conversation as a document
```gherkin
  Scenario: Capture a conversation as a document
    Given I have had a conversation with the AI
    When I click "Capture as Document"
    And I describe the document type I want (e.g. "planning brief")
    Then the AI drafts a document from our conversation
    And I can review and edit it before saving
    When I click Save
    Then the document is saved privately to my account
    And it appears in My Documents
```

### Scenario: Share or file a document
```gherkin
  Scenario: Share a document with the team
    Given I have a saved document in My Documents
    When I click Share
    Then the document becomes visible to all members of my organisation

  Scenario: File a document to company knowledge
    Given I have a saved document in My Documents
    When I click "File to Company"
    Then the document status becomes "filed"
    And it appears in the Company knowledge section

  Scenario: Download a document
    Given I have a saved document
    When I click Download
    Then the document downloads as a markdown file
```
