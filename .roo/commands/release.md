---
description: Bump version in manifest.json and generate release notes
---

1.  **Read `manifest.json`** to determine the current version.
2.  **Ask the user** whether to perform a 'minor' or 'major' version bump (default is 'minor').
3.  **Create a new branch** named `release/v<new_version>` so the manifest change can be committed.
4.  **Update `manifest.json`** with the new calculated version.
5.  **Generate Release Notes**:
    *   Execute the following command to get the list of changes since the last tag:
        ```bash
        git log $(git describe --tags --abbrev=0)..HEAD --pretty=format:"- %s"
        ```
    *   If the command fails (e.g., no tags found), fall back to listing all commits or ask the user.
    *   The title should be "Release Notes [New Version]".
    *   Based on the last changes, generate a release note suitable for pasting into GitHub and social media.
    *   Please wrap the entire output in a markdown code block (```markdown ... ```) so it can be easily copied.
    