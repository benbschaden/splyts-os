Feature: Product roadmap

  Scenario: Admin adds a roadmap item to "Now"
    Given I am logged in as an admin
    When I navigate to Company > Roadmap
    And I click "Add item" on the Now column
    And I fill in the title and description
    And I click Create
    Then the item appears in the Now column of the kanban board

  Scenario: Admin moves a roadmap item to "Shipped"
    Given a roadmap item exists in the "Now" phase
    When I edit the item and change phase to "Shipped"
    And I save
    Then the item moves to the Shipped column

  Scenario: Company milestones appear on timeline tab
    Given company milestones exist with different dates
    When I click the "Company" tab on the roadmap page
    Then milestones are shown in chronological order
    And a "today" divider separates past from future milestones

  Scenario: Admin adds a company milestone
    Given I am logged in as an admin
    When I click "Add milestone"
    And I fill in the title, date, and category
    And I click Create
    Then the milestone appears on the timeline in date order

  Scenario: Roadmap and milestones appear in business plan PDF
    Given product roadmap items and company milestones exist
    When I download the business plan PDF
    Then the PDF contains a "Product Roadmap" section listing Now/Next/Later items
    And a "Company Milestones" section listing dated milestones
