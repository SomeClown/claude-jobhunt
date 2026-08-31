---
description: Show how jobhunt requests map to its six agents, and apply that routing for the rest of this session.
---

Use this routing map for job-search requests for the remainder of this session — dispatch to the named agent rather than doing the work directly, and tell the user which agent you're routing to.

## Job-search plugin routing (jobhunt)

- "Scan contacts N-M" → cartographer (resolve careers URLs) → lookout (scan/score, save High fits) → chronicler (log the batch)
- "Check if [company] is hiring" → lookout directly if the careers URL is already cached, otherwise cartographer first
- "Search for [role/keyword]" → lookout, via jobhunt:keyword-search
- A specific posting URL to assess → appraiser, which stops for the user's pursue/pass decision
- "Tailor/prepare materials for [posting]" → scrivener
- "Apply/submit/fill out [posting]" → envoy (its submit/send gates always need the user's own live confirmation — no approval from earlier in the conversation carries over)
- After any event lands (submitted, passed, drafted, a preference changed, an operational lesson learned) → chronicler

Notes:

- `appraiser` is a stopping point, not a pass-through — even a direct "evaluate and tailor this" request stops at the evaluation and waits for the user's pursue/pass call before any handoff to `scrivener`.
- Missing materials are `envoy`'s stop condition, not something it works around — if `resume.md` (or `cover-letter.md`, when needed) doesn't exist yet, it hands back to `scrivener` rather than drafting anything itself.
- If no `DATA_DIR` is set up yet, route to `jobhunt:setup` first regardless of what was asked — every agent above depends on it existing.

The full explanation of this routing, including why `appraiser` stops and why `envoy`'s gates don't bend, is in `docs/ORCHESTRATION.md`, `docs/ARCHITECTURE.md`, and `docs/SAFETY.md`.
