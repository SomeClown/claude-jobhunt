---
name: setup
description: Use when a user wants to set up the jobhunt plugin for the first time, initialize or configure their job-search data directory, import a resume or a connections export, or re-run setup on an existing data directory to fill in gaps. This is the plugin's front door — run it before any other jobhunt skill or agent, and it is safe to run again later.
---

# jobhunt:setup

**What this owns.** The process that takes a user with nothing to a working
`DATA_DIR`: choosing where it lives, copying in the shipped templates, and running
the interviews that turn empty templates into real preferences, work history, and
application data. It does not own any file's format — every file this skill creates
conforms to [`reference/data-formats.md`](../../reference/data-formats.md), and its
directory-resolution logic conforms to
[`reference/data-dir.md`](../../reference/data-dir.md). Link there rather than
re-deriving a format here; a format fix belongs in exactly one place.

## Design stances

Hold these regardless of how a given interview goes, and say so to the user where
it's relevant:

- **Setup never writes `job-history.md` content.** That file is chronicler-only,
  always — see the file-ownership table in `team-memory.md`. Setup creates it empty,
  from `templates/job-history.template.md`, and stops there.
- **Nothing is invented.** Any fact drafted from a resume file that the user has not
  explicitly confirmed in this conversation is marked `[inferred — confirm]` inline,
  next to the fact, in `profile.md` — never silently written as settled. The same
  marker is used for anything left genuinely open in `preferences.md`.
- **Idempotent, repair-only.** If a `DATA_DIR` already exists, setup detects it and
  offers *repair mode*: create whatever's missing, fill an untouched template's
  placeholders where asked, and never overwrite content the user already has.
  Re-running setup against a healthy directory is a clean no-op.

## Stage 1 — Resolve or choose DATA_DIR

Apply the resolution order in `reference/data-dir.md` exactly: `$JOBHUNT_DATA_DIR` →
`./.jobhunt/` → `~/.jobhunt/`.

- If `$JOBHUNT_DATA_DIR` is set but does not point at an existing directory, report
  the mismatch and stop — do not fall through to the next option. Silently falling
  back would write the user's data somewhere they aren't looking.
- If one of the three already resolves, tell the user which path it is and ask
  whether to use it (→ Stage 1b, repair mode) or point setup somewhere else instead.
- If none exists, ask the user where their data should live. Default suggestion:
  `~/.jobhunt/`, so every project on the machine shares one search history. Mention
  `./.jobhunt/` as the escape hatch for a genuinely separate search (a second
  persona, a test run, a shared machine). **Confirm the exact resolved path with the
  user before creating anything.** Creating a data directory is the one piece of
  infrastructure this skill builds, and it is not something to guess at.

### Stage 1b — Existing DATA_DIR: repair mode

When `DATA_DIR` resolves and already contains files, this is not a fresh setup:

1. Check which of the eight templated files, plus `contacts.csv` (if previously
   imported), `jobs/`, and `outputs/`, already exist.
2. Report the gap in one sentence — what's present, what's missing.
3. For each missing file, offer to create it from its template (Stage 2) and, where
   it needs one, run the relevant interview (Stages 3-6) — scoped to what's missing
   only. A `preferences.md` that already exists is never re-interviewed or
   overwritten here; a preference change afterward is an `chronicler` update, not a
   setup re-run.
4. If everything required is already present, say so and skip straight to the
   summary (Stage 7).

## Stage 2 — Copy templates in

Copy each file from `${CLAUDE_PLUGIN_ROOT}/templates/` into `DATA_DIR`, and create
`jobs/` and `outputs/` as empty directories:

| Template | Destination in DATA_DIR |
|---|---|
| `team-memory.template.md` | `team-memory.md` |
| `preferences.template.md` | `preferences.md` |
| `profile.template.md` | `profile.md` |
| `application-data.template.md` | `application-data.md` |
| `job-history.template.md` | `job-history.md` |
| `network-scan-history.template.md` | `network-scan-history.md` |
| `job-search-history.template.md` | `job-search-history.md` |
| `company-careers.template.json` | `company-careers.json` |

`contacts.csv` is never copied from a template — it exists only if the user imports
one in Stage 5. `templates/contacts.sample.csv` is documentation showing the expected
columns; setup never places it in a user's `DATA_DIR`.

In repair mode, only the files identified as missing in Stage 1b are copied;
existing files are left byte-for-byte untouched.

## Stage 3 — Profile: resume import or interview

If the user offers a resume file path, read it and draft `profile.md` in the
canonical structure (`reference/data-formats.md` → `profile.md`): one
`## Role: <Title> at <Company>` section per role, `### Key Accomplishments`
numbered, `### Other Details` bullets.

**Every fact drafted this way that the resume states but the user has not confirmed
in this conversation is marked `[inferred — confirm]` inline, next to that fact** —
not in a separate list. A reader of `profile.md` should be able to see exactly which
sentence is still unconfirmed without cross-referencing anything else.

Then interview for what a resume never states cleanly, one role at a time:

- Exact `MM/YYYY - MM/YYYY` dates (resumes often round to years only)
- Team size, headcount managed, budget owned
- Scope, when the title undersells or oversells the role's real breadth
- Reasons for leaving — asked once per role here, so it's never improvised mid-
  application later
- Accomplishments with real numbers. Where a resume bullet carries a number the user
  can't immediately source, ask; if it still can't be sourced, add a
  `**Guardrails**:` clause stating what may be claimed rather than dropping the
  number silently or inventing a source for it

If no resume is offered, run the same interview from scratch, role by role, starting
with the plain facts (dates, scope) before accomplishments.

A fact loses its `[inferred — confirm]` marker the moment the user confirms it in
conversation. Anything still marked at the end of setup stays marked, and Stage 7's
summary lists exactly what remains open.

## Stage 4 — Preferences interview

Fill `preferences.md`'s required sections, in the order fixed by
`reference/data-formats.md`: `## Target Roles`, `## Location`, `## Compensation`,
`## Must-Haves`, `## Dealbreakers`, `## Nice-to-Haves`,
`## Company-Specific Exceptions`, `## Notes`. Ask for:

- Target titles, and whether adjacent bands (a Senior Manager title alongside
  Director, say) are in scope or filtered out on title alone
- Location model: where the user is based, and which of remote / hybrid / on-site /
  commuting-distance / relocation they'll accept
- Compensation floor and target, and whether that's base only or includes
  bonus/equity
- Dealbreakers (specific employers, a location model that's out, a comp ceiling)
- Must-haves and nice-to-haves
- Any company-specific exceptions to the rules above

Every stated preference is recorded with `confirmed directly by the user
(YYYY-MM-DD)`, per the provenance convention in `reference/data-formats.md`.
Anything the user leaves genuinely open stays at the template's placeholder or is
marked `[inferred — confirm]` — never quietly assumed into a hard filter, since an
inferred comp floor that hardens silently will discard real matches.

Then offer the four optional blocks, each explained as skippable with a working
default:

- `## Scan Settings` — the cache-freshness numbers (`last_resolved_days`,
  `last_checked_days`, `not_found_retry_days`, `unresolved_retry`,
  `contact_order`). Offer the documented defaults (90 / 14 / 180 / never /
  connected_on_desc) and ask only if the user wants to change one.
- `## Scoring Overrides` — free-form adjustments to the default fit rubric; skip if
  the user has none yet.
- `## Search Sources` — board URL + search-URL pattern pairs for
  `jobhunt:keyword-search`. An empty section is valid; it just means keyword search
  has nothing to run against until one is added.
- `## Voice` — `voice_skill: <plugin>:<skill>` if the user has a personal-voice
  skill installed, otherwise `voice_skill: none`.

## Stage 5 — Contacts import (optional)

Ask whether the user has a connections export to import (a LinkedIn export is the
expected source). If not, skip — `contacts.csv` is optional, and network scanning
simply has nothing to scan until one exists.

If yes, read the file and run a **column-mapping check** before writing anything.
Real exports don't arrive clean; state each check to the user as you run it rather
than handling it silently:

1. **Locate the header row by content, not position.** A LinkedIn export opens with
   a prose preamble about missing email addresses, then a blank line, then the
   header row. Find the first line containing `Company` and treat that as row one;
   report if a preamble was skipped.
2. **Map columns**, tolerating either a single `Name`/`Contact` column or separate
   `First Name` + `Last Name`. Confirm `Company`, `Position`, and `Connected On` are
   present — those three plus a name are required. If any is missing, name the
   missing column and ask the user to point at the right one rather than guessing.
3. **Parse `Connected On` as `DD Mon YYYY`**, not ISO — the one documented exception
   to the ISO-everywhere rule in this data directory — and report the resulting date
   range back to the user.
4. **Count and skip blank-`Company` rows**, reporting the count. Real exports run
   roughly 6% blank; this is normal, not an error.
5. **Flag rows where `Company` looks like the contact's own name** as self-employment
   — skipped, never resolved, per the ambiguous-company lesson in `team-memory.md`.
6. **Drop `Email Address`** on the way in if present. The team never sends email, so
   there's no reason to carry it.

Report the final scope sentence — "N contacts imported, M skipped for blank company,
K skipped as self-employed" — before writing `contacts.csv`. Every other column is
carried through untouched.

## Stage 6 — Application data interview

Fill `application-data.md`'s five sections. **State this up front, before asking
anything:** this file is stored in plaintext, unencrypted, in `DATA_DIR` — the same
warning `reference/data-formats.md` requires.

- `## Personal Information` and `## Online Profiles` — the basics an ATS form always
  asks.
- `## Standard Answers` — the handful of yes/no questions that repeat across most
  ATS forms (work authorization, sponsorship, prior employment at the company,
  restrictive agreements).
- `## EEO / Voluntary Disclosures` — **explicitly optional and skippable.** Ask once,
  plainly, whether the user wants to fill it in at all. If they decline, leave the
  section at the template's placeholder and print the note that `jobhunt:apply` will
  use each form's decline-to-answer option automatically. Do not re-prompt for this
  later in the same setup run.
- `## Custom Answers` — leave empty. It grows over time as `jobhunt:apply` encounters
  one-off questions.

## Stage 7 — Summary and next steps

Print, in one place:

- The resolved `DATA_DIR` path.
- What was created versus what already existed (repair mode).
- Every fact still marked `[inferred — confirm]` in `profile.md` or
  `preferences.md`, so the user can resolve them later instead of hunting for them.
- Whether `contacts.csv` was imported, and Stage 5's scope sentence if so.
- Whether EEO fields were filled in or left to decline-to-answer.

Then suggest three concrete things to try next, for example:

1. `"Scan contacts 1-25"` to run the first network scan.
2. `"Check if <a company> is hiring"` for a single targeted lookup.
3. Paste a posting URL and ask for an assessment.
