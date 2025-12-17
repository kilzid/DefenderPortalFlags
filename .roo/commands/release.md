---
description: Automate release: version bump, changelog, tagging, and packaging
mode: code
---

Perform a complete release workflow for the Chrome Extension.

Follow these steps:

1.  **Version Management**:
    - Read `manifest.json` to get the current version.
    - Ask the user for the bump type: `minor`, or `major` (default: `minor`).
    - Calculate the new version.

2.  **Branching**:
    - Create and switch to a new branch: `release/v[new_version]`.

3.  **Update Manifest**:
    - Update the `version` field in `manifest.json`.
    - git add the `manifest.json` file.
    - Commit the change: `git commit -m "chore(release): bump version to [new_version]"`

4.  **Generate Release Notes**:
    - Get commits since the last tag: `git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"%s"`
    - If no tags exist, use all commits.
    - Generate a Markdown changelog:
        - **Title**: Release v[new_version]
        - **Sections**: Group by type (Features, Fixes, Maintenance) based on conventional commits.
        - **Summary**: A brief, user-friendly summary of the update.
    - Display the changelog in a code block for easy copying.

5.  **Packaging**:
    - Execute the steps from `/package` to generate the production zip file: `DefenderPortalFlags-v[new_version].zip`.

6.  **Finalize**:
    - Ask the user if they want to push the branch and create a tag.
    - If yes:
        - `git push -u origin release/v[new_version]`
        - `git tag v[new_version]`
        - `git push origin v[new_version]`
    - Output the path to the generated zip file and the release notes.