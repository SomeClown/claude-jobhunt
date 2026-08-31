---
name: render-docx
description: Use when resume.md or cover-letter.md for a job has been written or edited and needs to become a .docx a human can actually send — renders DATA_DIR/jobs/<slug>/resume.md and/or cover-letter.md into DATA_DIR/outputs/<slug>/ via the markdown-driven renderer in scripts/.
---

# render-docx

Turns `resume.md` and `cover-letter.md` into ATS-friendly `.docx` files. It is
invocation and conventions only — the renderer itself lives in
`${CLAUDE_PLUGIN_ROOT}/scripts/` and does all the real work.

## What this owns

The `outputs/[slug]/` convention and the renderer invocation. It does **not**
own `resume.md` or `cover-letter.md` content — those are scrivener's,
via `jobhunt:tailor-resume` and `jobhunt:cover-letter`. This skill never
writes prose; it only converts what is already on disk.

## Required markdown structure

`resume.md` and `cover-letter.md` each have an exact grammar the renderer
parses — see
[`reference/data-formats.md`](../../reference/data-formats.md) under
`jobs/[slug]/resume.md` and `jobs/[slug]/cover-letter.md` for the canonical
spec. Do not restate it here; if the two ever disagree, `data-formats.md` is
correct and this file is stale.

The renderer targets that grammar exactly. On anything that does not match,
it fails loudly with a file path and line number rather than guessing —
including markdown it should never contain (headings, bold/italic, links,
tables, horizontal rules) and, for cover letters, any em dash or en dash. A
parse failure means the source markdown needs fixing, not the renderer.

## Prerequisites

- Node.js 18+
- Run `npm install` once in `${CLAUDE_PLUGIN_ROOT}/scripts/` (installs
  `docx`, the only runtime dependency)

## Invocation

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/render.js --job <slug> --type resume|cover-letter|both [--data-dir <path>] [--out <path>]
```

- `--job <slug>` — the job folder under `DATA_DIR/jobs/`, e.g.
  `northwind-systems-dir-it-2026-01-15`.
- `--type` — `resume`, `cover-letter`, or `both` (renders the pair in one
  call).
- `--data-dir <path>` — optional override. Without it, `DATA_DIR` resolves
  the same way everywhere in this plugin: `$JOBHUNT_DATA_DIR` →
  `./.jobhunt/` → `~/.jobhunt/`. See
  [`reference/data-dir.md`](../../reference/data-dir.md).
- `--out <path>` — optional override of the output file path. Not usable
  with `--type both`, since that would collide two files into one path.

## Where output lands

`DATA_DIR/outputs/<slug>/<Name>_<Type>.docx` — one file per type, e.g.
`Alex_Rivera_Resume.docx` and `Alex_Rivera_Cover_Letter.docx`. The filename
is derived from the candidate name found inside the document itself (the
name line in `resume.md`, the sign-off name in `cover-letter.md`), never
hardcoded. Output lives beside the rest of `DATA_DIR`, not inside the
plugin, so a `git pull` on the plugin never touches a user's documents.

## Always re-render after editing

`resume.md` / `cover-letter.md` are the single source of truth. The `.docx`
is a build artifact, not something to hand-edit. Any time either markdown
file changes — a tailoring pass, a user correction, a revision noted in
`job-history.md` — re-run this skill before treating the `.docx` as current.
A stale `.docx` next to a freshly edited `.md` is a silent mistake, not a
convenience.
