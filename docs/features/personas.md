# Feature: Persona builder

## Background
  Given I am authenticated as an admin
  And I am in the Company section

## Scenario: View the personas page with no personas
  When I navigate to Company > Personas
  Then I see an empty state with a prompt to add the first persona

## Scenario: Create a new persona
  When I click "Add persona"
  Then a right-hand drawer opens
  And I can fill in: name, tagline, demographic fields, goals, frustrations, motivations, values, behaviours, channels, buying triggers, objections, and a representative quote
  And I see a progress bar showing how many fields are filled
  When I click "Create persona"
  Then the persona is saved
  And appears as a card in the personas list

## Scenario: Edit an existing persona
  Given at least one persona exists
  When I hover over the persona card and click the edit icon
  Then the drawer opens pre-filled with the persona's data
  When I change a field and click "Save changes"
  Then the persona is updated

## Scenario: Delete a persona
  Given at least one persona exists
  When I click the delete icon and confirm the confirmation modal
  Then the persona is soft-deleted and removed from the list

## Scenario: Toggle AI visibility per persona
  Given I am editing or creating a persona
  When I toggle "Included in AI context" off
  Then the persona will not be sent to the AI when generating content
  And the card shows an "Internal only" badge

## Scenario: AI generation uses active personas as context
  Given at least one persona has "Included in AI context" enabled
  When a user generates content in a project
  Then the AI prompt includes a [TARGET PERSONAS] section with that persona's details
  And the generated content speaks to that audience

## Scenario: Non-admin users can view but not edit personas
  Given I am authenticated as a non-admin
  When I navigate to Company > Personas
  Then I can see the list of personas
  But I do not see Add, Edit, or Delete controls
