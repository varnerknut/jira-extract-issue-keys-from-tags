# Extract jira issues between 2 tags
Based on https://github.com/Elfsquad/jira-extract-issue-keys
## Inputs
- token:
  - description: Your Github token
  - required: true
- head-tag:
  - description: The release tag, defaults to N-1 release
  - required: false
- release-tag:
  - description: The release tag, defaults to N-1 release
  - required: false
## Outputs
- messages:
  - description: All commit messages

