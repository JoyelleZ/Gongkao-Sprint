# Handoff

## Obsidian Community Review

- Version `0.1.2` has completed the Obsidian Community Directory automated checks, but the completed review snapshot references commit `8d831c7`.
- The local and remote `0.1.2` tag later pointed to `08eae48`, and the GitHub Release `0.1.2` assets matched `08eae48`.
- Because the completed review snapshot and published Release assets no longer match, do not continue using `0.1.2` for review.
- Treat `0.1.2` as frozen.
- Do not overwrite the `0.1.2` GitHub Release assets.
- Do not delete, move, or recreate the `0.1.2` tag without explicit maintainer approval.
- Prepare the current real code and release assets as `0.1.3` for a fresh complete Obsidian Community Directory review.

## Current Consistency Check

- Local branch: `main`.
- Local working tree was clean before this handoff note was added.
- Current local and remote `0.1.2` tag resolved to `08eae48`, not `8d831c7`.
- GitHub Release `0.1.2` assets matched `08eae48` for `main.js`, `manifest.json`, and `styles.css` during the check.
- `manifest.json`, `package.json`, `package-lock.json`, and `versions.json` are being prepared for version `0.1.3`.

## Release Policy

- Never overwrite release assets for an already published version.
- If any fix is needed after this point, prepare it in a new patch version.
- Before publishing `0.1.3`, verify build, tests, lint, tag target, and release asset hashes against the intended commit.
