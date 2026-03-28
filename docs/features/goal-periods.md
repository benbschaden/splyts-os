Feature: Goal periods

  Scenario: Admin starts a new quarter
    Given there is no active goal period
    When the admin clicks "Start new quarter"
    Then a new goal period is created with status 'active'
    And the period label defaults to the current quarter (e.g. Q2 2026)
    And period_start and period_end default to the quarter's date range

  Scenario: Admin adds goals to the active period
    Given there is an active goal period
    When the admin clicks "Add goal" and enters a title
    Then the goal appears in the list under the active period
    And the goal has no outcome (null) while the period is active

  Scenario: Admin fills in strategic fields for the active period
    Given there is an active goal period
    When the admin fills in focus areas, what to push, and what to defer
    And clicks Save
    Then the strategic fields are saved against that period

  Scenario: Admin closes a quarter and reviews goals
    Given there is an active goal period with goals
    When the admin clicks "Close quarter"
    Then the period moves to status 'reviewing'
    And each goal shows an outcome picker (achieved / partial / missed)
    And a review summary text field appears

  Scenario: Admin completes a quarter review
    Given a goal period is in status 'reviewing'
    When the admin marks each goal's outcome and writes a review summary
    And clicks "Complete review"
    Then the period moves to status 'closed'

  Scenario: Admin starts a new quarter with carry-forward
    Given a closed or reviewing period has goals with outcome 'partial' or 'missed'
    When the admin clicks "Start new quarter"
    Then unfinished goals appear with a "Carry forward?" toggle
    And carried goals get linked to their predecessor via carried_from_goal_id

  Scenario: Past periods are visible as read-only history
    Given closed goal periods exist
    When the admin views the Goals page
    Then past periods appear in a collapsed list below the active period
    And each shows period label, goal count with outcomes, and review summary

  Scenario: Non-admin can view but not edit goals
    Given the user is a non-admin member
    When they navigate to Company > Goals
    Then they can view periods and goals but cannot edit or create

  Scenario: AI context uses the active period
    Given an active goal period exists with content
    When content is generated or a chat message is sent with goals context enabled
    Then the AI prompt includes the active period's focus areas, goals, and strategic fields
