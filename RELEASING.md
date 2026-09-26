# Releasing

Maintainer checklist for shipping a new version. The one rule that matters: **Claude Code only offers users an update when the `version` in `.claude-plugin/plugin.json` changes.** Pushing commits without bumping it means no one updates.

1. Bump `version` in `.claude-plugin/plugin.json` (SemVer: patch for wording fixes, minor for new/changed skill behaviour, major for renames/removals or contract changes).
2. Add a dated entry to `CHANGELOG.md`.
3. Commit, then tag and push:

   ```bash
   git tag v<version>
   git push origin main --tags
   ```

That's the whole release — every channel picks it up from the repo:

- **Claude Code:** users run `/plugin marketplace update specsgraph` (third-party marketplaces do not auto-update by default).
- **`npx skills` / Codex / Copilot:** users run `npx skills update`.
- **claude.ai:** re-zip the changed skill folder(s) and re-upload — uploads are point-in-time copies.
- **Community marketplace** (once listed): pinned to a commit SHA in `anthropics/claude-plugins-community`; CI bumps the pin on new commits, and the public catalog syncs nightly.

Notes:
- Do not add a `version` to the marketplace entry in `marketplace.json` — `plugin.json` is authoritative and a second field can mask stale versions.
- Frontmatter descriptions must not contain `": "` in the unquoted scalar — strict YAML parsers (e.g. the `skills` CLI) silently skip the skill.
- When `apps/mcp` in the product repo renames a tool or an argument, ship a minor (or major) release here in the same week; the skills name tools and arguments verbatim.
