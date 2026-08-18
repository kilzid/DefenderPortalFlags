# Defender Portal Flags Extension - Architecture

## Overview
A Chrome extension to manage feature flags (flights) for the Microsoft Defender Portal. It allows users to toggle flags on/off and persists a list of "pinned" flags that can be easily applied.

## Core Concepts

### 1. Flag Sources
The extension deals with two sources of truth for flags:
*   **URL Flags**: The flags currently present in the `flight` query parameter of the active tab.
*   **Pinned Flags**: A user-defined list of flags stored in `chrome.storage.local`.

### 2. Merging Logic (The "Smart View")
When the popup opens on a Defender Portal URL, the UI must merge these sources:
*   **Union**: Display all **Pinned Flags** AND any **URL Flags** that are currently active but not pinned.
*   **State Priority**:
    *   The *Toggle Switch* (On/Off) reflects the **Current URL State** (is the flag active right now?).
    *   The *Pin Icon* reflects the **Storage State** (is this flag saved for later?).

### 3. Scenarios

#### Scenario A: User is on a Defender Portal URL
*   **UI**: Shows the merged list.
*   **Action**: User toggles flags or pins/unpins them.
*   **"Apply Changes"**:
    1.  Collects all flags where `Toggle == ON`.
    2.  Constructs a new URL with these flags in the `flight` parameter.
    3.  Reloads the current tab.

#### Scenario B: User is NOT on a Defender Portal URL
*   **UI**: Shows only the **Pinned Flags** list.
*   **Action**: User can toggle the *preferred* state of pinned flags.
*   **"Go to Portal"**:
    1.  Collects all pinned flags where `Toggle == ON`.
    2.  Constructs a URL to `security.microsoft.com` with these flags.
    3.  Navigates the current tab to this URL.

## Data Structures

### Storage Schema (`chrome.storage.local`)
```json
{
  "pinnedFlags": {
    "PrecisionRedesign": true,  // true = enabled by default when applying
    "QRadarMigration": false    // false = disabled by default (but pinned for easy access)
  }
}
```

### URL Handling
*   **Parameter**: `flight`
*   **Format**: Comma-separated string (e.g., `flight=FlagA,FlagB`).
*   **Domain matching**: The five standard hostnames are canonical. The supported set contains each exact standard hostname and its exact `mto.`-prefixed counterpart; suffixes and wildcard matches are not accepted.
*   **Standard domains**:
    *   `security.microsoft.com`
    *   `security.officeppe.com`
    *   `dev.security.microsoft.com`
    *   `sip.security.microsoft.com`
    *   `df.security.microsoft.com`
*   **MTO domains**:
    *   `mto.security.microsoft.com`
    *   `mto.security.officeppe.com`
    *   `mto.dev.security.microsoft.com`
    *   `mto.sip.security.microsoft.com`
    *   `mto.df.security.microsoft.com`
*   **Shared behavior**: Both portal families use the same `flight` syntax and `chrome.storage.local` pinned flags. Navigation from a non-portal page remains on standard `security.microsoft.com`.

## Project Structure
```
/
├── manifest.json      # Manifest V3
├── agents.md          # User & Contributor guide
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js   # Main UI logic
│   └── utils/
│       ├── url-helper.js      # URL parsing/serialization
│       └── storage-helper.js  # Storage CRUD operations
└── assets/
    └── (icons)