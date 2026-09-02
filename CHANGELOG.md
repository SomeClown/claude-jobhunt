# Changelog

All notable changes to this project are recorded here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/); versioning is semver for the plugin as a whole (individual agents carry their own independent `version` in frontmatter — see `CONTRIBUTING.md`).

## 0.2.0 — 2026-09-02

**Breaking change to the data layout.** `DATA_DIR/jobs/` and `DATA_DIR/outputs/` are
split out of `DATA_DIR` entirely, into a second, independently-resolved directory,
`JOBS_DIR`. `JOBS_DIR/input/[slug]/` replaces `DATA_DIR/jobs/[slug]/posting.md`;
`JOBS_DIR/output/[slug]/` replaces both `DATA_DIR/jobs/[slug]/{resume.md,cover-letter.md,applied.md}`
and `DATA_DIR/outputs/[slug]/*.docx` — tailored markdown sources and their rendered
`.docx` pair are now siblings in the same folder, instead of split across two
different trees.

- `JOBS_DIR` resolves the same way `DATA_DIR` does — `$JOBHUNT_JOBS_DIR`, then
  `./job-hunt/`, then `~/job-hunt/` — but deliberately without a leading dot: it
  holds the postings and finished documents a user actually goes looking for, not
  bookkeeping. Full resolution order and the reasoning for the visibility split are
  in `reference/data-dir.md`.
- `scripts/render.js` now takes `--jobs-dir` (mirroring the old `--data-dir`) and
  reads and writes entirely within `JOBS_DIR/output/<slug>/`; `--data-dir` is
  removed, since the renderer no longer touches `DATA_DIR` at all.
- `jobhunt:setup` resolves and scaffolds `JOBS_DIR` (empty `input/` and `output/`)
  alongside `DATA_DIR`, independently, with the same set-but-nonexistent error rule
  and the same never-guess, ask-first stance on creating either one.
- Every agent, skill, reference doc, template, and the shipped `examples/` fixture
  are updated to the new paths. `DATA_DIR`'s own resolution, its dot-prefix
  convention, and the files that stay there (`profile.md`, `preferences.md`,
  `job-history.md`, `team-memory.md`, `application-data.md`, `company-careers.json`,
  the two history logs, `contacts.csv`) are unchanged.

## 0.1.0 — 2026-08-31

Initial release.

- **Six agents** (`agents/`): `cartographer` (company → careers-URL resolution), `lookout` (board scanning, keyword search, fit-scoring), `appraiser` (single-posting deep dive, stops for a pursue/pass decision), `scrivener` (tailored resume, cover letter, and rendered `.docx`, kept together), `envoy` (ATS form-filling and outreach drafting, hard submit/send gates), and `chronicler` (bookkeeping and shared memory, sole writer of `job-history.md` and `team-memory.md`). Named on a deliberate guild theme — each name describes the agent's function and is distinctive enough to be unlikely to collide with agents a user already has configured.
- **Eight skills** (`skills/`): `setup`, `resolve-careers`, `scan-roles` (with a deterministic fit-scoring rubric and ATS-vendor board-workaround notes), `keyword-search`, `tailor-resume` (with measurable, non-numeric-Flesch writing rules), `cover-letter` (with the bring-your-own-voice-skill extension point), `apply` (with its own fill-subagent contract), and `render-docx`.
- **A markdown-driven `.docx` renderer** (`scripts/render.js` and `scripts/lib/`) — `resume.md`/`cover-letter.md` are the single source of truth; there is no per-application build script to hand-edit.
- **Canonical data specs** (`reference/`): `data-dir.md` (directory resolution), `data-formats.md` (every file the team reads or writes, with ownership rules), and `team-memory.md` (the single-writer memory contract).
- **Templates** for a fresh data directory (`templates/`) and a synthetic example job folder (`examples/jobs/`).
- **Hygiene tooling**: `scripts/check-no-pii.sh` (repo-wide PII and retired-name guard, with a self-test), `scripts/validate-agents.js` (frontmatter shape, tool-list regression guard, skill/path reference checks), and a CI workflow running both plus the renderer's test suite.
- **Documentation**: this README, `docs/INSTALL.md`, `docs/ARCHITECTURE.md`, `docs/DATA-FORMATS.md`, `docs/CUSTOMIZING.md`, `docs/SAFETY.md`, `docs/ORCHESTRATION.md`, `CONTRIBUTING.md`, and the `/route` command — the routing map ships both as a pasteable doc snippet and as an invocable slash command.
