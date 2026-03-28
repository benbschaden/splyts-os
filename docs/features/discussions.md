# Feature: Discussions

## Scenario: Create a lightweight discussion on a project
  Given I am on a project page and click the Discussions tab
  When I click "New Discussion", enter a title, select Lightweight, and click Create
  Then the discussion appears in the list with status Active and mode Lightweight

## Scenario: Create a structured discussion
  Given I am on a project page
  When I create a discussion with mode Structured
  Then the discussion appears with a Structured badge

## Scenario: Send a message in a discussion
  Given I have an active discussion open
  When I type a message and click Send
  Then my message appears in the message stream with my name and timestamp

## Scenario: Promote lightweight discussion to structured
  Given I have an active lightweight discussion
  When I click "Make Structured"
  Then the mode badge changes to Structured

## Scenario: Resolve a discussion with AI
  Given I have an active discussion with at least one message
  When I click "Resolve"
  Then AI generates a summary, decisions, learnings, and next steps
  And I can edit those outputs before saving
  When I click "Save Resolution"
  Then the discussion status becomes Resolved
  And the summary, decisions, and learnings are displayed

## Scenario: View resolved discussions
  Given a project has active and resolved discussions
  When I view the discussions list
  Then active discussions show normally
  And resolved discussions appear visually distinct (compressed)
  And I can filter by Active or Resolved

## Scenario: Create a document from a discussion
  Given I have a discussion with at least one message
  When I click "Create Document" and choose a document type
  Then AI generates a document draft from the discussion messages
  And the document is saved as Shared visibility
  And a link appears in the discussion pointing to the new document

## Scenario: View discussions on a document
  Given I am viewing a document
  When I click the Discussions tab
  Then I see discussions anchored to this document
  And I can create, view, and resolve them the same as project discussions
