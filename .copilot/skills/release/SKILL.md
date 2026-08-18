---
name: release
description: Automate a complete release for the Defender Portal Flags Chrome extension — version bump in manifest.json, release branch, changelog from conventional commits, production zip packaging, and optional tag/push. Use when the user says "release", "cut a release", "ship a new version", "bump version and package", or "package the extension".
---

# Release Skill — Defender Portal Flags

End-to-end release workflow for this Chrome extension. Combines version bump, changelog, and packaging into a single guided flow.

## When to use

Trigger this skill when the user asks to:
- "release", "cut a release", "ship v…", "new release"
- "bump version and package"
- "package the extension" (packaging-only — skip to step 5)

## Inputs to gather (via `ask_user`)

1. **Bump type** — choices: `patch`, `minor` (Recommended), `major`. Default: `minor`.
2. **Push & tag?** — after packaging: `Yes, push branch and tag`, `No, keep local`.

Never assume; ask these explicitly.

## Steps

### 1. Version management
- Read `manifest.json` and extract current `version` (semver `X.Y.Z`).
- Ask the user for bump type.
- Compute new version:
  - `patch` → `X.Y.(Z+1)`
  - `minor` → `X.(Y+1).0`
  - `major` → `(X+1).0.0`
- Verify the working tree is clean (`git status --porcelain`). If dirty, ask the user how to proceed (stash / abort / continue).

### 2. Branching
- Create and switch to: `release/doronkilzi/v<new_version>`
  - Matches the repo convention `{feature|bugfix|release}/doronkilzi/<short-description>`.
- Command: `git checkout -b release/doronkilzi/v<new_version>`

### 3. Update manifest
- Update **only** the `version` field in `manifest.json` (preserve formatting, trailing newline, and key order).
- Stage and commit:
  ```
  git add manifest.json
  git commit -m "chore(release): bump version to <new_version>

  Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
  ```

### 4. Generate release notes
- Determine the previous tag:
  ```
  git describe --tags --abbrev=0 2>/dev/null
  ```
- Collect commits:
  - If a previous tag exists: `git log <prev_tag>..HEAD --pretty=format:"%s (%h)"`
  - Otherwise: `git log --pretty=format:"%s (%h)"`
- Group by Conventional Commit type:
  - `feat:` → **Features**
  - `fix:` → **Fixes**
  - `chore:`, `refactor:`, `docs:`, `style:`, `test:`, `build:`, `ci:`, `perf:` → **Maintenance**
  - Anything else → **Other**
- Render markdown:
  ```markdown
  # Release v<new_version>

  <one-paragraph user-friendly summary>

  ## Features
  - <subject> (<short-sha>)

  ## Fixes
  - …

  ## Maintenance
  - …
  ```
- Display the changelog in a fenced code block so the user can copy it.
- Save a copy to the session folder at `<session>/files/release-notes-v<new_version>.md` for later reuse.

### 5. Packaging (equivalent to `/package`)
Produce a clean, store-ready zip.

- **Filename**: `DefenderPortalFlags-v<new_version>.zip` (at repo root).
- **Remove any stale zip with the same name first**: `rm -f DefenderPortalFlags-v<new_version>.zip`
- **Include** (recursively):
  - `manifest.json`
  - `src/`
  - `assets/`
  - `README.md`
  - `AGENTS.md`
- **Exclude**: `.git/`, `.roo/`, `.copilot/`, `plans/`, `.DS_Store`, any `*.zip`, `node_modules/` if present.
- Command:
  ```
  zip -r DefenderPortalFlags-v<new_version>.zip \
    manifest.json src assets README.md AGENTS.md \
    -x "*.DS_Store" "*/.DS_Store" "*.zip" "*/.git/*" ".roo/*" ".copilot/*" "plans/*" "node_modules/*"
  ```
- **Verify**: `unzip -l DefenderPortalFlags-v<new_version>.zip` — confirm `manifest.json` is at the archive root and the version inside matches `<new_version>`.
- Report: `Successfully created DefenderPortalFlags-v<new_version>.zip` with its absolute path and size.

### 6. Finalize
- Ask the user whether to push the branch and create the tag (per project rule: never push/tag without explicit permission).
- If **yes**:
  ```
  git push -u origin release/doronkilzi/v<new_version>
  git tag -a v<new_version> -m "Release v<new_version>"
  git push origin v<new_version>
  ```
  Then ask whether to open a PR (do not create it automatically).
- If **no**: stop and summarize local state.

### 7. Publish to the Chrome Web Store (manual final step)
- Open https://chrome.google.com/webstore/devconsole and sign in with the owner account.
- Select **Defender Portal Flags Manager**.
- Go to **Package**, choose **Upload new package**, and select `DefenderPortalFlags-v<new_version>.zip`.
- Confirm the dashboard recognizes version `<new_version>`. Resolve all upload validation errors before proceeding.
- Review **Store Listing**, **Privacy**, and **Distribution**. Update them only if the release changed behavior, data handling, or permissions.
- Submit the release for review. If offered, choose immediate or deferred publishing, then monitor the review status in the dashboard.
- This is a manual external step. Never claim store publication succeeded without user confirmation or dashboard evidence.
- Do not use automated browser actions to submit or publish without explicit user approval.

## Final output to user

Always end with:
- New version number
- Branch name
- Absolute path to the generated zip
- The rendered changelog (fenced markdown block)
- The manual Chrome Web Store publishing checklist and current confirmed status

## Guardrails

- **Never commit, push, tag, or merge without explicit user permission** (per repo `agents.md`).
- **Never modify `manifest.json` fields other than `version`.**
- **Never add a new permission** to `manifest.json` as part of a release.
- **Never edit `.roo/` or plans during a release.**
- **Never use automated browser actions to submit or publish a Chrome Web Store release without explicit user approval.**
- **Never report Chrome Web Store publication as successful without user confirmation or dashboard evidence.**
- If any git step fails, stop and surface the error — do not attempt destructive recovery (no `git reset --hard`, no force-push) without asking.
- Use the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer on every commit you create.
