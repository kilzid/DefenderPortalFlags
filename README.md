# Defender Portal Flags Manager

## Overview
This Chrome/Edge extension allows developers and PMs to manage feature flags (flights) for the Microsoft Defender Portal. It provides a user-friendly interface to toggle flags on/off, filter, reorder, and persist a list of "pinned" flags for easy access.

## Features
*   **Automatic Detection**: Automatically detects if you are on a supported Microsoft Defender Portal URL.
*   **Flag Management**:
    *   **Toggle**: Enable or disable feature flags.
    *   **Force Disable**: Right-click on any flag and select "Force Disable" to explicitly set a flag to `false` (appears as `FlagName:false` in the URL). This overrides the default value even if the flag is normally enabled.
    *   **Clear Override**: Right-click and select "Clear Override" to remove any active override and revert to default behavior.
    *   **Filter**: Quickly find flags by typing their name.
    *   **Copy**: Right-click on any flag to copy its name.
    *   **Reorder**: Drag and drop flags to reorder them.
    *   **Pin**: Save frequently used flags.
    *   **Add New**: Manually add new feature flags. Add with `:false` suffix (e.g., `MyFlag:false`) to immediately force-disable.
*   **Dark Mode**: Toggle between light and dark themes.
*   **Smart Merging**: Merges pinned flags with active URL flags. The list is separated into "Saved" and "From URL" sections for clarity.
*   **One-Click Apply**: Reloads the page with updated flags.
*   **Send Feedback**: Click the envelope icon in the header to email feedback to the maintainers.

## URL Syntax
The extension supports these URL patterns:
*   `?flight=FlagA,FlagB` - Enables FlagA and FlagB
*   `?flight=FlagA,FlagB:false` - Enables FlagA and force-disables FlagB

## Supported Domains
*   `security.microsoft.com`
*   `security.officeppe.com`
*   `dev.security.microsoft.com`
*   `sip.security.microsoft.com`

## Installation

### 1. Download the Code
Clone this repository to your local machine or download the source code.

### 2. Load into Chrome or Edge

**For Google Chrome:**
1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** in the top right corner.
3.  Click **Load unpacked**.
4.  Select the root directory of this project (`DefenderPortalFlags`).

**For Microsoft Edge:**
1.  Open Edge and navigate to `edge://extensions/`.
2.  Enable **Developer mode** in the left sidebar (or toggle switch).
3.  Click **Load unpacked**.
4.  Select the root directory of this project (`DefenderPortalFlags`).

## Usage
1.  Navigate to a supported portal (e.g., [security.microsoft.com](https://security.microsoft.com)).
2.  Click the extension icon in the browser toolbar.
3.  Add, toggle, or pin flags as needed.
4.  Click **Apply Changes** to refresh the page with your selected flags.