# Artifact Gallery Maintenance Prompt

You are maintaining this repository's static AI artifact gallery. Work from the project root.

## Goal

Scan `content/`, read the current check report at `logs/check-{current-HEAD-hash}.json`, repair missing gallery metadata or assets, rerun validation, and commit any repository changes in categorized Conventional Commits.

## Required Workflow

1. Determine the current short HEAD hash:

   ```bash
   git rev-parse --short HEAD
   ```

2. Read `logs/check-{current-HEAD-hash}.json`.

   If the file does not exist, run:

   ```bash
   vp run check:gallery
   ```

   Then read the generated report.

3. Scan every HTML file under `content/`.

   For each page, derive or verify:

   - `url`: the relative path from the project root, such as `content/example.html`
   - `title.zh` and `title.en`
   - `description.zh` and `description.en`
   - `imageUrl`
   - `generatedAt`
   - `id`

4. Compare `content/`, `list.json`, and the check report.

   Repair `list.json` when:

   - an HTML file exists in `content/` but has no corresponding entry
   - an entry is missing `title.zh`, `title.en`, `description.zh`, or `description.en`
   - an entry has an invalid or missing `url`
   - an entry has an invalid or missing `generatedAt`
   - ids are missing, duplicated, or not ordered as integers

   Keep existing correct metadata when possible. When generating missing text, base it on the page title, headings, visible UI labels, and explanatory copy in the HTML.

5. Check every entry's HTML and image target.

   If an HTML target is missing, report it as a blocker unless there is an obvious matching file under `content/`.

   If an image is missing, empty, or points to a nonexistent file:

   - Check whether the dev server is already running at `http://127.0.0.1:8080/`.
   - If it is not running, start it with:

     ```bash
     vp dev
     ```

   - Track whether you started the server yourself.
   - Use browser automation to open the entry URL through the dev server.
   - Capture a square screenshot thumbnail.
   - Save it under `images/`.
   - Name it from the Chinese title in lowercase with spaces and punctuation converted to underscores. Keep Chinese characters as-is. Example: `梯度_散度_旋度交互可视化实验台_v7.png`.
   - Update `imageUrl` in `list.json`.
   - If you started the dev server yourself, stop it after all missing screenshots are generated.

6. Rerun validation:

   ```bash
   vp run check:gallery
   ```

   Read the new `logs/check-{current-HEAD-hash}.json` report and ensure `ok` is `true`.

   Do not commit files under `logs/`; they are local validation artifacts and are intentionally ignored.

7. If repository files changed, commit them in categorized batches.

   Before committing:

   - Run `git status --short --ignored`.
   - Exclude ignored directories such as `dist/`, `logs/`, and `node_modules/`.
   - Separate unrelated changes into separate commits.
   - Do not revert user changes.

   Use Angular/Conventional Commits format:

   - `feat(gallery): ...` for new gallery entries or user-facing gallery content
   - `fix(gallery): ...` for repaired metadata, links, or missing thumbnails
   - `refactor(content): ...` for content organization changes
   - `test(gallery): ...` for validation scripts or check-related code
   - `chore(dev): ...` for development tooling
   - `docs(prompts): ...` for prompt or documentation files

   Each commit must include:

   - a concise subject
   - a body explaining what changed
   - a body note explaining why the grouping belongs together

## Completion Response

Report:

- which files were changed
- whether screenshots were generated
- whether the dev server was started and stopped by you
- the validation result
- the commit hashes and subjects
