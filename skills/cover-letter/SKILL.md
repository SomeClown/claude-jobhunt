---
name: cover-letter
description: Produce or revise a 250-350 word cover letter for one job posting, mapping 2-3 real achievements to the employer's stated needs. Trigger on "write a cover letter for [company/role]," "draft the cover letter for [posting]," and follow-up tone or factual edits to a letter already drafted. Never fabricates an achievement, and never hides or overplays a gap.
---

# cover-letter

This skill owns `jobs/[slug]/cover-letter.md`. The file's fixed grammar — the salutation, the closing, the 250-350 word window, the hyphens-only dash rule — is specified once, in `${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md`; this file does not restate it. What this file owns: which achievements to use, how the paragraphs are structured, how to name a gap without either hiding it or apologizing for it, and the slot where a user's own voice skill takes over.

## Before drafting

1. Resolve `DATA_DIR` per `${CLAUDE_PLUGIN_ROOT}/reference/data-dir.md`.
2. Read `posting.md`'s `## About the Role` and `## Requirements`.
3. Read `profile.md`.
4. If `jobs/[slug]/resume.md` already exists, read its tailoring notes and reuse the same read on what's covered and what isn't — the two documents must never disagree about what the candidate is and isn't claiming. If no resume has been drafted yet for this application, apply the same accuracy discipline and the same pre-draft clarification rule that `jobhunt:tailor-resume` uses before treating anything as a confirmed gap.
5. Check `preferences.md` → `## Voice` for a declared `voice_skill`.

## Pick 2-3 achievements

Map each to a specific need the posting actually states, not a generic strength the achievement happens to demonstrate. Never fabricate one, and never round an achievement up — every `**Guardrails**` clause on a `profile.md` accomplishment binds here exactly as it does in the resume.

## The paragraph structure

3 to 5 paragraphs, each with a named job:

| Paragraph | Job |
|---|---|
| First | Hook and why this role, specifically — not a generic opener that could go to any employer. |
| Next | The strongest achievement, mapped to the posting's clearest stated need. |
| Next | A second achievement, mapped to a different stated need — **or** the honest gap, handled as a natural aside (below), when there is a real one worth naming. |
| Optional | Additional room, used only when there's a genuine second point to make, never as padding to reach the word count. |
| Last | The close. |

## The honest-gap tone rule

This is the rule most letters get wrong, and it is worth getting exactly right.

Name real gaps. Never invent an achievement to paper over one, and never leave a requirement the posting states outright go unaddressed when the letter has room to name it honestly. But a gap belongs *inside* a sentence that also says what the candidate brings — never a flat confession block, and never a lead-in that announces its own honesty ("Honestly, I should mention..." / "I want to be transparent that..."). The confession-as-topic-sentence pattern reads as an apology; a natural aside reads as someone who already knows their own shape and isn't precious about it.

Compare:

- **Wrong** (flat confession block): *"I should be honest that I do not have a security certification. However, I believe my experience makes up for this."*
- **Right** (natural aside — from `data-formats.md`'s worked example): *"What I do not bring is a security certification, and your posting lists one as preferred. I have built and defended the controls those certifications test, and I have sat on the receiving end of the audits that check them, but I have not sat the exam. I would rather say that now than let you find it later."*

The difference isn't softness — the second version states the same fact just as plainly. It differs by doing two things in the same breath: naming the gap and stating what actually offsets it, in one continuous train of thought rather than a confession followed by a defense.

## The bring-your-own-voice slot

Check `preferences.md` → `## Voice` for `voice_skill`:

- **Declared:** load it via `Skill` and apply it at the professional/formal register it describes — not the skill's full range, if it has a wider one — and run that skill's own self-check before presenting the letter as final.
- **Not declared, or set to `none`:** this skill's own default register applies — plain, direct, no corporate jargon (the same banned-filler discipline as `${CLAUDE_PLUGIN_ROOT}/skills/tailor-resume/references/writing-rules.md`), willing to name a weak point without hedging it into meaninglessness, and varied sentence rhythm rather than four same-length sentences in a row.

## Verify before presenting as final

- **Word count**: body paragraphs only (salutation and closing excluded), 250-350 words.
- **Dash check**: scan for the em dash (`—`, U+2014) and the en dash (`–`, U+2013). Neither may appear anywhere in the letter; replace with a hyphen or rewrite the sentence. The renderer performs no dash substitution, so whatever is written here is what ships.
- **Salutation**: exactly `Dear Hiring Manager,` unless a specific named recipient is known and confirmed.
- **Closing**: exactly `Regards,` then the candidate's name, and nothing after it.

## Output

Write `jobs/[slug]/cover-letter.md`. In the task output: state the word count and explicitly confirm the dash check found zero em or en dashes (the stated check, not a silent pass), name which achievements were used and what each maps to, note how the gap (if any) was handled, and state whether a `voice_skill` ran and passed its own self-check.
