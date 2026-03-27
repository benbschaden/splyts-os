Feature: Output performance tracking

  Scenario: User marks an output as published
    Given an output exists in a project
    When I click "Mark as published"
    Then the output is marked published (published_at is set)
    And the card shows a green "Published" badge

  Scenario: Published output older than 7 days shows stats nudge
    Given an output was published 8 days ago with no reach data
    When I view the project outputs
    Then the card shows an amber nudge: "Published X days ago — how did it perform?"

  Scenario: User enters reach stats
    Given an output has been published
    When I expand the stats entry form
    And I enter the reach number and select "impressions" as the metric
    And I click Save
    Then the output displays the reach badge inline

  Scenario: Top-performing outputs are injected into AI generation
    Given outputs with reach data exist for the organisation
    When I generate content
    Then the AI system prompt includes the top 3 outputs by reach as examples in a [TOP PERFORMING CONTENT] block
