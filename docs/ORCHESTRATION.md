# Orchestration

The jobhunt plugin doesn't require the experimental agent-teams feature — an orchestrating session (you, or your own top-level `CLAUDE.md` instructions) routes each request to the right agent through ordinary subagent invocation. This document is that routing map, kept in a form you can paste directly into your own `CLAUDE.md` so a fresh session routes correctly without you re-explaining it every time.

The same content ships as the `/jobhunt:route` command (`commands/route.md`) for when you'd rather invoke it in-session than maintain a copy in your own config. Keep whichever form you actually use current if the pipeline changes for you — the two are meant to be interchangeable, not synchronized automatically.

## The routing block

```markdown
## Job-search plugin routing (jobhunt)

- "Scan contacts N-M" → cartographer (resolve careers URLs) → lookout (scan/score, save High fits) → chronicler (log the batch)
- "Check if [company] is hiring" → lookout directly if the careers URL is already cached, otherwise cartographer first
- "Search for [role/keyword]" → lookout, via jobhunt:keyword-search
- A specific posting URL to assess → appraiser, which stops for your pursue/pass decision
- "Tailor/prepare materials for [posting]" → scrivener
- "Apply/submit/fill out [posting]" → envoy (its submit/send gates always need your own live confirmation — no approval from earlier in the conversation carries over)
- After any event lands (submitted, passed, drafted, a preference changed, an operational lesson learned) → chronicler
```

## Notes on using it

- **Route after the event, not before.** `chronicler` logs what already happened — a submission, a pass, a drafted set of materials — rather than being consulted up front. Every other agent reports what it did in its own task output; `chronicler` is the one that turns that report into a durable record.
- **`appraiser` is a stopping point, not a pass-through.** Even a direct "evaluate and tailor this posting" request should stop at the evaluation and wait for your pursue/pass call before handing off to `scrivener` — see `docs/ARCHITECTURE.md` for why.
- **Missing materials are `envoy`'s stop condition, not something it works around.** If you ask it to apply somewhere and `resume.md` (or `cover-letter.md`, when the form needs one) doesn't exist yet, it hands back to `scrivener` rather than drafting anything itself.
- **This block assumes the plugin's default namespace (`jobhunt:`).** If you've renamed anything locally, update the skill references accordingly — the agent names themselves (`cartographer`, `lookout`, `appraiser`, `scrivener`, `envoy`, `chronicler`) are what Claude Code actually dispatches on.
