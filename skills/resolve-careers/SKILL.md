---
name: resolve-careers
description: Resolves a list of company names to their official careers-page URLs, WebSearch only, no browser. Trigger as the first stage of a network scan, right after a batch of contacts has been pulled from contacts.csv, or standalone for "find the careers page for [company]" / "resolve [company]." Owns the resolution fields of company-careers.json. Do NOT use this to extract open roles from an already-resolved board (jobhunt:scan-roles) or to run a keyword search against public job boards (jobhunt:keyword-search).
---

# resolve-careers

This skill turns a list of company names into official careers-page URLs and keeps
`company-careers.json` current. It is WebSearch-only — no browser tools, and no
subagent fan-out for a normal batch. The cache's full field list, required-vs-optional
fields, and drift-tolerance rule are specified once, in
[`${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md`](${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md);
this skill does not restate them. Resolve `DATA_DIR` per
[`${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md`](${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md)
before doing anything else.

## Stages

**1. Dedupe.** Take the requested company list — a contact-range slice of
`contacts.csv`, or a single name given directly. Collapse to unique company names.
Blank-company rows and a contact's own name in the `Company` column are skipped, not
resolved; count them, don't silently drop them.

**2. Cache check.** For every unique name, look it up in `company-careers.json` before
touching WebSearch. Apply the freshness table in `data-formats.md`:

- `last_resolved` (or `last_checked` if `last_resolved` is absent) newer than the
  threshold → reuse the cached `careers_url` and `type`, no re-resolution.
- `type: "not_found"` older than its retry threshold → attempt resolution again.
- `type: "unresolved"` → never auto-retried. Carry it forward into this run's
  unresolved list without touching WebSearch.
- `ignored: true` → never re-resolved, regardless of age. Skip entirely.

All four thresholds default per `data-formats.md` and are overridable in
`preferences.md` → `## Scan Settings`; read that section fresh every run before
applying the defaults.

**3. Resolve.** For everything left, WebSearch only:

- Prefer the employer's own domain (`northwindsystems.com/careers`, not a link farm
  or a search-results page).
- A vendor-hosted official board — Greenhouse, Lever, Workday, Ashby, or another ATS
  — is a fine outcome when it is demonstrably that company's own board, not a
  third-party aggregation of it. Record the vendor as `type`.
- One confident result per company. If WebSearch turns up two or more plausible,
  unrelated companies sharing the name and nothing distinguishes them, that is
  `unresolved`, not a coin flip.

**4. Merge.** Write the resolved fields back into `company-careers.json` yourself,
matching the existing entry format exactly. Merge into the existing object; never
replace it, and never touch a field this skill does not own — `last_checked` and
`last_found_roles` belong to `jobhunt:scan-roles`, and a scan-roles run after yours
will fill or refresh them.

## Marking ambiguous and non-employer entries — never guessed

Two distinct outcomes, and they are not interchangeable:

- **Genuinely ambiguous** (the name is shared by multiple unrelated companies, or
  there is no confident match): `type: "unresolved"`, `careers_url: null`, a `note`
  explaining what made it ambiguous. This is surfaced in every future scan report
  until a human resolves it by hand — it is never silently retried and never guessed.
- **Not actually an employer** (a solo consultancy, a personal coaching or author
  brand, a placeholder contact-list entry): this is a decision, not a failed lookup.
  Set `ignored: true` with a required `note` stating why and the date. Keep `type`
  describing whatever the lookup actually found (usually `not_found`, since there is
  no careers board to record) — `ignored` is what carries the judgment call, `type`
  stays a description of the board. A future `resolve-careers` run skips an ignored
  entry outright; so does `scan-roles`.

Both are found in the course of a normal resolution — a WebSearch that surfaces
someone's personal "book me for a workshop" site instead of a company, or three
unrelated companies with the identical name, is exactly the signal that puts an entry
into one of these two buckets rather than being resolved on a guess.

## Do not

- Open a browser. If WebSearch can't settle a name with confidence, mark it
  `unresolved` with a note and move on — a browser-driven follow-up on a borderline
  case is `jobhunt:scan-roles` territory, not this skill's.
- Spawn subagents for a normal batch. A batch of contacts resolves fine in one
  context; see the minimal-delegation lesson in `team-memory.md` before fanning out.
- Touch `network-scan-history.md`, `job-search-history.md`, `job-history.md`,
  `JOBS_DIR`, or `preferences.md`. This skill's only write target is
  `company-careers.json`.

## Output format

One report: the company list processed and its size, a table of newly resolved
companies (name → URL → type), which entries were served from cache and how old they
were, the unresolved list with one-line reasons, the newly ignored list with reasons,
and confirmation of the cache write with the new total entry count. If a name needs a
human call that WebSearch genuinely can't settle, end with a
`NEEDS CLARIFICATION:` block.
