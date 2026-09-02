# Data Formats — a tour

This is an orientation, not the spec. Every file below has an exact, normative definition — required fields, append-only rules, drift tolerance, the works — in [`reference/data-formats.md`](../reference/data-formats.md). This document exists so you can find the right file for a question without reading the whole spec; when the two disagree, `reference/data-formats.md` is correct.

All samples below are synthetic — persona **Alex Rivera**, employer **Northwind Systems** — the same running example the normative spec uses.

## The files, at a glance

| File | What it's for | Who writes it |
|---|---|---|
| `contacts.csv` | Your network — the source list for a network scan | you, imported once via `jobhunt:setup` |
| `company-careers.json` | Cache: company → careers URL → last scanned | cartographer + lookout, field-split |
| `preferences.md` | What you're looking for and won't accept | chronicler, on your explicit say-so |
| `profile.md` | Your verified work history — the source of every claim in your materials | scrivener + chronicler |
| `application-data.md` | Reusable ATS answers (personal info, standard questions, EEO) | envoy |
| `input/[slug]/posting.md` | One posting's facts plus the team's fit judgment | lookout (scan-level) then appraiser (deep-dive) |
| `output/[slug]/resume.md`, `cover-letter.md` | The tailored materials for one application | scrivener |
| `output/[slug]/applied.md` | What happened when the application was filled out | envoy |
| `job-history.md` | The per-application ledger | chronicler, sole writer |
| `network-scan-history.md` | Append-only log of contact-sourced scans | lookout |
| `job-search-history.md` | Append-only log of keyword searches | lookout |
| `team-memory.md` | Ownership rules, lessons, standing instructions, state pointers | chronicler, sole writer |

## `contacts.csv`

Your professional network, one row per contact. A LinkedIn connections export is the expected source. Required columns: `Company`, a name (either `First Name`+`Last Name` or one `Name`/`Contact` column), `Position`, `Connected On`. The one documented non-ISO date in the whole data directory: `Connected On` is `DD Mon YYYY`, not ISO.

```csv
First Name,Last Name,URL,Email Address,Company,Position,Connected On
Jordan,Keel,https://www.example.com/in/jordan-keel,,Northwind Systems,Director of Engineering,24 Jul 2026
```

## `company-careers.json`

A flat JSON object keyed by company name — `{}` when empty. Each entry records `careers_url` and `type` (which ATS vendor, or `direct`, `not_found`, `unresolved`), and optionally `last_checked` (absent means the board has never been scanned), `last_found_roles`, `last_resolved`, `note`, and `ignored`.

```json
{
  "Northwind Systems": {
    "careers_url": "https://boards.greenhouse.io/northwindsystems",
    "type": "greenhouse",
    "last_resolved": "2026-01-10",
    "last_checked": "2026-01-15",
    "last_found_roles": 42
  }
}
```

Two lifetimes are tracked separately on purpose — `last_resolved` (is the URL still right? default 90-day freshness) and `last_checked` (has it been scanned for openings recently? default 14 days) — because a careers URL is near-static and a listing set isn't; one threshold would have to be wrong for one of them. `ignored: true` marks a permanent, deliberate skip (a solo consulting brand, not a real employer) rather than a failed lookup — see `docs/CUSTOMIZING.md` and the ownership note in `reference/data-formats.md` for which skill sets it.

## `input/[slug]/posting.md` — the canonical posting schema

One file per posting worth keeping. A fixed nine-line bold metadata block (`**URL**`, `**Company**`, `**Location**`, `**Remote policy**`, `**Comp**`, `**Req ID**`, `**Source**`, `**Date found**`, `**Network contact**` — always all nine, placeholders when unknown), then `## About the Role`, `## Requirements` (`**Required**`/`**Preferred**`), and `## Fit Assessment` (`**Rating**`/`**Why**`/`**Real gaps**`). `lookout` writes it thin at scan time; `appraiser` fills it in at deep-dive level — same shape, different fill level, never a different schema. Later corrections are appended as dated `## Updates (YYYY-MM-DD)` sections; nothing above the first one is ever edited.

```markdown
# Director of IT Infrastructure — Northwind Systems

**URL**: https://boards.greenhouse.io/northwindsystems/jobs/4471902
**Company**: Northwind Systems
**Comp**: $185,000 - $240,000 base, plus equity
...

## Fit Assessment

**Rating**: High
**Why**: Function matches, title in-band, comp clears the floor...
**Real gaps**:
- No security certification on file; listed as preferred, not required.
```

## `output/[slug]/resume.md` and `cover-letter.md`

Plain text with a fixed grammar, not general markdown — `scripts/render.js` parses exactly this shape to produce a `.docx`, and fails loudly with a line number on anything it doesn't recognize. The resume is name / contact line / optional headline / `SUMMARY` / `Key Skills:` / `PROFESSIONAL EXPERIENCE` (employer blocks with `- ` bullets) / optional `CAREER NOTES:` / `EDUCATION` / `SUPPLEMENTAL INFORMATION`. The cover letter is `Dear Hiring Manager,` / 3-5 body paragraphs, 250-350 words / `Regards,` and a name — with the em dash and en dash both forbidden (hyphens only; the renderer does no dash substitution).

```
Alex Rivera
Denver, CO 80202 • 555-0142 • alex.rivera@example.com • linkedin.com/in/alex-rivera

SUMMARY
IT leader with 14 years running infrastructure and security organizations...

Key Skills:
Infrastructure Automation (Terraform, Ansible) - Identity & Endpoint Management
```

Markdown headings, bold/italic, tables, and links are all forbidden inside these two files — they're structured plain text, and the structure is the whole contract with the renderer.

## `output/[slug]/applied.md`

Envoy's record of what happened when a form got filled: date, ATS, status, notes. Append-only after the first four fields.

```markdown
# Application Log

- **Date**: 2026-01-16
- **ATS**: Greenhouse
- **Status**: Filled, not submitted
- **Notes**: Resume and cover letter attached manually by the user...
```

`Status` is always one of `Submitted (final Submit clicked by the user)`, `Filled, not submitted`, or `Abandoned (<reason>)` — envoy itself never produces the first one, because it never clicks Submit.

## `job-history.md` — the per-application ledger

One `## Company — Role` section per application ever pursued or passed on, plus a closing `## Open Items / Follow-ups` section. Sole writer: chronicler. Every other agent reports what happened in its task output; chronicler logs it, matching the existing entry format field-for-field.

```markdown
## Northwind Systems — Director of IT Infrastructure
- **Status**: Submitted (2026-01-16) — form filled and verified by envoy; final Submit clicked by the user
- **Location model**: Fully remote, US
- **Comp**: $185,000 - $240,000 base plus equity
- **Files**: `input/northwind-systems-dir-it-2026-01-15/`, `output/northwind-systems-dir-it-2026-01-15/`
```

## `network-scan-history.md` and `job-search-history.md`

Append-only logs, same shape, two different sources — network scans (contact-sourced) in one, keyword searches (public-board-sourced) in the other, never mixed. Each dated section has a scope sentence, a results table, and a closing bold `**Result:**` line that preserves the distinction between "no roles found" and "the board couldn't be read."

```markdown
## 2026-01-15 - Network Scan (contacts 26-50, 22 companies)

Scope: sequential batch resuming from contact 26...

| Company | Contact | Role Found | Fit | URL |
|---------|---------|------------|-----|-----|
| Northwind Systems | Jordan Keel (Director of Engineering) | Director of IT Infrastructure | High | https://... |

**Result: 1 High fit saved...**
```

## `preferences.md`

What you're looking for, in required sections (`## Target Roles`, `## Location`, `## Compensation`, `## Must-Haves`, `## Dealbreakers`, `## Nice-to-Haves`, `## Company-Specific Exceptions`, `## Notes`) plus four optional ones (`## Scan Settings`, `## Scoring Overrides`, `## Search Sources`, `## Voice`) covered in depth in `docs/CUSTOMIZING.md`. Every stated preference is tagged `confirmed directly by the user (YYYY-MM-DD)`; anything the team inferred rather than heard directly is `[inferred — confirm]` and treated as provisional everywhere it's read.

## `profile.md`

Your verified work history — the one source every factual claim in a resume or cover letter has to trace back to. One `## Role: <Title> at <Company>` section per role, with numbered `### Key Accomplishments` (numbered so a correction can cite "accomplishment #3" and mean it) and a `### Other Details` block. A `**Guardrails**` clause on an accomplishment is binding — if a fact is only safe to state without a dollar figure, scrivener writes it that way, no matter how much better the bullet would read with one.

```markdown
## Role: Director of IT Infrastructure at Cascade Analytics
**Dates**: 03/2021 - Present

### Key Accomplishments
1. **Provisioning rebuild**: Rebuilt cloud environment provisioning on Terraform...
   **Guardrails**: no dollar figure documented — do not attach a savings number.
```

## `application-data.md`

The reusable-answer cache for ATS forms: personal information, online profiles, standard yes/no questions, an explicitly optional EEO section, and a growing custom-answers log. Stored in plaintext — see `docs/SAFETY.md` for what that means in practice.

## `team-memory.md`

Not a data file about you — it's the team's own operating manual: the file-ownership table (operational copy of the one in `reference/data-formats.md`), operational lessons (referenced by name, never by number, so they don't silently break when the list changes), your own standing instructions, state pointers (batch progress, counts — pointers to other files, never copies of their content), and a changelog. Chronicler is its sole writer; every other agent reads it first, every task. The full contract — why single-writer matters here specifically, and what belongs in each section — is [`reference/team-memory.md`](../reference/team-memory.md).

## Seeing it all together

[`examples/input/northwind-systems-dir-it-2026-01-15/`](../examples/input/northwind-systems-dir-it-2026-01-15/) and [`examples/output/northwind-systems-dir-it-2026-01-15/`](../examples/output/northwind-systems-dir-it-2026-01-15/) together have all four per-application files for one fictional posting, consistent with each other end to end — a good next stop once the per-file descriptions above make sense in isolation.

## Where `DATA_DIR` and `JOBS_DIR` live

None of the above matters if an agent can't find your directories. Resolution order and the multi-project implications are in [`reference/data-dir.md`](../reference/data-dir.md) — short version: `DATA_DIR` is `$JOBHUNT_DATA_DIR`, then `./.jobhunt/`, then `~/.jobhunt/`; `JOBS_DIR` is `$JOBHUNT_JOBS_DIR`, then `./job-hunt/`, then `~/job-hunt/` (deliberately not dot-prefixed, since it holds the documents you actually go looking for). `jobhunt:setup` is the only thing that creates either one.
