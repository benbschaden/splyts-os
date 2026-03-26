# Feature Specs

One Gherkin file per feature. Written before the feature is built.

## Naming
`feature-name.md` — e.g. `generate-social-post.md`, `brand-context.md`, `auth.md`

## Format
```gherkin
Feature: [Feature name]

  Scenario: [Happy path]
    Given [starting state]
    When [user action]
    Then [expected result]

  Scenario: [Edge case or error]
    Given [starting state]
    When [user action]
    Then [expected result]
```
