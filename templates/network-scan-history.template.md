# Network Scan History

Append-only log of network scans run by `jobhunt:scan-roles`.

---

Each scan appends a dated `## YYYY-MM-DD - Network Scan (scope)` section below this
line, ordered oldest first — see `reference/data-formats.md` -> `network-scan-history.md`
for the required scope sentence, table columns, and closing `**Result:**` line.
Existing sections are never edited once appended. If no `##` section follows, no scan
has run yet.
