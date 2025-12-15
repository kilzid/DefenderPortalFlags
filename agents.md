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
    *   **Filter**: Quickly find flags by typing their name in the search box.
    *   **Pin**: Save frequently used flags to your "Pinned" list. Pinned flags are always shown in the popup.
    *   **Add New**: Manually add new feature flags via the input field at the bottom of the popup.
*   **Dark Mode**: Toggle between light and dark themes using the icon in the header. The preference is saved automatically.
*   **Smart Merging**: When on a portal page, the list shows both your pinned flags and any other flags currently active in the URL.
*   **Apply Changes**: Click "Apply Changes" to reload the page with the updated feature flags.
*   **Go to Portal**: If you are not on a portal page, click "Go to Portal" to navigate to `security.microsoft.com` with your enabled pinned flags applied.

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

### Best Practices

*   **Clean Code**: Follow standard JavaScript coding conventions.
*   **Documentation**: Update this file if you add significant new features or change the workflow. Always check if `AGENTS.md` needs to be updated when completing a task.
*   **Error Handling**: Ensure the extension handles edge cases (e.g., invalid URLs, storage errors) gracefully.