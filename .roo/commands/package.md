---
description: Package the extension for Chrome Web Store (creates a clean .zip)
mode: code
---

Prepare the extension for deployment by creating a versioned zip file.

Follow these steps:

1.  **Read Version**:
    - Read `manifest.json` to extract the current `version` string.

2.  **Prepare Filename**:
    - Construct the filename: `DefenderPortalFlags-v[version].zip`.

3.  **Create Zip Archive**:
    - Create a zip file containing **only** the necessary production files.
    - **Include**:
        - `manifest.json`
        - `src/` (recursively)
        - `assets/` (recursively)
        - `README.md`
        - `AGENTS.md`
    - **Exclude** (ensure these are NOT in the zip):
        - `.git/`
        - `.roo/`
        - `plans/`
        - `.DS_Store`
        - `*.zip` (to avoid zipping previous builds)

4.  **Execution**:
    - Use the `zip` command line tool.
    - Example command structure: `zip -r [filename] manifest.json src assets README.md AGENTS.md -x "*.DS_Store" "*.git*" ".roo*"`

5.  **Verification**:
    - Verify the file was created.
    - Output the success message: "Successfully created [filename]".

6. **Open Chrome Web Store Developer Dashboard**:
    - Open https://chrome.google.com/webstore/devconsole in the default web browser.
    - Packaging does not upload, submit, or publish the extension. Follow the detailed manual publishing checklist in `/release`.
