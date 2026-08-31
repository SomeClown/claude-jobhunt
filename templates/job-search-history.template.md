# Job Search History

Append-only log of keyword searches run by `jobhunt:keyword-search`.

---

Each search appends a dated `## YYYY-MM-DD - Keyword Search (scope)` section below
this line, ordered oldest first — see `reference/data-formats.md` ->
`job-search-history.md` for the required scope sentence, table columns (including
the leading `Source` column), and closing `**Result:**` line. Existing sections are
never edited once appended. Never mixed with `network-scan-history.md` or
`job-history.md`. If no `##` section follows, no search has run yet.
