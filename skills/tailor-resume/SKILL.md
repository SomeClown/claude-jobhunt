---
name: tailor-resume
description: Produce or revise a tailored resume for one job posting, built entirely from the candidate's documented work history. Trigger on "tailor my resume for [job/company]," "update the resume for [posting]," "revise [company]'s resume with [correction]," and any follow-up edit to a resume already drafted for a specific application. Enforces that every claim traces to profile.md and that requirements the candidate can't cover are named, not written around.
---

# tailor-resume

This skill owns `jobs/[slug]/resume.md` — the tailored resume for one application. Its exact grammar (section order, the `Key Skills:` line, the achievement-bullet format the renderer parses) is specified once, in `${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md`; this file does not restate it. What this file owns is the *process* that fills that shape honestly: mapping a posting's requirements onto documented facts, deciding what to lead with, and saying plainly what got left out.

## Before drafting

1. Resolve `DATA_DIR` per `${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md`.
2. Find the job folder and its `posting.md`. **If no `posting.md` exists for this application, stop here** — this skill does not create postings, and drafting against a title and a vague memory of a listing is how a resume ends up answering the wrong requirements. Hand back to whatever scanned or evaluated the role.
3. Read `profile.md` in full, not just the role that looks most relevant — a requirement is sometimes covered by an accomplishment filed under a different role.
4. If `jobs/[slug]/resume.md` already exists, read it. This is a revision, not a fresh draft: keep what still fits, and treat the difference between the old and new posting language as the reason anything changes.
5. Read `team-memory.md` → Standing instructions for a declared always-include competency (see below).

## Map every requirement before writing a word

Work through `posting.md`'s `## Requirements` — both **Required** and **Preferred** — one line at a time. For each, find the `profile.md` accomplishment, role scope, or Other Details line that documents it, or mark it uncovered. Do this mapping explicitly, even for the obvious ones; a requirement skipped in the mapping pass is the one that quietly goes unaddressed in the draft.

**The pre-draft clarification rule.** A requirement can look like a hard gap on first read and turn out not to be one. "Managed a team that owned X" in the posting against a profile that documents "personally built X" is not an automatic match — but neither is profile silence on "managed X" automatic proof the candidate never did it. Before treating an apparent gap as confirmed, ask: is this career-adjacent to something the profile *does* document, in a way `profile.md` simply never had reason to spell out? If so, **ask the user before drafting** rather than resolving the ambiguity yourself in either direction. This is the provisional-gap lesson in `team-memory.md`, applied at the one moment it matters most — before the framing is already committed to paper. A first-pass "hard gap" read is narrowed by one clarifying fact more often than it holds up.

If the user is reachable directly, ask with concrete framing ("Your profile documents X but not Y — did you do Y, or is that a genuine gap?"). If running as a subagent with no line to the user, do the parts of the draft that don't depend on the answer and end the task with a clearly marked open question rather than guessing either way.

## Draft: reorder and rewrite, never invent

- Lead the `SUMMARY` and the first bullets under the most relevant role with whatever maps most directly to the posting's stated needs. Reordering and re-emphasizing documented facts is the job; inventing new ones is not — not a tool, not a certification, not a headcount, not a dollar figure that isn't already in `profile.md`.
- Every `**Guardrails**` clause on a `profile.md` accomplishment is binding. If a fact is only safe to state without a dollar figure, it goes into the resume without one too, no matter how much better the bullet would read with one.
- **The always-include competency.** If `team-memory.md` → Standing instructions declares one, grounded in `profile.md` → Cross-Role Patterns, it goes on the `Key Skills:` line of every resume this skill produces — phrased exactly as its grounding entry allows, never upgraded. `data-formats.md`'s sample profile shows the shape: an entry like "Agentic AI & AI Infrastructure" grounded in one role's hands-on tooling use, stated as tooling use and nothing more.
- Follow `${CLAUDE_PLUGIN_ROOT}/skills/tailor-resume/references/writing-rules.md` for sentence length, banned filler, and the metric-sourcing rule while drafting — not as a pass applied after the fact.

## Tailoring notes: say what you didn't claim

Every draft ships with tailoring notes covering what was reordered, what was rewritten and why, and — the part that is not optional — **what was deliberately not claimed**. Name each uncovered requirement from the mapping pass and say plainly how it was handled: a genuinely transferable angle used instead, or a real gap the resume simply doesn't address (a gap belongs in the cover letter's honest-aside treatment, not smoothed over here). If the mapping pass turned up nothing uncovered, say that too — "every requirement traces to a documented fact; nothing was omitted" is information, not filler. This is a signature behavior of this skill, not an optional closing note.

## Mid-draft corrections

When the user corrects a fact while reviewing, update `profile.md` in the same turn — a dated entry in that role's `**Correction log**` — before or alongside fixing the resume. If the correction invalidates something `posting.md`'s `## Fit Assessment` said, this skill may only append a `## Updates (YYYY-MM-DD)` section to `posting.md` recording the old and the new value; it does not own that file's other sections and does not edit them directly.

## Output

Write `jobs/[slug]/resume.md`. In the task output: the tailoring notes described above, which always-include competency (if any) was applied and where it's grounded, and any open question raised by the pre-draft clarification rule. Do not write tailoring notes into the resume file itself — `data-formats.md` doesn't define a place for them there, and the resume file's grammar is fixed.
