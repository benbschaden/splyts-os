# 20260415_product_features_related

## Summary
Adds a `related_features` free-text column to `product_features` for documenting cross-feature relationships.

## Gherkin specs
Supports the product features page — allows admins to annotate which other features a given feature connects to.

## ADRs
None — additive column, no architectural decision required.

## Design notes
- Free text (not a foreign key relation) so it stays flexible as the feature set evolves
- Nullable — existing rows are unaffected
- Included in AI context when `include_in_ai` is true, appended as a "Related:" line in the features block
