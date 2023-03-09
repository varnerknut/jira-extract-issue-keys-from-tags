# Extract jira issues between 2 tags. 
Tags must be on format with semver (xxx_v1.1.0 || v1.1.0 || 1.1.0 || 1.1)
Based on https://github.com/Elfsquad/jira-extract-issue-keys
## Inputs
- token:
  - description: Your Github token
  - required: true
- head-tag:
  - description: The head tag
  - required: true
- release-tag:
  - description: The release tag, defaults to previous semver if not specified
  - required: false
## Outputs
- messages:
  - description: All commit messages

