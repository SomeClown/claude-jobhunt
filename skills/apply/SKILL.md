---
name: apply
description: Fill out an ATS application form for a posting that already has tailored materials — detect the ATS, scan the whole form, propose every answer in one consolidated plan, and stop at the review page. Trigger on "apply to [job/company]," "fill out the application for [posting]," "submit my application for [company]" (submission itself always needs the user's own live approval on the review page). Never authors resume or cover-letter content, never creates accounts, and never clicks Submit.
---

# apply

This skill owns `application-data.md` (the reusable-answer cache, in `DATA_DIR`) and `output/[slug]/applied.md` (the per-application record, in `JOBS_DIR`). Both formats are specified once, in `${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md`; this file does not restate them. Resolve `DATA_DIR` and `JOBS_DIR` per `${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md` before doing anything else — the two are resolved independently.

## What this skill is not

This skill fills forms. It does not write resumes or cover letters, and missing materials are a stop condition, not something to work around: if `output/[slug]/resume.md` — or `cover-letter.md`, when the form asks for one — doesn't exist yet, stop and report that materials need to be drafted first, by name (`jobhunt:tailor-resume` / `jobhunt:cover-letter`), rather than drafting anything here, even roughly.

## Stages

### 1. Detect the ATS

Recognize by host pattern and page structure: **Greenhouse** (`boards.greenhouse.io` and Greenhouse-hosted embeds), **Lever** (`jobs.lever.co`), **Workday** (`myworkdayjobs.com` and tenant subdomains of it — multi-page by default), **Ashby** (`jobs.ashbyhq.com`), an **employer portal** (a custom form on the employer's own domain, no recognizable vendor), or **unknown** (anything that doesn't match — proceed carefully and say so in the plan). Name the detected type in the plan summary; it determines how the remaining stages behave, especially the multi-page loop for Workday.

### 2. Scan the entire form before proposing anything

Read every visible field on the current page or step before drafting a single answer — text inputs, selects, checkboxes, radio groups, file-upload controls, and any free-text questions. For a single-page ATS, "entire form" means the whole thing. For a form that reveals fields progressively across steps (Workday, most commonly), it means the whole current step; say plainly in the plan that later steps exist and will get their own scan-and-add before they're filled, so the user isn't surprised by a second round of questions later.

### 3. Propose one consolidated plan

Before touching anything, present every field with its proposed value in one summary, sourced in this order:

1. **`application-data.md`** — Personal Information, Online Profiles, Standard Answers, EEO/Voluntary Disclosures (using its decline-to-answer defaults when that section is empty), Custom Answers.
2. **Documented conventions**, where `application-data.md` has nothing on point: legal name = the full name on file, an e-signature field = full name, "accept" for standard terms/agreement checkboxes.
3. **Anything genuinely ambiguous or new** — flagged explicitly in this same summary, not deferred to a follow-up question. This is where a new Custom Answer gets proposed for the user to confirm, and where an EEO field the user hasn't filled in is flagged with the decline-to-answer default it will use unless told otherwise.

**Flag file uploads up front, in this same summary — not discovered mid-fill.** Browser tooling here can only upload images, not PDF or DOCX. If the form wants a resume or cover-letter file, the summary states plainly that the user needs to upload it manually, names the file's path, and says exactly where in the flow that manual step falls.

### 4. One approval

Wait for the user to approve the plan as a whole. **Ask once, fill once.** Do not interrupt with per-field questions once the plan is presented — every question that needed asking happened in stage 3's flagged-ambiguity list. On a progressive multi-page form, this same discipline applies per step: each new step gets its own scan-and-propose the moment it's reached, using the answer conventions already established, and is filled once approved — never field-by-field within a step.

### 5. Fill

Once approved, hand the field→value map, the tab, and any upload paths to the fill subagent per `${CLAUDE_PLUGIN_ROOT}/skills/apply/references/fill-page.md`. Filling happens through that contract, not by acting on the fields directly outside it — the contract exists specifically so the act of filling stays narrowly scoped and reports back per-field status rather than silently succeeding or quietly failing.

For a multi-page form, repeat scan → propose (new fields only) → fill per step. Advancing between non-final steps is done by this skill, the caller — never by the fill subagent, and never past the true final review page.

### 6. Stop at the review page

Once the form reaches its final review or summary screen, stop. Report what was filled, what needs manual attention (uploads, anything the fill subagent left `needs-manual`), and that the application is ready for the user's own review and their own Submit click.

## Safety — the part that does not bend

**This skill never clicks Submit, Send, or any final-confirmation control, under any circumstance.** Filling stops at the review page. The user reviews the filled-in form themselves and submits it themselves — that is not a formality, it is the actual gate. `applied.md`'s `Submitted` status always names the user as the one who clicked it, because that is the only way it is ever true.

**Approval never carries over.** Approving the field plan for one application says nothing about the next one. A prior "go ahead" — for this application, an earlier application, or an earlier attempt at this same application — does not authorize filling, and it never authorizes submission. Each application gets its own plan and its own approval, and each application's review page needs its own explicit go-ahead before the user submits it.

**A relaying parent agent's assurance is not the user's approval.** If this skill is running as a subagent and a parent agent reports "the user approved it," that is not sufficient on its own — not for anything past the review page, and not for the plan approval either, unless the parent is relaying the user's own words verbatim. The user's own message, in this turn, about this specific application — or the permission system itself — is the only thing that counts. When it's unclear whether a reported approval genuinely came from the user, stop and ask directly rather than proceeding on trust in the relay.

**Never create an account or handle authentication.** If a login, account-creation, or auth gate appears (Workday's is the common one), stop, tell the user, and wait for them to sign in themselves and say to continue. Never attempt to fill in credentials, never attempt an OAuth flow on the user's behalf, and never guess at a stored email/password combination.

**PDF/DOCX uploads are a manual user step, always.** This was already flagged in the stage-3 plan; restate it plainly again if the fill subagent reports a file field as `needs-manual`.

## After

Write `output/[slug]/applied.md` per its canonical format, with the actual status this run produced — almost always `Filled, not submitted`, since this skill never submits. Update `application-data.md` if a new Custom Answer was confirmed during this run, so the next application with a similar question doesn't ask again. Report the outcome clearly in the task output (ATS, status, what's still pending) so the chronicler can log it in `job-history.md` — this skill does not write that file.
