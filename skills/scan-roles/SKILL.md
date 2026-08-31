---
name: scan-roles
description: Visits already-resolved careers boards, extracts open roles, fit-scores them against preferences.md and profile.md, and saves High-fit postings. Trigger after jobhunt:resolve-careers has resolved a batch's careers URLs, or standalone for "check if [company] is hiring" when the careers URL is already cached. Writes network-scan-history.md and refreshes company-careers.json's scan fields. Do NOT use this to resolve careers URLs from scratch (jobhunt:resolve-careers), to run a keyword search across public job boards (jobhunt:keyword-search), to deep-dive one specific posting (appraiser), or to draft any materials.
---

# scan-roles

This skill scans resolved careers boards, extracts what's open, fit-scores every
plausible role, and saves the High fits. It owns `network-scan-history.md`, the
`last_checked`/`last_found_roles`/`ignored` fields of `company-careers.json`, and
High-fit `posting.md` saves. The exact shape of every file it touches is specified
once, in
[`${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md`](${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md) —
this skill does not restate it. Resolve `DATA_DIR` per
[`${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md`](${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md)
first, and read `preferences.md` fresh on every run — target titles, comp floor, and
dealbreakers change, and a stale read scores against yesterday's criteria.

## The single most important rule in this skill

**Never call a full-page-text extraction on a search-results page or a full careers
board.** A listing page can carry hundreds of roles' worth of markup; pulling all of
it into context is the number one way this skill blows out its context window before
it finishes a batch. Extract title/location/comp/URL with targeted DOM selectors
(`javascript_tool`, or a structured page-read tool scoped to the listing rows), never
a full-text dump of the page.

Full-page-text extraction is fine, and often the right tool, on a single **resolved
posting page** once you're looking at one specific role — that page is small and the
prose matters.

Some boards actively resist automated navigation of their listing pages (search boxes
that don't register simulated clicks, pagination that silently no-ops). Those have
real, vendor-specific workarounds; see
[`references/board-workarounds.md`](${CLAUDE_PLUGIN_ROOT}/skills/scan-roles/references/board-workarounds.md)
before fighting a UI element that isn't responding.

## Stages

**1. Load preferences.** Read `preferences.md` in full at the start of the run —
target roles and their bands, location model, comp floor, dealbreakers, and any
`## Scoring Overrides`.

**2. Per company, extract listings.** Skip any entry marked `ignored: true` entirely
— don't open its board, don't re-check it, don't count it as scanned. For everything
else, open the cached `careers_url` and pull the open-role list per the discipline
above. If the board is unreachable (TLS error, 404, indefinite load, CAPTCHA wall),
record it as broken and flagged for retry next run — **never** as confirmed-empty.
Those are different facts and the distinction has to survive into the report and the
history file.

**3. Score.** Every plausible role — one whose title is at least in the neighborhood
of the target bands — gets scored against the rubric in
[`references/fit-scoring.md`](${CLAUDE_PLUGIN_ROOT}/skills/scan-roles/references/fit-scoring.md).
Read that file for the full deterministic procedure; don't improvise a scoring call
here.

**4. Save High fits.** A High-fit role gets `jobs/[company-slug]-[role-slug]-[date]/posting.md`
written at scanner fill level, per the canonical schema in `data-formats.md`. That
file is the handoff to `appraiser` and `scrivener` — get the metadata block
right even when the prose sections are thin.

**5. Log the batch.** Append one section to `network-scan-history.md` in the format
`data-formats.md` specifies: scope sentence, results table, unresolved-boards
subsection if any, and the closing bold `**Result:**` line. This file is append-only
— never edit an earlier section, even to correct it; a correction is a new section.

**6. Refresh the cache.** For every company actually scanned this run (not the
ignored ones, not the ones skipped because their board was unreachable before any
listing could be read), update `last_checked` and `last_found_roles` in
`company-careers.json`. Merge into the existing entry; never touch `careers_url`,
`type`, or `last_resolved` — those belong to `jobhunt:resolve-careers`.

## Do not

- Spawn subagents for a batch of a normal size. See the minimal-delegation lesson in
  `team-memory.md` before fanning out, and if a batch is genuinely huge, say the real
  numbers and ask before doing anything else.
- Resolve a careers URL from scratch. An entry with no cached URL, or one gone stale
  past its resolution threshold, is `jobhunt:resolve-careers`'s job — hand it back
  rather than improvising a WebSearch here.
- Deep-dive a posting, draft outreach, or write any resume/cover-letter content. Save
  or report the posting and stop.
- Write to `job-history.md`. Report what you found; the chronicler logs it.
- Mark a board confirmed-empty when it was actually unreachable. If you couldn't read
  it, say so.

## Output format

1. **Top Matches** — a High/Medium table: company, title, fit, comp, location,
   network contact if one exists, and the direct employer URL (never an aggregator
   link).
2. **Companies Checked** — a brief no-match tally, plus anything unresolved or
   broken, flagged for retry.
3. **Next Steps** — which High fits are ready for `appraiser` or `scrivener`.
   Don't offer to do that work in this same pass.

End with a `NEEDS CLARIFICATION:` block if a preference boundary is genuinely
ambiguous for a specific posting.
