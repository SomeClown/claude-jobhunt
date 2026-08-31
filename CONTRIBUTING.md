# Contributing

## The no-PII rule

This repository ships as a public, MIT-licensed package, so it carries zero personal data — no real names, emails, phone numbers, locations, or employers, anywhere, from anyone. Every example anywhere in this repo is synthetic (the persona **Alex Rivera**, employer **Northwind Systems**, and similar invented names elsewhere). The one deliberate exception is the project's own attribution in `LICENSE` and `.claude-plugin/plugin.json` — do not add that name or email anywhere else, including in an example, a doc, or a template.

**Enforcement: `scripts/check-no-pii.sh`.** It's not a name-and-address blocklist — it greps for pattern *classes* an identifying string would fall into (an absolute home-directory path, a Claude Code project-memory path, an email shape, a US phone-number shape) plus a short, explicit list of retired-system name tokens — read the script's own header comment for exactly which — that would indicate content leaked in from the private system this plugin was extracted from. It allowlists the project's own attribution strings, but only inside the two files where they're supposed to appear. Run it before opening a PR:

```
bash scripts/check-no-pii.sh
```

It's also wired into CI (`.github/workflows/ci.yml`), including a self-test step that seeds a known violation and confirms the guard actually fires — a guard that never triggers is worse than no guard.

**What it can't catch:** a bare personal name or a specific employer name typed into prose has no reliable regex. If you're a maintainer who needs to check for something specific you know might leak (without ever writing that string into a public script), create a gitignored `.pii-patterns.local` at the repo root — one extended-regex pattern per line, `#` comments and blank lines ignored — and the script will additionally grep for everything in it. This file is never committed; it's how a deeper, maintainer-specific scan is possible without ever publishing what it's scanning for.

## `scripts/validate-agents.js` and the frontmatter rule

`validate-agents.js` checks agent frontmatter shape (`name`/`description`/`tools`/`model`/`version` present, `name` matches the filename, `version` is plain semver), that every `jobhunt:<skill>` reference resolves to a real skill, that every `CLAUDE_PLUGIN_ROOT`-relative path reference resolves to a real file or directory, and — the part that matters most — that each agent's `tools:` list matches the checked-in snapshot in `scripts/expected-agent-tools.json`.

**Agent frontmatter `tools:` lists are never regenerated casually.** The absence of the `Agent` tool from `cartographer`, `lookout`, `appraiser`, and `scrivener` is a deliberate fix for a specific, previously-observed fan-out stall (see `docs/ARCHITECTURE.md` for the full reasoning) — not an oversight a "helpful" regeneration pass should quietly correct by adding it back for consistency, and not a list to hand-copy from a similar-looking agent without checking what it grants. `scripts/expected-agent-tools.json` exists specifically to make a silent change here loud: if a PR changes an agent's tool list without also updating the snapshot (with the reason stated in the PR description), `validate-agents.js` fails the build.

If a tool list genuinely needs to change — a new capability an agent legitimately needs — update the agent's frontmatter **and** `scripts/expected-agent-tools.json` in the same change, and say why in the PR description. Adding `Agent` to anything outside `envoy` needs a stronger justification than convenience, since it re-enables the exact failure class the restriction exists to prevent.

Run both checks locally before opening a PR:

```
bash scripts/check-no-pii.sh
node scripts/validate-agents.js
```

## Adding a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` frontmatter (see any existing skill for the shape — `description` should say what triggers the skill and what it explicitly is *not* for, the same way the shipped skills do).
2. State what the skill owns — which file(s) it's the writer of — in its opening paragraph, and link to `reference/data-formats.md` for the format rather than restating it. A format fix should land in exactly one place.
3. If the skill needs supporting reference material too long for the main file, put it in `skills/<name>/references/` and link to it.
4. If the skill is driven by one of the six agents, update that agent's "Skills you drive" section and, if it needs new tools to do so, its frontmatter `tools:` list **and** `scripts/expected-agent-tools.json` together.
5. Run `node scripts/validate-agents.js` — it checks that any `jobhunt:<skill>` reference to your new skill resolves.

## Version-bump convention

Each of the six agents carries its own `version: X.Y.Z` in frontmatter, independent of the plugin's own version in `.claude-plugin/plugin.json`.

- **Patch** (`1.0.0` → `1.0.1`) — wording or clarity fixes that don't change what the agent does or produces.
- **Minor** (`1.0.0` → `1.1.0`) — a new capability, a new skill it drives, or a behavior addition that doesn't break an existing file format or workflow.
- **Major** (`1.0.0` → `2.0.0`) — a change to a file format the agent owns, a tool-list change, or anything that would make an existing `DATA_DIR` need migration.

Bump `.claude-plugin/plugin.json`'s `version` on release, reflecting the combined set of changes since the last one — it doesn't need to move in lockstep with any single agent's version.
