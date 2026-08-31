---
name: keyword-search
description: Runs board-agnostic keyword searches against the public job boards listed in preferences.md, fit-scores the results with the same rubric scan-roles uses, and logs them to job-search-history.md. Trigger for "search for [role/keyword]" or a periodic keyword sweep that isn't tied to a specific contact's employer. Do NOT use this for a network scan against known contacts' employers (jobhunt:scan-roles) or to resolve a single company's careers URL (jobhunt:resolve-careers). Never writes job-history.md.
---

# keyword-search

This skill runs keyword searches against whatever public job boards the user has
configured, scores the results, and logs them. It owns `job-search-history.md` and
only that file — never `network-scan-history.md`, and never `job-history.md`. The
exact table format and append-only rules are specified once, in
[`${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md`](${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md);
this skill does not restate them. Resolve `DATA_DIR` per
[`${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md`](${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md)
first.

## Where the boards come from

Nothing here is hardcoded. `preferences.md` → `## Search Sources` lists every board
this skill is allowed to search, each as a `board_url` plus a `search_url` pattern
with `{keywords}` and, optionally, `{location}` and `{page}` placeholders. If that
section is empty or absent, this skill has nothing to run against — say so plainly
rather than guessing at a board.

**One worked example:** `hiring.cafe` is a public job-search board with a URL-pattern
search interface, and it's a reasonable first entry for a `## Search Sources` block —
see the example in `data-formats.md`. It is named here only as an example of the
shape a source takes, not as a dependency; any board that exposes a URL-pattern
search works the same way.

## Keywords

Derive the keyword sets from `preferences.md` → `## Target Roles`, plus whatever
terms the user supplied for this run. A handful of role-phrase variants (e.g. "IT
director", "director of IT infrastructure") is normal; don't explode that into dozens
of near-duplicate queries per source.

## Stages

**1. Build the query set.** Keywords from Target Roles plus any user-supplied terms,
against every source in `## Search Sources`.

**2. Search each source.** Substitute into that source's `search_url` pattern and
navigate to it. **Apply the same listing-page discipline `jobhunt:scan-roles`
uses: never call a full-page-text extraction on a search-results page.** Extract
title/company/comp/location/URL with targeted selectors. A source's own listing page
is exactly the kind of page that discipline exists for; see
[`${CLAUDE_PLUGIN_ROOT}/skills/scan-roles/references/board-workarounds.md`](${CLAUDE_PLUGIN_ROOT}/skills/scan-roles/references/board-workarounds.md)
if a source's search UI resists automated navigation the way some ATS boards do.

**3. Cap and dedupe.** Cap results at 50 per source. Before scoring, drop anything
that's already a known entry in `company-careers.json` (the employer is already
tracked) or already logged in `job-history.md` (already applied or already passed
on) — count what got dropped.

**4. Score.** Every remaining result is scored with the identical rubric
`jobhunt:scan-roles` uses:
[`${CLAUDE_PLUGIN_ROOT}/skills/scan-roles/references/fit-scoring.md`](${CLAUDE_PLUGIN_ROOT}/skills/scan-roles/references/fit-scoring.md).
There is exactly one fit rubric in this plugin; this skill does not have its own.

**5. Log.** Append one dated section to `job-search-history.md`, per the format in
`data-formats.md`: scope sentence (sources searched, keyword sets, raw result count,
dedupe count), the results table with its leading `Source` column, and the closing
`**Result:**` line. Append-only — a later search never edits an earlier section.

**6. Save High fits.** Same as `jobhunt:scan-roles`: a High-fit result gets a
`jobs/[company-slug]-[role-slug]-[date]/posting.md` at scanner fill level, with
`**Source**` recording `keyword-search (YYYY-MM-DD)`.

## Ranking

Order the results table by **fit tier, then comp midpoint, then recency** — always,
regardless of what order the source itself returned them in. A board's own
"relevance" ranking is tuned for its own goals, not the user's stated preferences,
and is explicitly not used here.

## Do not

- Write to `job-history.md` or `network-scan-history.md`. Report what you found;
  results sourced from a keyword search belong in `job-search-history.md` only —
  mixing the two history files is a recorded lesson in `team-memory.md`.
- Trust a source's own relevance order as the final order.
- Skip the cap-and-dedupe step because a source returned "only" a handful of results
  — the dedupe check is what keeps a repeated search from re-scoring the same
  postings every run.

## Output format

1. **Top Matches** — High/Medium table: source, company, title, fit, comp, location,
   direct URL.
2. **Sources Searched** — which sources ran, raw counts, dedupe counts, any source
   that failed to load (flagged for retry, not silently skipped).
3. **Next Steps** — which High fits are ready for `appraiser` or `scrivener`.

End with a `NEEDS CLARIFICATION:` block if `## Search Sources` is empty or a
preference boundary is genuinely ambiguous for a specific result.
