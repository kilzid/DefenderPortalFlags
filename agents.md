# Defender Portal Flags Manager - Agent Guide

This document provides instructions for using and contributing to the Defender Portal Flags Manager Chrome extension.

## Overview

This extension allows developers and PMs to manage feature flags (flights) for the Microsoft Defender Portal. It provides a user-friendly interface to toggle flags on/off and persists a list of "pinned" flags for easy access.

## Usage

### Installation

1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" in the top right corner.
4.  Click "Load unpacked" and select the root directory of this project (`DefenderPortalFlags`).

### Features

*   **Automatic Detection**: The extension automatically detects if you are on a supported Microsoft Defender Portal URL.
*   **Flag Management**:
    *   **Toggle**: Enable or disable feature flags.
    *   **Force Disable**: Right-click on any flag and select "Force Disable" to explicitly set a flag to `false` (appears as `FlagName:false` in the URL). This overrides the default value even if the flag is normally enabled.
    *   **Clear Override**: Right-click and select "Clear Override" to remove any active override (enabled or force-disabled) and revert to default behavior.
    *   **Filter**: Quickly find flags by typing their name in the search box.
    *   **Copy**: Right-click on any flag to copy its name to the clipboard.
    *   **Reorder**: Drag and drop flags to reorder them. The custom order is saved automatically.
    *   **Pin**: Save frequently used flags to your "Pinned" list. Pinned flags are always shown in the popup.
    *   **Add New**: Manually add new feature flags via the input field at the bottom of the popup. You can also add a flag with `:false` suffix (e.g., `MyFlag:false`) to immediately force-disable it.
*   **Dark Mode**: Toggle between light and dark themes using the icon in the header. The preference is saved automatically.
*   **Smart Merging**: When on a portal page, the list shows both your pinned flags and any other flags currently active in the URL. The list is separated into "Saved" and "From URL" sections for clarity.
*   **Apply Changes**: Click "Apply Changes" to reload the page with the updated feature flags.
*   **Go to Portal**: If you are not on a portal page, click "Go to Portal" to navigate to `security.microsoft.com` with your enabled pinned flags applied.
*   **Send Feedback**: Click the envelope icon in the header to open your email client and send feedback to the extension maintainers.
*   **Dev Build Indicator**: When the extension is loaded as an unpacked (development) build, an orange `DEV` badge is shown on the toolbar action icon. The store-installed (prod) build shows no badge. Detection uses `chrome.management.getSelf().installType`.

### URL Syntax

The extension supports the following URL syntax for feature flags:

*   `?flight=FlagA,FlagB` - Enables FlagA and FlagB
*   `?flight=FlagA,FlagB:false` - Enables FlagA and force-disables FlagB (overrides default value to false)

### Supported Domains

*   `security.microsoft.com`
*   `security.officeppe.com`
*   `dev.security.microsoft.com`
*   `sip.security.microsoft.com`

## Contribution

### Project Structure

*   `manifest.json`: Extension configuration (Manifest V3).
*   `src/popup/`: Contains the popup UI (HTML, CSS, JS).
*   `src/utils/`: Helper scripts for URL parsing and storage management.
*   `assets/`: Icons and images.

### Development

1.  Make changes to the code in `src/`.
2.  Go to `chrome://extensions/` and click the refresh icon on the extension card to reload it.
3.  Test your changes on a supported Defender Portal URL.

### Adding New Features

*   **UI Changes**: Modify `src/popup/popup.html` and `src/popup/popup.css`.
*   **Logic Changes**: Update `src/popup/popup.js` for UI interaction or `src/utils/` for core logic.
*   **Permissions**: If new permissions are needed, update `manifest.json`.
*   **Permission Changes Require Explicit User Approval**: Do **not** add features that require changing the extension's permissions in `manifest.json` (including `permissions`, `host_permissions`, or `optional_permissions`) without first confirming with the user. If a proposed feature would require a new or expanded permission, stop and ask the user whether they want to proceed, explain which permission is needed and why, and only continue after explicit approval. Prefer alternative implementations that work with the existing permission set whenever possible.

### Best Practices

*   **Clean Code**: Follow standard JavaScript coding conventions.
*   **Documentation**: Update this file if you add significant new features or change the workflow. Always check if `AGENTS.md` needs to be updated when completing a task. Additionally, ensure that `README.md` is updated to reflect any new features or changes documented here.
*   **Error Handling**: Ensure the extension handles edge cases (e.g., invalid URLs, storage errors) gracefully.