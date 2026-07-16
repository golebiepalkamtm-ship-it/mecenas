---
name: Extension Publisher
description: Automates the process of building the VS Code extension, creating a GitHub Release, and publishing it to the Open VSX Registry.
---
# Extension Publisher

This skill helps AI Agents and developers automatically release the VS Code extension to both GitHub and the Open VSX marketplace.

## Prerequisites

1.  **Version Bump**: Make sure the `version` in `package.json` is updated and changes are committed.
2.  **GitHub CLI (`gh`)**: Ensure you are logged into the GitHub CLI. (You can check by running `gh auth status`).
3.  **Open VSX Access Token**: You need a Personal Access Token from [open-vsx.org](https://open-vsx.org/).
    *   Store your raw Open VSX token inside the `.env` file in the root of the project.
    *   The Agent will automatically read this `.env` file to retrieve the token for publishing.

---

## Publishing Workflow

When asked to publish a release, the Agent should follow these steps strictly in order. Replace `<version>` with the current version from `package.json`.

### Step 1: Package the Extension
First, build the `.vsix` packaging file using `vsce`.
```bash
vsce package
```
*Take note of the generated `.vsix` filename (e.g., `skill-monitor-`).*

### Step 2: Create a GitHub Release
Use the GitHub CLI to create a release, using `CHANGELOG.md` for the release notes, and attach the `.vsix` file.

```bash
# Example: replace <version> with 0.0.7
gh release create <version> --title "Release v<version>" --notes-file CHANGELOG.md ./skill-monitor-<version>.vsix
```

### Step 3: Publish to Open VSX Registry
Use the `ovsx` cli wrapper (via `npx` to avoid global installs) to publish the `.vsix` file to the Open VSX marketplace.

First, read the token from the `.env` file, then pass it to the publish command.

```bash
# Read the token from .env and publish
# Example: replace <version> with 0.0.7
export OVSX_PAT=$(cat .env)
npx ovsx publish ./skill-monitor-<version>.vsix -p $OVSX_PAT
```

---

## Verification
*   Check the [GitHub Releases](https://github.com/) page for the repository to ensure the `.vsix` asset is attached properly.
*   Check the [Open VSX Registry](https://open-vsx.org/) to ensure the new version is live.
