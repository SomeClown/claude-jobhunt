# Data Formats

This is the canonical specification for every file the jobhunt team reads or writes inside `DATA_DIR` or `JOBS_DIR`. Agents and skills MUST link here rather than restating a format, so that a format fix lands in exactly one place. Each file below is specified with its purpose, its single owner (the one agent permitted to write it), its exact structure, a short synthetic example, which elements are required versus optional, and its append-only rules where they apply. For how `DATA_DIR` and `JOBS_DIR` are located, see [`data-dir.md`](./data-dir.md). For the ownership rules and the memory contract that make single-writer ownership enforceable, see [`team-memory.md`](./team-memory.md).

Every example in this document is synthetic. The persona is **Alex Rivera**; the employers (Northwind Systems, Cascade Analytics, Harborline Logistics, Fabrikam Health, Lakeshore Robotics, Vector Foundry) are invented.

---

## Conventions that apply to every file

- **Dates are ISO 8601 `YYYY-MM-DD`**, everywhere, with one documented exception (`contacts.csv`, whose format is set by the export tool). Agents MUST NOT write `Aug 15, 2026` or `8/15/26` into any file this spec owns.
- **Encoding is UTF-8, LF line endings, one trailing newline.**
- **Single writer.** Each file has exactly one owning agent. Every other agent treats it as read-only. Ownership is restated in `team-memory.md`'s File-ownership table, which is the operational copy; this document is the normative one. If the two disagree, that is a bug — report it.
- **Append-only means append-only.** Where a file is marked append-only, existing content MUST NOT be edited or reflowed. Corrections are new dated entries that supersede older ones. The record of having been wrong is part of the value.
- **Readers tolerate absence.** Any reader MUST treat an absent optional field as "unknown" and continue. A reader MUST NOT crash, and MUST NOT silently substitute a default that changes a decision, on a missing optional field. Unrecognized extra fields are ignored, not deleted.
- **Slugs.** A slug is `[company-slug]-[role-slug]-[YYYY-MM-DD]` and names a matching pair of folders: `input/[slug]/`, holding the posting, and `output/[slug]/`, holding everything the team produced from it. Slugs are lowercase ASCII, words joined by hyphens, no other punctuation. The date is the date the posting was found, not the date the posting was published. `[role-slug]` MAY be omitted only when a company has exactly one posting on record; omitting it is discouraged because it collides the first time it is wrong. Example: `northwind-systems-dir-it-2026-01-15`.
- **No absolute paths in file content.** Paths written into any data file are relative to the directory that actually holds them — `DATA_DIR` for files that live there, `JOBS_DIR` for job folders, always written as `input/[slug]/posting.md` or `output/[slug]/` regardless of which file references them. See [`data-dir.md`](./data-dir.md) for the full rule.

### Ownership at a glance

| File | Sole writer | Notes |
|---|---|---|
| `contacts.csv` | the user (imported by `jobhunt:setup`) | agents read only |
| `company-careers.json` | cartographer (resolution fields), lookout (scan fields) | field-level split, defined below |
| `input/[slug]/posting.md` | lookout (scan-level save), appraiser (deep dive) | scrivener MAY append `## Updates` only |
| `output/[slug]/resume.md`, `cover-letter.md` | scrivener | |
| `output/[slug]/applied.md` | envoy | |
| `job-history.md` | **chronicler only** | every other agent reports; chronicler logs |
| `network-scan-history.md` | lookout via `jobhunt:scan-roles` | append-only |
| `job-search-history.md` | lookout via `jobhunt:keyword-search` | append-only, never mixed with the two above |
| `preferences.md` | chronicler (on an explicit user preference change) | `jobhunt:setup` creates it |
| `profile.md` | scrivener (same-turn factual corrections), chronicler (consistency tidying) | |
| `application-data.md` | envoy | `jobhunt:setup` creates it |
| `team-memory.md` | **chronicler only** | contract in [`team-memory.md`](./team-memory.md) |

---

## `contacts.csv`

**Purpose.** The list of professional contacts whose employers become the company list for a network scan. **Writer:** the user, or `jobhunt:setup` during import. No agent writes it during normal operation.

**Expected source.** A LinkedIn connections export is the typical source, and its column set is the one this spec targets. Any CSV that provides the four required columns works.

**Required columns** (header row, exact names):

| Column | Meaning |
|---|---|
| `Company` | the employer name that gets resolved to a careers URL |
| `First Name` + `Last Name`, or a single `Name` / `Contact` column | the contact, recorded in scan history and in `posting.md` |
| `Position` | the contact's title, recorded alongside the name for context |
| `Connected On` | the ordering key |

**Optional columns:** `URL` (contact profile link), `Email Address`, and any others; they are carried through untouched and MUST NOT be required by any reader.

**Default processing order: `Connected On` descending** — most recently connected first. This is a default, not a rule; `preferences.md` MAY override it, and a user MAY ask for an explicit slice ("scan contacts 426-450"), which is interpreted as positions in this sorted order.

**Gotchas that a reader MUST handle:**

1. **A preamble before the header row.** LinkedIn's export begins with two lines of prose about missing email addresses, then a blank line, then the header. A parser MUST locate the header row by looking for the first line containing `Company` rather than assuming line 1. Failing to skip the preamble yields one garbage "contact" and a wrong column map.
2. **`Connected On` is not ISO.** The export writes `24 Jul 2026` (`DD Mon YYYY`). Parse it; do not sort it as a string. This is the one place in `DATA_DIR` where a non-ISO date is expected.
3. **Blank `Company` values are common** — roughly 6% of rows in a real export. Rows with an empty `Company` are skipped and counted in the scan's scope sentence; they are not errors.
4. **A person's own name in the `Company` column** means self-employment, not an employer. It is skipped and reported, never resolved. See the ambiguous-company-names lesson in `team-memory.md`.
5. **`Email Address` is never used.** The team does not send email. Import MAY drop the column entirely.

```csv
Notes:
"When exporting your connection data, you may notice that some of the email addresses are missing..."

First Name,Last Name,URL,Email Address,Company,Position,Connected On
Jordan,Keel,https://www.example.com/in/jordan-keel,,Northwind Systems,Director of Engineering,24 Jul 2026
Priya,Anand,https://www.example.com/in/priya-anand,,Cascade Analytics,Senior Account Executive,02 Jun 2026
Sam,Okonkwo,https://www.example.com/in/sam-okonkwo,,Harborline Logistics,VP Operations,27 May 2026
```

---

## `company-careers.json`

**Purpose.** The resolution and scan cache: for every company the team has ever looked at, where its careers board is, what kind of board it is, when the URL was last confirmed, and when the board was last scanned. It exists so that a second scan touching the same company costs nothing.

**Writers (field-level split, the one file with two owners):**
- **cartographer**, via `jobhunt:resolve-careers`, owns `careers_url`, `type`, `last_resolved`, and the `note` when the note explains a resolution outcome.
- **lookout**, via `jobhunt:scan-roles`, owns `last_checked`, `last_found_roles`, and the `note` when the note explains a scan-time finding.
- **`ignored`** is owned by whichever skill discovers that an entry isn't a real employer, not by one skill exclusively — most often `jobhunt:resolve-careers`, since a solo-consulting or placeholder name usually surfaces during resolution, but `jobhunt:scan-roles` may set it too if the fact only becomes clear once a "careers page" turns out to be something else. Whichever skill sets `ignored` also writes the required `note` explaining why.

Neither writer rewrites a field it does not own. Both merge into the existing object rather than replacing it — a `resolve-careers` write must not clobber `last_checked`/`last_found_roles`, and a `scan-roles` write must not clobber `careers_url`/`type`/`last_resolved`.

**Structure.** A flat JSON object keyed by company name exactly as it appears in `contacts.csv` (or as the user typed it for a one-off request). No nesting, no top-level metadata, no array. An empty cache is `{}`.

**Fields:**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `careers_url` | string or `null` | **yes** | the official careers/job board URL. `null` when none was found or none exists. |
| `last_checked` | `"YYYY-MM-DD"` | no | when the board was last **scanned for roles**. Absent ⇒ never scanned. |
| `type` | enum | **yes** | what the board *is*: `"greenhouse"`, `"workday"`, `"lever"`, `"ashby"`, `"direct"`, `"other_ats"`, `"not_found"`, `"unresolved"`. |
| `last_found_roles` | integer | no | how many roles the last scan saw on the board (all roles, not matching roles). |
| `note` | string | no* | free text: why resolution failed, a board quirk, a deliberate decision. *Required whenever `ignored` is set. |
| `last_resolved` | `"YYYY-MM-DD"` | no | when the careers URL was last **confirmed**. Absent ⇒ treat as equal to `last_checked`. |
| `ignored` | boolean | no | a deliberate decision to skip this company permanently. |

**`type` semantics.** `greenhouse`/`workday`/`lever`/`ashby` name the ATS vendor hosting an official board; `other_ats` is any other vendor-hosted official board; `direct` is a board on the employer's own domain. `not_found` means resolution ran and found nothing usable. `unresolved` means the company name is ambiguous and a human is needed — it is never guessed at. Keep `type` for what the board *is*; use `ignored` for what we have *decided*.

**The two lifetimes.** `last_resolved` and `last_checked` are deliberately separate because careers URLs are near-static and job listings are not; a single threshold has to be wrong for one of them.

**Freshness defaults** (all four overridable in `preferences.md` → `## Scan Settings`, see below):

| Condition | Default | Behavior when stale |
|---|---|---|
| `last_resolved` older than **90 days** | 90 | re-confirm the URL before scanning |
| `last_checked` older than **14 days** | 14 | re-scan the board; otherwise reuse the cached result and say so |
| `type: "not_found"` | retry after **180 days** | re-attempt resolution |
| `type: "unresolved"` | **never** auto-retried | surfaced in the scan report's unresolved list every time |
| `ignored: true` | — | `scan-roles` skips entirely; `resolve-careers` never re-resolves |

**Drift tolerance is mandatory.** Real caches contain entries missing `last_checked` (never scanned), missing `last_found_roles`, missing `note`, and missing `careers_url` values that are `null` rather than absent. Readers MUST tolerate every combination of the optional fields. Writers MUST NOT "clean up" an entry by adding fields they did not actually determine.

```json
{
  "Northwind Systems": {
    "careers_url": "https://boards.greenhouse.io/northwindsystems",
    "type": "greenhouse",
    "last_resolved": "2026-01-10",
    "last_checked": "2026-01-15",
    "last_found_roles": 42
  },
  "Cascade Analytics": {
    "careers_url": "https://cascade-analytics.example.com/careers",
    "type": "direct",
    "last_checked": "2026-01-15",
    "last_found_roles": 6,
    "note": "Board is a client-side widget; roles render only after the consent banner is dismissed."
  },
  "Harborline Logistics": {
    "careers_url": null,
    "type": "not_found"
  },
  "Summit Group": {
    "careers_url": null,
    "type": "unresolved",
    "note": "Name shared by at least four unrelated companies; no confident match. Needs a human."
  },
  "Rivera Coaching": {
    "careers_url": null,
    "type": "not_found",
    "ignored": true,
    "note": "Solo consulting brand, not an employer. Deliberate permanent skip, 2026-01-15."
  }
}
```

---

## `input/[slug]/posting.md` — the canonical posting schema

**Purpose.** One file per posting worth keeping: the posting's facts plus the team's fit judgment. It is the input to evaluation, tailoring, and application, so it is the file where format drift is most expensive.

**Writers.** **lookout** creates it at scan level for a High fit. **appraiser** creates it, or fills in an existing scan-level file, at deep-dive level. Both emit *the same file with different fill levels* — never a different shape. **scrivener** MAY append an `## Updates` section and MUST NOT edit anything above it.

### Structure

```markdown
# Director of IT Infrastructure — Northwind Systems

**URL**: https://boards.greenhouse.io/northwindsystems/jobs/4471902
**Company**: Northwind Systems
**Location**: Remote (US); Denver, CO listed as nominal base
**Remote policy**: Fully remote, US-based
**Comp**: $185,000 - $240,000 base, plus equity
**Req ID**: NWS-4471902
**Source**: network-scan (contacts 26-50) — board: https://boards.greenhouse.io/northwindsystems
**Date found**: 2026-01-15
**Network contact**: Jordan Keel, Director of Engineering (from contacts.csv). Noted only; no outreach drafted.

## About the Role

Northwind Systems is hiring a Director of IT Infrastructure to own corporate
infrastructure, identity, and endpoint management for roughly 1,200 employees
across three sites. The role reports to the VP of Technology and manages two
team leads and eleven engineers.

## Requirements

**Required**
- 8+ years in IT infrastructure, including 4+ years managing managers
- Cloud infrastructure automation at production scale
- Identity and endpoint management for a distributed workforce
- Demonstrated ownership of a SOC 2 audit cycle

**Preferred**
- Experience in a regulated industry
- A recognized security certification

## Fit Assessment

**Rating**: High

**Why**: Function matches — this is a corporate IT infrastructure leadership
role, not an engineering-product role wearing an IT title. Title is in the
target band, comp clears the stated floor, and fully-remote US satisfies the
location constraint. Documented cloud-automation and audit-ownership history
maps directly onto the first, second, and fourth required items.

**Real gaps**:
- No security certification on file; listed as preferred, not required.
- Regulated-industry exposure is advisory rather than in-house.

## Updates (2026-01-18)

- Live posting confirmed against the scan-level capture: req ID and comp band
  unchanged; the "manages two team leads" detail was not in the listing summary
  and is added above under About the Role.
```

### The metadata block

Nine bold labels, in the order shown, **all nine always present**. A writer that does not know a value writes a defined placeholder rather than omitting the line, so that a later writer can fill it in place without restructuring the file.

| Label | Placeholder when unknown |
|---|---|
| `**URL**` | (none — always required; a posting without a URL is not saved) |
| `**Company**` | (none — always required) |
| `**Location**` | `Not stated` |
| `**Remote policy**` | `Not stated` |
| `**Comp**` | `Not listed` — never blank, and never omitted. Unlisted comp is a recorded gap, not an absence. |
| `**Req ID**` | `Not stated` |
| `**Source**` | (none — always required) |
| `**Date found**` | (none — always required) |
| `**Network contact**` | `None identified` |

`**Source**` records the discovery channel — `network-scan (contacts 26-50)`, `keyword-search (2026-01-15)`, `direct request`, `appraiser (user-supplied URL)` — and, when discovery came from a company careers board, appends ` — board: <url>` so the board URL is not lost.

`**Network contact**` records name and title, and states explicitly that the contact is noted only. Outreach is never drafted or sent as a side effect of saving a posting.

### Sections, and who fills what

| Section | Required | lookout minimum | appraiser minimum |
|---|---|---|---|
| H1 `Title — Company` | yes | exact posting title, em dash separator, company | same |
| Metadata block | yes | all nine labels, placeholders allowed | all nine, placeholders replaced where the live posting supplies a value |
| `## About the Role` | yes | 1-3 sentences from the listing | a full summary from the live posting, including reporting line and team scope when stated |
| `## Requirements` | yes | `**Required**` with the requirements visible from the listing; `**Preferred**` MAY be `- Not stated in the listing` | both subheads, complete, from the live posting |
| `## Fit Assessment` | yes | `**Rating**` and `**Why**`; `**Real gaps**` MAY be `- None identified at scan level` | all three fields, with gaps as bullets and each gap named concretely |
| `## Updates (YYYY-MM-DD)` | no | — | appended on any later correction |
| `## Keywords` | no | — | optional final section: a bullet list of terms from the posting worth mirroring in materials |

`**Rating**` is exactly one of `High`, `Medium`, `Low`. The scoring rubric lives in `skills/scan-roles/references/fit-scoring.md`; this spec only fixes the vocabulary and the file shape.

**No other H2 sections.** Anything that does not fit the sections above goes in `## Updates`. Writers MUST NOT invent a new heading; readers keying off `## Fit Assessment` are the reason.

### The `## Updates` convention (append-only)

Later corrections are appended as `## Updates (YYYY-MM-DD)` sections at the end of the file, newest last. Content above the first `## Updates` heading is frozen once written. If a later reading of the live posting contradicts the scan-level capture, the Update states both the old and the new value — a reader needs to know the capture was wrong, not just what is true now. Multiple updates on the same date go in one section.

This is also how a scan-level posting gets upgraded honestly. **A scan-level `posting.md` is a starting point, not the posting** — fetch the live posting before tailoring above IC level. That lesson is in `team-memory.md` and this convention is how it is recorded.

### Mapping earlier variants onto the canonical schema

Files written before this spec used several label sets. They map without information loss:

| Earlier label / section | Canonical home |
|---|---|
| `**Salary**`, `**Salary range**`, `**Pay range**` | `**Comp**` |
| `**Job number**` | `**Req ID**` |
| `**Type**` (Full-time, etc.), `**Reports to**`, `**Work site**`, `**Travel**`, `**Profession / Discipline**`, `**Role type**` | prose in `## About the Role` |
| `**Date posted**` | prose in `## About the Role` (distinct from `**Date found**`) |
| `## Direct Careers Page` | split: the posting URL becomes `**URL**`; the careers-board URL becomes the ` — board: <url>` suffix on `**Source**` |
| `## Company`, `## Role Overview`, `## Overview`, `## What You'll Do`, `## Responsibilities`, `## Team Context` | `## About the Role` |
| `## Key Requirements`, `## Required Qualifications` | `## Requirements` → `**Required**` |
| `## Preferred Qualifications`, `## What You'll Bring` | `## Requirements` → `**Preferred**` |
| `## Fit Assessment (from network scan)`, `**Gap to address honestly...**` | `## Fit Assessment` → `**Real gaps**` |
| `## Fit-Assessment Append`, `## Fit-Assessment Corrections` | `## Updates (YYYY-MM-DD)` |
| `## Network Contact` (as a section) | `**Network contact**` metadata line |
| `## Keywords to mirror` | `## Keywords` |

---

## `output/[slug]/resume.md`

**Purpose.** The tailored resume for one application, in markdown, as the single source of truth. `scripts/render.js` parses **exactly** this structure to produce the `.docx`; it fails loudly with a line number on anything it does not recognize rather than guessing. **Writer:** scrivener, via `jobhunt:tailor-resume`.

### Structure

```
Alex Rivera
Denver, CO 80202 • 555-0142 • alex.rivera@example.com • linkedin.com/in/alex-rivera

SENIOR IT LEADER — INFRASTRUCTURE, IDENTITY & COMPLIANCE

SUMMARY
IT leader with 14 years running infrastructure and security organizations for
distributed companies. Built the automation and audit practices that carried two
employers through SOC 2 with no findings.

Key Skills:
Infrastructure Automation (Terraform, Ansible) - Agentic AI & AI Infrastructure - Identity & Endpoint Management - SOC 2 & ISO 27001 Compliance - Cloud Cost Governance - Vendor Negotiation - Global Team Leadership

PROFESSIONAL EXPERIENCE

Cascade Analytics, Denver, CO • 03/2021 - Present
Director of IT Infrastructure
- Rebuilt cloud infrastructure provisioning on Terraform, cutting environment setup from days to under an hour.
- Led the company through two SOC 2 Type II audits with no findings.
- Managed 2 team leads and 11 engineers on a $4M budget.

Harborline Logistics, Portland, OR • 06/2016 - 03/2021
IT Operations Manager
- Consolidated three regional helpdesks into one service organization.
- Migrated 900 endpoints to managed identity and device enrollment.

CAREER NOTES: Systems Engineer, Lakeshore Robotics (2014-2016); Network Technician, Vector Foundry (2012-2014).

EDUCATION
Bachelor of Science in Information Systems, State University

SUPPLEMENTAL INFORMATION
Affiliations: Front Range IT Leadership Roundtable. Volunteer: STEM mentoring.
```

### The grammar the renderer enforces

| # | Element | Rule |
|---|---|---|
| 1 | **Name line** | Line 1. Plain text, no markdown. Rendered as the document title. |
| 2 | **Contact line** | Line 2. Two to five items separated by ` • ` (space, U+2022, space). Free text; the renderer does not parse the items. |
| 3 | blank line | required |
| 4 | **Headline** | Optional. A single line in ALL CAPS naming the positioning for this application. If present, followed by a blank line. An em dash is conventional here; the em-dash prohibition below applies to `cover-letter.md` only. |
| 5 | **`SUMMARY`** | Required. An ALL-CAPS section heading on its own line, followed by one paragraph (one or more non-blank lines, no bullets). |
| 6 | **`Key Skills:`** | Required. The literal label `Key Skills:` on its own line, then **exactly one** line of skills separated by ` - ` (space, hyphen, space) or ` – ` (space, en dash, space). One line — the renderer wraps it; a hard-wrapped skills block is a parse error. |
| 7 | **`PROFESSIONAL EXPERIENCE`** | Required. ALL-CAPS heading, then one or more employer blocks separated by blank lines. |
| 8 | **Employer header line** | `Company, Location • Dates` — company, comma, location, then ` • `, then the date range. The date range uses `MM/YYYY`, a separator of ` - ` or ` – `, and either `MM/YYYY` or `Present`. |
| 9 | **Title line** | The line immediately after the employer header. Plain text, no bullet marker. |
| 10 | **Achievement bullets** | One or more lines starting with `- ` (hyphen, space). No nesting, no sub-bullets, no bold inside a bullet. |
| 11 | **`CAREER NOTES:`** | Optional. The literal label, a colon, and the earlier-roles text on the **same line**. Appears after the last employer block. |
| 12 | **`EDUCATION`** | Optional. ALL-CAPS heading, then one or more plain lines. |
| 13 | **`SUPPLEMENTAL INFORMATION`** | Optional. ALL-CAPS heading, then one or more plain lines. |

**Section-heading recognition:** a line is a section heading when it is entirely uppercase letters, spaces, `&`, and `/`, with no trailing colon. `Key Skills:` and `CAREER NOTES:` are labeled fields, not headings, which is why they carry colons.

**Ordering.** `SUMMARY` → `Key Skills:` → `PROFESSIONAL EXPERIENCE` → `CAREER NOTES:` → `EDUCATION` → `SUPPLEMENTAL INFORMATION`. Optional elements MAY be omitted; present elements MUST appear in this order.

**Forbidden anywhere in the file:** markdown headings (`#`), bold/italic markers, tables, links, and horizontal rules. This file is plain text with a fixed shape, not general markdown. Any of them is a parse error, not a silent pass-through.

**Content rules** (enforced by `jobhunt:tailor-resume`, not by the renderer): every claim traces to a documented fact in `profile.md`, no metric appears without a source there, and requirements the profile cannot cover are reported as uncovered rather than written around.

---

## `output/[slug]/cover-letter.md`

**Purpose.** The tailored cover letter for one application. Like `resume.md`, it is both the source of truth and the renderer's input. **Writer:** scrivener, via `jobhunt:cover-letter`.

### Structure

```
Dear Hiring Manager,

Northwind Systems is looking for someone who has owned corporate infrastructure
end to end and kept it audit-ready while doing it. That is the job I have held
for the last five years, at roughly the same headcount you are describing.

At Cascade Analytics I rebuilt cloud environment provisioning on Terraform and
took setup from several days to under an hour, which removed the single largest
source of delay in engineering onboarding. I then carried the same team through
two SOC 2 Type II audits with no findings, which meant building evidence
collection into the platform rather than assembling it by hand every year. Today
I manage two team leads and eleven engineers on a four million dollar budget.

Before that, at Harborline Logistics, I consolidated three regional helpdesks
into a single service organization and moved 900 endpoints onto managed identity
and device enrollment. That work is closer to the distributed workforce problem
your posting describes than my titles make it look, because the sites were small,
the tooling was inconsistent, and the fix was standardization rather than
headcount.

What I do not bring is a security certification, and your posting lists one as
preferred. I have built and defended the controls those certifications test, and
I have sat on the receiving end of the audits that check them, but I have not sat
the exam. I would rather say that now than let you find it later.

I would welcome the chance to talk about how that experience maps onto what your
infrastructure team needs next.

Regards,
Alex Rivera
```

### Rules

| Element | Rule |
|---|---|
| Salutation | Line 1 is exactly `Dear Hiring Manager,` unless a specific named recipient is known and confirmed. |
| Body | 3 to 5 paragraphs, separated by a single blank line. Each paragraph is one block of prose. |
| Length | **250-350 words**, counting body paragraphs only (salutation and closing excluded). |
| Dashes | ASCII hyphen only. The em dash (`—`, U+2014) and en dash (`–`, U+2013) MUST NOT appear. The renderer performs no dash substitution, so what is written here is what ships. |
| Closing | The last two non-blank lines are exactly `Regards,` and then the candidate's name. Nothing follows the name. |
| Forbidden | Markdown headings, bullets, bold, italics, links, tables, and any metadata block. |

Paragraph jobs, in order: hook and why this role; strongest achievement mapped to a stated need; a second achievement or the honest gap stated as a natural aside; close. The word count and the dash check are reported by scrivener in its task output, not written into the file.

---

## `output/[slug]/applied.md`

**Purpose.** The record of what happened when the application was actually filled out: which ATS, on what date, in what state it was left, and everything a future reader needs to avoid re-deriving. **Writer:** envoy, via `jobhunt:apply`.

```markdown
# Application Log

- **Date**: 2026-01-16
- **ATS**: Greenhouse
- **Status**: Submitted (final Submit clicked by the user)
- **Notes**: Applied via the direct Greenhouse board form, no iframe token needed.
  Resume and cover letter attached manually by the user, since browser tools cannot
  upload DOCX or PDF. Standard and EEO answers filled from application-data.md
  defaults. Confirmation page reached. No outreach to the network contact.

- **Update (2026-01-23)**: Recruiter screen scheduled for 2026-01-27.
```

**Required fields:** `**Date**` (ISO), `**ATS**` (`Greenhouse`, `Lever`, `Workday`, `Ashby`, `Other`, or `Unknown`), `**Status**`, `**Notes**`.

**`Status` vocabulary:**
- `Submitted (final Submit clicked by the user)` — the only submitted form. Attribution is required, because an agent never clicks Submit.
- `Filled, not submitted` — the form was completed and left at the review page.
- `Abandoned (<reason>)` — e.g. the posting closed, or the form required account creation.

**`Notes` SHOULD capture:** which fields needed manual handling, anything the ATS did that a future application to the same vendor should expect, whether files were uploaded manually, and whether outreach happened.

**Append-only.** Later developments are appended as `- **Update (YYYY-MM-DD)**:` bullets. The original four fields are never rewritten.

---

## `job-history.md`

**Purpose.** The per-application ledger: one section per application ever pursued or deliberately passed on, with enough detail that nothing is ever re-evaluated cold. It is the calibration reference for future materials — the framings that were softened or sharpened last time are recorded here.

**Sole writer: chronicler.** Every other agent reports what it did in its task output and the chronicler logs it. This is the single most important ownership rule in the system: historically every agent appended here in its own drifting format, and the file became unreadable. It is also **never mixed with** `network-scan-history.md` or `job-search-history.md` — those record *searches*, this records *applications*.

### Structure

```markdown
# Job History

*Last updated: 2026-01-18 — Northwind Systems Director of IT Infrastructure submitted by the user (3rd submitted application). Cascade Analytics materials drafted, pending decision.*

## Northwind Systems — Director of IT Infrastructure
- **Status**: Submitted (2026-01-16) — form filled and verified by envoy; final Submit clicked by the user
- **Location model**: Fully remote, US
- **Comp**: $185,000 - $240,000 base plus equity
- **Files**: `input/northwind-systems-dir-it-2026-01-15/` (posting); `output/northwind-systems-dir-it-2026-01-15/` (resume, cover letter, applied log, rendered .docx pair)
- **Warm contact**: Jordan Keel, Director of Engineering — noted in posting.md, no outreach drafted
- **Notes**: Found via network scan of contacts 26-50, rated High. Resume led with
  the automation and audit bullets. Cover letter names the missing security
  certification directly rather than working around it.
- **Revision (2026-01-16)**: The user corrected the endpoint count from 750 to 900 at
  Harborline Logistics. Fixed in profile.md, resume, and cover letter; both docs
  re-rendered. Letter re-verified at 312 words, zero em dashes.

## Fabrikam Health — Director of Security Operations
- **Status**: Passed (2026-01-12) — on-site five days a week in a metro the user has ruled out; the role itself was a strong functional match
- **Location model**: On-site, 5 days
- **Comp**: Not listed
- **Files**: `input/fabrikam-health-dir-secops-2026-01-11/posting.md` (posting only, no materials)
- **Notes**: Logged so it is not re-evaluated cold on a future scan.

## Open Items / Follow-ups
- **2026-01-18 — pending decision:** Cascade Analytics Senior Manager, Platform
  Engineering — materials drafted 2026-01-17, not submitted. Awaiting the user's call
  on whether two applications to the same company should go out in parallel.
- **2026-01-15 — time-sensitive:** Lakeshore Robotics IT Director posting closes
  2026-01-31 and is still undrafted.
```

### Rules

- **Header.** Line 1 is `# Job History`. Line 3 is a single italic line: `*Last updated: YYYY-MM-DD — <one-to-three-sentence summary of what changed and the running counts>*`. The chronicler rewrites this line on every update; it is the one line in the file that is not append-only.
- **One `## Company — Role` section per application.** Em dash between company and role. Sections are ordered oldest first; new applications are appended before `## Open Items / Follow-ups`.
- **Required fields per section:** `**Status**`, `**Location model**`, `**Files**`, `**Notes**`. `**Comp**` is required and takes the literal `Not listed` when the posting did not state one. `**Warm contact**` is optional.
- **The three status families:**

  | Family | Form | Requirement |
  |---|---|---|
  | drafted | `Materials drafted (not yet submitted)` | may add a date and the reason it is waiting |
  | submitted | `Submitted (YYYY-MM-DD) — <who clicked Submit and how>` | **submitter attribution is required.** An agent never clicks Submit, so this always names the user, and says whether an agent filled the form first. |
  | passed | `Passed (YYYY-MM-DD) — <reason>` | **the reason is required.** Passes are logged precisely so nothing is re-evaluated cold. A posting that closed before submission is a pass with that reason. |

- **Dated append-only sub-bullets.** Later developments are appended to the section as `- **Update (YYYY-MM-DD)**:`, `- **Revision (YYYY-MM-DD)**:` (materials changed), or `- **Correction (YYYY-MM-DD)**:` (a previously recorded fact was wrong). Existing bullets are never edited. Sub-bullets nested one level under these are allowed for multi-round revisions.
- **`## Open Items / Follow-ups` is always the last section.** Entries are dated, name the thing that is waiting and on whom, and are removed only when actually resolved. This is the only section from which content is deleted, and only on resolution.

---

## `network-scan-history.md`

**Purpose.** The append-only log of every network scan: which contacts were covered, which companies were checked, what was found, and what could not be resolved. It is how "scan contacts 426-450" knows where 425 ended. **Writer:** lookout, via `jobhunt:scan-roles`.

```markdown
# Network Scan History

Append-only log of network scans run by `jobhunt:scan-roles`.

---

## 2026-01-15 - Network Scan (contacts 26-50, 22 companies)

Scope: sequential batch resuming from contact 26, sorted by Connected On descending. 2 contacts had blank Company fields (skipped) and 1 listed their own name as the company (self-employed, skipped).

| Company | Contact | Role Found | Fit | URL |
|---------|---------|------------|-----|-----|
| Northwind Systems | Jordan Keel (Director of Engineering) | Director of IT Infrastructure | High | https://boards.greenhouse.io/northwindsystems/jobs/4471902 |
| Cascade Analytics | Priya Anand (Senior Account Executive) | Senior Manager, Platform Engineering | Medium | https://cascade-analytics.example.com/careers/1187 |
| Harborline Logistics | Sam Okonkwo (VP Operations) | No matching roles (14 open, all warehouse operations) | - | - |
| Fabrikam Health | Dana Whitlock (Clinical Systems Lead) | Director of Security Operations | Low | https://fabrikam-health.example.com/careers/902 |
| Vector Foundry | Chris Mbeki (Staff Engineer) | Careers page unreachable (TLS error, URL confirmed correct) | - | - |

### Companies without a resolvable careers page (3)
Summit Group (name too ambiguous), Rivera Coaching (solo brand, marked ignored), Blank (contact listed no company).

**Result: 1 High fit saved (Northwind Systems Director of IT Infrastructure, `input/northwind-systems-dir-it-2026-01-15/`). 1 Medium reported with a direct URL. 1 Low noted (strong function match, on-site only). 3 companies unresolved rather than guessed. Vector Foundry flagged for retry, not confirmed-empty.**
```

### Rules

- **Append-only.** New sections go at the end. Prior sections are never edited, including when a later scan proves one of their conclusions wrong — that correction belongs in the new section.
- **Section heading:** `## YYYY-MM-DD - <ScanType> (<scope>)`. Scan types in use: `Network Scan`, `Targeted Company Scan`, `Re-evaluation`. The scope parenthetical states the contact range and the company count.
- **Scope sentence.** One paragraph immediately after the heading stating what was covered, how it was ordered, and what was skipped and why. Skipped rows are counted, not silently dropped.
- **Results table**, columns exactly `| Company | Contact | Role Found | Fit | URL |`. One row per company. `Role Found` carries either a role title or a stated non-result (`No matching roles (N open, none matching)`, `Not currently hiring`, `Careers page unreachable (<reason>)`). `Fit` is `High`, `Medium`, `Low`, or `-`. `URL` is the direct posting URL for a scored row, `-` otherwise.
- **Unresolved list**, an optional `### Companies without a resolvable careers page (N)` subsection naming each and why. Ambiguous names are listed here, never guessed at.
- **Bold `**Result:**` line** closing the section: what was saved, what was reported without saving, what was unresolved, and any board flagged for retry rather than confirmed-empty. The distinction between "no roles" and "could not read the board" MUST survive into this line.

---

## `job-search-history.md`

**Purpose.** The same shape as `network-scan-history.md`, for results that came from **keyword searches against configured job boards** rather than from the contact list. **Writer:** lookout, via `jobhunt:keyword-search`.

**These two files are never mixed, and neither is ever mixed with `job-history.md`.** Contact-sourced results go in `network-scan-history.md`; board-search results go here; applications go in `job-history.md`. Confusing them is a recorded lesson in `team-memory.md`.

The structure is identical to `network-scan-history.md` with two differences: the section heading's scan type is `Keyword Search`, and the table gains a leading `Source` column naming the board each result came from.

```markdown
## 2026-01-20 - Keyword Search (3 sources, 4 keyword sets, 38 results before dedupe)

Scope: keywords derived from preferences.md target roles ("director of IT", "IT infrastructure director", "director of security operations") plus the user-supplied term "platform operations", run against the three boards in preferences.md → Search Sources. Capped at 50 results per source. 12 results deduplicated against company-careers.json and job-history.md before scoring.

| Source | Company | Title | Comp | Location | Fit | URL |
|--------|---------|-------|------|----------|-----|-----|
| hiring.cafe | Lakeshore Robotics | Director of IT | $170,000 - $205,000 | Remote (US) | High | https://lakeshore-robotics.example.com/careers/44 |
| hiring.cafe | Vector Foundry | Head of Infrastructure | Not listed | Austin, TX (hybrid) | Medium | https://jobs.lever.co/vectorfoundry/8812 |
| Example Board | Fabrikam Health | IT Operations Director | $150,000 - $175,000 | On-site, 5 days | Low | https://fabrikam-health.example.com/careers/911 |

**Result: 1 High fit saved (`input/lakeshore-robotics-dir-it-2026-01-20/`). 1 Medium reported with a direct URL — comp unlisted, recorded as a gap. 1 Low noted for location only. 12 duplicates suppressed; no board flagged for retry.**
```

Ranking within the table is by fit tier, then comp midpoint, then recency — explicitly not the board's own relevance order.

---

## `preferences.md`

**Purpose.** What the user is looking for and what they will not accept. Every scoring decision reads it fresh, because it changes. **Writer:** chronicler, on an explicit preference change from the user. `jobhunt:setup` creates it from the preferences interview.

**Provenance convention.** Any statement of a preference that came from the user carries the phrase **"confirmed directly by the user (YYYY-MM-DD)"**. Anything inferred rather than confirmed is marked `[inferred — confirm]` and is treated as provisional by every reader. This distinction is load-bearing: an inferred comp floor that silently hardens into a filter will quietly discard real matches.

### Sections

Required, in this order: `## Target Roles`, `## Location`, `## Compensation`, `## Must-Haves`, `## Dealbreakers`, `## Nice-to-Haves`, `## Company-Specific Exceptions`, `## Notes`.

Optional, appended after `## Notes`: `## Scan Settings`, `## Scoring Overrides`, `## Search Sources`, `## Voice`.

```markdown
# Job Preferences

*Last updated: 2026-01-14*

## Target Roles
- Director of IT
- Director of IT Infrastructure
- Director of Security Operations
- Head of IT
- Senior Manager titles in IT, security, or infrastructure — in scope generally, provided the role clears every other criterion below

Confirmed directly by the user (2026-01-05): senior IT leadership at the Director or Head-of-function level. Broadened directly by the user (2026-01-14): Senior Manager titles are in scope and are not filtered out on title alone.

## Location
Based in Denver, CO. Confirmed directly by the user (2026-01-05): remote roles anywhere in the US, or roles within commuting distance of Denver.

## Compensation
Confirmed directly by the user (2026-01-05): targeting $170,000 - $240,000 base.

## Must-Haves
- None specified.

## Dealbreakers
- No relocation.
- No fully on-site roles outside the Denver metro.

## Nice-to-Haves
- Base above $240,000.
- Companies with a published engineering blog.

## Company-Specific Exceptions
- **Lakeshore Robotics**: confirmed directly by the user (2026-01-10) — individual-contributor roles are in scope here, evaluated case by case on actual fit rather than title.

## Notes
Target roles, location, and compensation confirmed directly by the user during setup on 2026-01-05. Target-role list broadened 2026-01-14 (see Target Roles).

## Scan Settings
- last_resolved_days: 90
- last_checked_days: 14
- not_found_retry_days: 180
- unresolved_retry: never
- contact_order: connected_on_desc

## Scoring Overrides
- Comp unlisted at a company with no public band caps the rating at Medium rather than being scored neutral.
- Hybrid roles within 30 miles of Denver score as location-satisfied.

## Search Sources
- **hiring.cafe**
  - board_url: https://hiring.cafe/
  - search_url: https://hiring.cafe/?q={keywords}&location={location}
  - notes: Results are a listing page. Never call a full-page text extraction on it.
- **Example Board**
  - board_url: https://boards.example.com/
  - search_url: https://boards.example.com/search?query={keywords}&loc={location}&page={page}

## Voice
- voice_skill: none
```

**`## Scan Settings`** overrides the `company-careers.json` freshness defaults. Keys are exactly as shown; values are integers (days) except `unresolved_retry`, which is `never` or an integer, and `contact_order`, which is `connected_on_desc` (default), `connected_on_asc`, or `file_order`. An absent key means the documented default applies.

**`## Scoring Overrides`** is a free-form bullet list of adjustments to the default rubric. Each bullet states a condition and the adjustment. It modifies the rubric, it does not replace it; the base rubric still runs first.

**`## Search Sources`** lists boards for `jobhunt:keyword-search`. Each entry is a bold board name with `board_url` (required), `search_url` (required — a URL pattern with `{keywords}`, and optionally `{location}` and `{page}` placeholders), and `notes` (optional). No board is hardcoded anywhere in the plugin; an empty or absent section means keyword search has nothing to run against and says so.

**`## Voice`** holds `voice_skill: <plugin>:<skill>` or `voice_skill: none`. When a skill is named, scrivener loads it and runs its self-check before presenting a letter as final. When it is `none` or the section is absent, `jobhunt:cover-letter`'s default register applies.

---

## `profile.md`

**Purpose.** The user's verified work history: the single source of truth for every factual claim any resume or cover letter is allowed to make. If it is not in here, it does not go into materials. **Writers:** scrivener (same-turn factual corrections the user gives while reviewing materials), chronicler (consistency tidying only — a stale cross-reference, a duplicated entry; never a new fact).

### Structure

```markdown
# Work History Profile

*Last updated: 2026-01-16*

## Candidate Overview
**Name**: Alex Rivera
**Core expertise**: IT leader with 14 years across infrastructure, identity, and security operations, including 6 years at director level running full IT functions for distributed organizations.
**Career throughline**: Moved from hands-on network and systems work into IT operations management, then into director-level ownership of infrastructure and compliance.

---

## Role: Director of IT Infrastructure at Cascade Analytics
**Dates**: 03/2021 - Present
**Company context**: Analytics software company, roughly 1,100 employees across three US sites.
**Scope**: Owns corporate infrastructure, identity and endpoint management, and the internal compliance program. Not a product-engineering mandate.

### Key Accomplishments
1. **Provisioning rebuild**: Rebuilt cloud environment provisioning on Terraform, taking setup from several days to under an hour. **Guardrails**: no dollar figure and no headcount impact has been documented — do not attach a savings number.
2. **Audit ownership**: Carried the organization through two SOC 2 Type II audits with no findings.
3. **Team**: Manages 2 team leads and 11 engineers on a $4M budget.

### Other Details
- Team/leadership: 2 direct managers, 11 engineers, $4M operating budget.
- Tools/methods: Terraform, Ansible, managed identity and device enrollment, agentic AI assistants used hands-on for infrastructure tooling.
- Why they left previous role: N/A, current role.

**Correction log**: 2026-01-16 — The user corrected the Harborline Logistics endpoint migration from 750 to 900 endpoints. Applied to that role's accomplishment #2 and to the Northwind Systems materials the same day.

---

## Role: IT Operations Manager at Harborline Logistics
**Dates**: 06/2016 - 03/2021
...

## Career Notes
Earlier roles: Systems Engineer, Lakeshore Robotics (2014-2016); Network Technician, Vector Foundry (2012-2014).

## Cross-Role Patterns
- **Agentic AI & AI Infrastructure** is an always-include competency, confirmed directly by the user (2026-01-12). Grounding facts: hands-on agentic tooling at Cascade Analytics (see that role's tools/methods line). State it as hands-on tooling use, not as having built AI platforms.
```

### Rules

- `## Candidate Overview` is required and carries `**Name**`, `**Core expertise**`, `**Career throughline**`.
- One `## Role: <Title> at <Company>` section per role, most recent first, separated by `---`. Required fields: `**Dates**` (`MM/YYYY - MM/YYYY` or `- Present`), `**Company context**`. Optional: `**Scope**`, used when the role's real breadth is wider or narrower than the title implies.
- `### Key Accomplishments` is a **numbered** list — numbered so that a correction log entry and a job-history note can cite "accomplishment #4" and mean it. Numbers are stable; a new accomplishment is appended with the next number rather than inserted.
- `### Other Details` is a bullet list, conventionally including team/leadership scope, tools and methods, and **why they left** — that last one is asked once during setup and saves an awkward improvisation later.
- **Correction-log convention.** Corrections are appended inline, in the role section they affect, as `**Correction log**: YYYY-MM-DD — <what was wrong, what is true, where it was applied>`. Multiple entries accumulate in date order; none are ever removed. A correction that also invalidates already-drafted materials MUST say so, so the stale materials can be found later.
- **Phrasing-guardrail convention.** Any fact whose safe phrasing is narrower than it first appears carries a bold `**Guardrails**:` clause naming what may be stated and what must not be extrapolated. Guardrails typically state: no headcount, no dollar figure, no duration beyond what was given, no title upgrade. They are binding on scrivener. This convention exists because the gap between "true" and "true as phrased" is where a resume becomes a liability.
- `## Career Notes` and `## Cross-Role Patterns` are optional trailing sections. Cross-Role Patterns is where always-include competencies and their grounding facts live — a competency declared there MUST name the roles that ground it.
- **Never invent.** Anything drafted from a resume the user supplied but not confirmed by them is marked `[inferred — confirm]` and MUST NOT be cited in materials until confirmed.

---

## `application-data.md`

**Purpose.** The reusable answers an ATS form asks every time, so the user is asked once rather than once per application. **Writer:** envoy, via `jobhunt:apply`; created by `jobhunt:setup`.

```markdown
# Application Data

## Personal Information
- First Name: Alex
- Last Name: Rivera
- Email: alex.rivera@example.com
- Phone: 555-0142
- City: Denver, CO 80202
- Country: United States

## Online Profiles
- LinkedIn: https://www.example.com/in/alex-rivera
- GitHub: (none on file)
- Portfolio: (none on file)

## Standard Answers
- How did you hear about us: Job Board
- Previously worked at this company: No
- Authorized to work in the US: Yes
- Requires visa sponsorship: No
- Subject to employment agreements or post-employment restrictions: No

## EEO / Voluntary Disclosures
(Optional. Skipped during setup; envoy will use decline-to-answer options unless
the user fills this in.)
- Gender: Decline to self-identify
- Race/Ethnicity: Decline to self-identify
- Veteran status: Decline to self-identify
- Disability: I don't wish to answer

## Custom Answers
- "Why are you interested in this company?" (Northwind Systems, 2026-01-16): Answered
  from the cover letter's opening paragraph. Reusable framing, not the literal text.
- Desired start date: Two weeks from offer.
```

### Rules

- **Sections in this order:** `## Personal Information`, `## Online Profiles`, `## Standard Answers`, `## EEO / Voluntary Disclosures`, `## Custom Answers`. All five headings are present even when a section is empty.
- **`## EEO / Voluntary Disclosures` is explicitly optional and skippable.** Setup MUST offer to skip it, MUST NOT re-prompt for it, and MUST print the plaintext warning below. When the section is empty, envoy answers EEO questions with the form's decline-to-answer option and records that it did so.
- **Plaintext-on-disk warning.** This file holds personal contact details and, if filled, demographic information, unencrypted, in the user's data directory. Setup states this before asking for any of it. `DATA_DIR` SHOULD be excluded from version control; the plugin's `.gitignore` excludes any local `.jobhunt/` for exactly this reason.
- **`## Custom Answers` grows.** Each entry records the question, the company and date it came up, and the answer or the reusable framing. A question that has been answered twice differently is a signal to ask the user which answer stands, not to pick one.
- **No answer is invented.** A field the user has not supplied is left as `(none on file)` and reported to the user as needing an answer at fill time.
