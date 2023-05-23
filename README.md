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
- tag-filter:
  - description: Tag used for filtering tags when finding previous release tag. Used as startsWith, ie. "xxx_" will only match tags starting with xxx_
  - required: false, 
- path-filter:
  - description: Path filter for only extracting issues that has files matching certain paths. Supports a list of paths, by seperating with comma, ie. "src, folder/src". Useful in monorepos with several projects
  - required: false
## Outputs
- messages:
  - description: All commit messages

