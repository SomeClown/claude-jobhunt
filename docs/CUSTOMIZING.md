# Customizing

Everything in this document is a config change inside your own `preferences.md` (or, for board workarounds, a skill reference file) — no agent or skill source needs editing for any of it. Every example below is a different profession on purpose: this plugin has nothing IT-specific in its design, and the examples here are a marketing director, a nurse manager, and an academic administrator, none of whom appear anywhere else in this repo.

## Bring your own voice skill

`scrivener` writes cover letters with a plain, direct default register — see `skills/cover-letter/SKILL.md`. If you have (or write) your own skill that describes a personal writing voice, you can plug it into the cover-letter step instead.

**The contract a voice skill has to meet:**

- It describes a **register**, not a template — a way of phrasing things, not fixed sentences to insert.
- It applies at the **professional/formal** level, even if the skill's own range is wider (a voice skill written for casual writing generally has to say explicitly how it scales down for a job application).
- It runs its **own self-check** before the letter is presented as final — whatever internal consistency rule the voice skill claims for itself, it verifies that rule, not just asserts it.

**How to declare one.** In `preferences.md`:

```markdown
## Voice
- voice_skill: my-plugin:my-voice-skill
```

`scrivener` loads it via `Skill` and applies it — see `skills/cover-letter/SKILL.md`'s "bring-your-own-voice slot" for exactly when it hands off.

**What happens with none declared.** `voice_skill: none`, or the `## Voice` section left out entirely, is a fully supported, complete configuration — `jobhunt:cover-letter`'s own default register applies: plain, direct, no corporate jargon, willing to name a weak point without hedging it into meaninglessness. You do not need a voice skill to use this plugin; it's an optional refinement, not a missing piece.

## `## Scan Settings` — freshness overrides

Controls how long a `company-careers.json` entry stays trusted before the team re-checks it. Defaults live in `reference/data-formats.md`; override any of them in `preferences.md`:

```markdown
## Scan Settings
- last_resolved_days: 90
- last_checked_days: 14
- not_found_retry_days: 180
- unresolved_retry: never
- contact_order: connected_on_desc
```

A slower-moving field — say, a search where you're only checking a handful of target employers every few weeks rather than running frequent batch scans — might raise `last_checked_days` so the team doesn't re-scan boards that haven't had time to change. A search running through a hiring surge might lower it instead.

## `## Scoring Overrides` — adjusting the fit rubric

The base rubric (`skills/scan-roles/references/fit-scoring.md`) is deliberately generic — function match, title band, comp, location, a closed list of screen-out requirements. `## Scoring Overrides` in `preferences.md` is a free-form bullet list of adjustments layered on top of it; the base rubric always runs first, and an override modifies its output rather than replacing the procedure.

**A marketing director's target roles and overrides**, for example:

```markdown
## Target Roles
- Director of Marketing
- Head of Brand Marketing
- VP Marketing (regional or divisional, not global)

## Scoring Overrides
- Agency-side roles are Adjacent function, not Match — the accountability (running
  campaigns for many clients) differs from the target function (owning one
  company's brand and demand strategy), even where the skills overlap heavily.
- A role that's actually "Head of Growth" with marketing as one function among
  several caps at Medium regardless of title band, unless brand/demand marketing
  is explicitly the majority of the mandate.
```

**A nurse manager's**, showing a different kind of override — one driven by schedule rather than function:

```markdown
## Target Roles
- Nurse Manager
- Assistant Director of Nursing
- Clinical Operations Manager, Nursing

## Scoring Overrides
- A posting requiring rotating night/weekend charge shifts scores one factor
  (as if title were one band off) even when everything else about the role is a
  clean match — the schedule constraint matters as much as the title band does,
  and the default rubric has no schedule check of its own.
- Comp unlisted at a unionized public-sector employer is treated as in-range, not
  neutral — pay bands at these employers are reliably public via the union
  contract even when the posting itself omits them.
```

## `## Search Sources` — board-agnostic keyword search

`jobhunt:keyword-search` has no hardcoded board. `## Search Sources` in `preferences.md` lists every board it's allowed to search, each as a board name plus a `search_url` pattern with `{keywords}` and optionally `{location}`/`{page}` placeholders:

```markdown
## Search Sources
- **Example Higher-Ed Careers Board**
  - board_url: https://careers.example-heconsortium.org/
  - search_url: https://careers.example-heconsortium.org/search?q={keywords}&loc={location}&page={page}
  - notes: results page; never extract full page text, use targeted selectors
```

**An academic administrator's target roles**, to go with a source like the one above:

```markdown
## Target Roles
- Director of Student Affairs
- Assistant Dean, Academic Affairs
- Associate Director, Enrollment Management
```

An empty or absent `## Search Sources` section is valid — it just means `jobhunt:keyword-search` has nothing to run against yet, and it says so plainly rather than guessing at a board. Add one entry at a time as you find boards worth sweeping regularly.

## Adding an ATS board workaround

`skills/scan-roles/references/board-workarounds.md` documents automation quirks by **ATS vendor** (Workday, Greenhouse, Rails/Turbo-Stream boards, Ashby) — never by employer name, because a workaround pinned to one employer belongs in that employer's `company-careers.json` `note` field instead, where a reader will actually see it in context.

If you hit a board that resists automated navigation in a way not already documented there:

1. Confirm it's a **vendor-level** pattern (try it against a second board on the same ATS if you can) rather than one employer's own site quirk.
2. Add a section to `board-workarounds.md` following the existing shape: name the symptom, then "what tends to work instead," stated as a technique to try rather than a guarantee.
3. If it's specific to one employer's board instead, record it as a `note` on that company's `company-careers.json` entry — see `reference/data-formats.md` for the field.

The general principle stated at the top of that file — prefer the board's own data endpoint over simulating UI clicks — solves most new cases before a vendor-specific entry is even needed.
