# claude-jobhunt

A six-agent job-search team for [Claude Code](https://claude.com/claude-code): it resolves the companies in your professional network to real careers pages, scans them (and keyword-searches public boards) for openings that actually fit, deep-dives a specific posting into an honest pursue-or-pass call, tailors a resume and cover letter that never claim what your work history doesn't back up, and fills out the application form up to the review page — where you always take it from there. It works for any profession: the design has nothing IT-specific baked into it, and `docs/CUSTOMIZING.md` walks through the same extension points from a nurse manager's, a marketing director's, and an academic administrator's target roles.

## The six agents

| Agent | Does | Model |
|---|---|---|
| **cartographer** | Resolves company names to official careers-page URLs. WebSearch only — no browser. | sonnet |
| **lookout** | Visits resolved careers boards and runs keyword searches against public job boards; fit-scores everything found and saves the High fits. | sonnet |
| **appraiser** | Deep-dives one specific posting — duplicate check, full requirements read, honest fit assessment — then **stops** for your pursue/pass decision. | opus |
| **scrivener** | Writes the tailored resume and cover letter and renders both to `.docx`, as one package so gap-handling never drifts between the two documents. | opus |
| **envoy** | Fills the ATS application form and drafts outreach messages. Never clicks Submit or Send — you always do. | sonnet |
| **chronicler** | The team's bookkeeper and memory curator. Sole writer of `job-history.md` and `team-memory.md`. | sonnet |

## The pipeline

```
"scan contacts 1-25"
   cartographer (resolve careers URLs)
        → lookout (scan + fit-score, save High fits)
             → appraiser (deep-dive one posting, stops for your decision)
                  → scrivener (tailored resume + cover letter + .docx)
                       → envoy (fill the ATS form to the review page)
                            → you click Submit
                                 → chronicler (log the outcome)
```

A keyword sweep against public boards ("search for [role/keyword]") runs through `lookout` too, logging to a separate history file so contact-sourced and board-sourced results are never mixed. After any event lands — submitted, passed, drafted, a preference change, a lesson learned — route to `chronicler`. The full routing map, ready to paste into your own `CLAUDE.md`, is in [`docs/ORCHESTRATION.md`](docs/ORCHESTRATION.md) and ships as the `/route` command too.

## 60-second quickstart

1. **Install the plugin** — from a marketplace or a direct git clone. See [`docs/INSTALL.md`](docs/INSTALL.md) for both.
2. **Run `jobhunt:setup`.** It interviews you (or reads a resume file you point it at) and builds your personal data directory — preferences, work history, application answers — from the shipped templates. Nothing about you ships with the plugin; this is where your data starts existing.
3. **Say:** *"scan my contacts' companies for openings."* The team resolves your contacts' employers to careers pages, scans them, and reports back what's a fit.

## Prerequisites at a glance

- **Claude Code with plugin support.**
- **Node.js 18+**, with `npm install` run once in `scripts/` — needed for the markdown-to-`.docx` renderer.
- **The `claude-in-chrome` browser MCP** — needed by lookout, appraiser, scrivener, and envoy to actually visit pages and fill forms. `cartographer` (WebSearch only) and `chronicler` (files only) work without it. See `docs/INSTALL.md` for exactly what degrades without it.

## Scope and limits

Read this before you trust it with anything:

- **It never submits an application for you.** Every agent that touches a form stops at the review page. You review it and click Submit yourself — always, no exceptions, no matter how confident an approval sounded a few turns ago. See [`docs/SAFETY.md`](docs/SAFETY.md) for why that line is fixed rather than configurable.
- **It cannot upload a PDF or DOCX to a form.** The available browser tooling can only upload images. When a form wants a resume or cover-letter file, the plugin tells you the file path and asks you to attach it by hand.
- **Most of what it does needs a browser MCP.** Without `claude-in-chrome`, resolving careers URLs and bookkeeping still work; scanning, evaluating, drafting-with-live-posting-context, and filling forms don't.
- **It is opinionated about honesty in your materials.** It will not invent a certification, a tool, a metric, or a headcount that isn't in your documented work history, and it will name a real gap in your own voice rather than write around it. If that's not the kind of application help you want, this isn't the right tool.

## What deliberately stays out

A few things are absent on purpose, not by oversight:

- **No third-party skill text.** Every agent and skill in this repository was written from scratch for this project, so it carries no entanglement with any proprietary system.
- **No personal data.** No real names, employers, resumes, or search history ship anywhere in this repo — only templates and one fully synthetic example persona.
- **No auto-submit, no auto-send, no account creation, and no authentication handling.** These are product boundaries, not missing features — see `docs/SAFETY.md`.

## Learn more

- [`examples/`](examples/) — one fully worked, fictional application end to end (posting, resume, cover letter, application record) — see what "good" looks like before you generate your own
- [`docs/INSTALL.md`](docs/INSTALL.md) — installing the plugin and its prerequisites
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — the six agents and why the boundaries between them are where they are
- [`docs/DATA-FORMATS.md`](docs/DATA-FORMATS.md) — a tour of every file the team reads and writes
- [`docs/CUSTOMIZING.md`](docs/CUSTOMIZING.md) — the extension points: your own voice skill, scoring overrides, search sources, board workarounds
- [`docs/SAFETY.md`](docs/SAFETY.md) — the safety model in full
- [`docs/ORCHESTRATION.md`](docs/ORCHESTRATION.md) — the routing block for your own `CLAUDE.md`
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — how to contribute
- [`CHANGELOG.md`](CHANGELOG.md) — release history

## License

MIT — see [`LICENSE`](LICENSE).
