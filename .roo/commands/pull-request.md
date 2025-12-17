---
description: Automate PR creation: generates title/desc, handles branching, commits, pushes, and opens PR via gh CLI
mode: code
---

Analyze recent changes to automate the Pull Request process using GitHub CLI (`gh`).

Follow these steps:

1.  **Pre-flight Check**:
    - **Auth Check**: Run `gh auth status`. If the user is not logged in, instruct them to run `gh auth login` and exit the process.
    - **Staged Files**: Check if there are staged files (`git diff --cached --name-only`).
    - If no files are staged, ask the user to stage files first and exit.

2.  **Generate Content**:
    - Analyze **ONLY** the staged files.
    - Generate a **PR Title** following Conventional Commits (e.g., `feat: add user login`, `fix: resolve crash on startup`).
    - Generate a **PR Description** in Markdown format. Structure it as follows:
        - **## Summary**: High-level overview.
        - **## Changes**: Bullet points of specific file changes.
        - **## Motivation**: Why this change is needed.
        - **## Screenshots**: (Leave blank if not applicable, but include the header).

3.  **Branch Management**:
    - Check the current branch name.
    - If the current branch is `main`, `master`, or `develop`:
        - Generate a new branch name from the PR Title (lowercase, kebab-case, e.g., `feat/add-user-login`).
        - Ask the user: "You are on [current_branch]. Create and switch to new branch '[new_branch]'?"
        - If yes, run `git checkout -b [new_branch]`.
    - If already on a feature branch, proceed.

4.  **Review & Confirm**:
    - Present the generated PR Title and Description to the user.
    - Ask for confirmation to proceed with:
      1. Committing with message: "[PR Title]"
      2. Pushing to origin
      3. Creating PR with `gh`

5.  **Execute**:
    - If confirmed:
        - Run `git commit -m "[PR Title]"`
        - Run `git push -u origin HEAD`
        - Run `gh pr create --title "[PR Title]" --body "[PR Description]"`
    - If successful, output the link to the new PR.