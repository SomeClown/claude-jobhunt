# Writing Rules

These are the measurable constraints `jobhunt:tailor-resume` drafts to. Earlier guidance for this kind of work cited a numeric readability target (a Flesch reading-ease score above 90); that number is dropped here in favor of rules that can be checked sentence by sentence, plus an optional scored second opinion from `${CLAUDE_PLUGIN_ROOT}/scripts/readability.js`. A score above 90 reads roughly fifth-grade — not the register a senior-leadership resume needs — and there is no record of that number ever having been checked against a real draft. The rules below are what actually bind.

---

## Sentence length

- **Median sentence length across the document: 20 words or fewer.** Count words in the `SUMMARY` paragraph and in every achievement bullet; take the median, not the average, so one long sentence doesn't get buried by a run of short ones.
- **No single sentence exceeds 35 words.** A bullet or a summary sentence that runs longer almost always contains two claims stitched together with "which" or "and" — split it into two.

## Banned filler

None of these appear in a resume or cover letter produced by this skill. Each one either makes an unverifiable claim about the candidate's character, or dresses up a plain word for no reason. Cut it, or replace it with the specific thing it was gesturing at.

| Phrase | Why it's banned | Write instead |
|---|---|---|
| results-driven | unfalsifiable self-description | the specific result, stated as a bullet |
| proven track record | says nothing a real accomplishment doesn't already show | the accomplishment itself |
| synergy / synergies | no concrete meaning | what actually combined, and what happened as a result |
| leverage (as a verb for "use") | inflated | used, applied, built on |
| utilize / utilization | inflated version of "use" | use |
| thought leader / thought leadership | self-assessment, not a fact | the specific thing published, led, or built |
| self-starter | unverifiable trait claim | an accomplishment that shows initiative without naming it |
| team player | unverifiable trait claim | what was actually done with the team |
| go-getter | unverifiable trait claim | an accomplishment |
| passionate about | unverifiable, and resume space is scarce | cut it; let the accomplishments carry the interest |
| dynamic | vague intensifier | cut it, or name the specific outcome |
| innovative solutions | vague | the actual solution, named |
| value-add / value-added | jargon | the value, stated directly |
| move the needle | cliché metaphor | the metric or outcome it's standing in for |
| best-in-class / world-class | unverifiable superlative | a fact the reader can judge for themselves |
| cutting-edge / state-of-the-art | vague intensifier on a tool or method | the tool or method, named |
| game-changer / game-changing | cliché | what actually changed |
| detail-oriented (as a standalone trait) | unverifiable | an accomplishment that demonstrates precision (e.g. "no findings across two audits") |

## Active voice

Resume bullets drop the subject ("I") by convention, but the verb still has to do active work. A bullet that describes something happening *to* the candidate's team or systems, rather than something the candidate did, reads passive even without the word "was."

- Passive: *SOC 2 compliance was achieved by streamlining evidence collection.*
- Active: *Streamlined evidence collection and carried the organization through SOC 2 with no findings.*

Every achievement bullet starts with an active past-tense verb naming what the candidate did, not what happened.

## No metric or claim without a source in `profile.md`

If a number isn't already written down in `profile.md` — a headcount, a budget, a percentage, a dollar figure, a duration — it does not appear in the resume, not even as a conservative estimate or a rounded range. A `**Guardrails**` clause that says "no dollar figure has been confirmed" means the accomplishment is stated without one: *"Rebuilt cloud provisioning, cutting environment setup from days to under an hour"* is a complete, honest bullet with no cost-savings figure attached, because none is on file. Inventing a plausible-sounding number is the single fastest way a resume becomes a liability the candidate has to explain in an interview.

## Sentence rhythm

A resume where every bullet opens with the same verb tense and runs the same length reads like a template, and a hiring manager skimming forty resumes notices the pattern before the content. Vary it deliberately: mix a short, direct bullet ("Led the SOC 2 audit response.") with a longer one that carries a second clause of context, and avoid opening three bullets in a row with the same verb. The `SUMMARY` paragraph should not be four sentences of identical length and shape — one short sentence up front, doing real work, reads better than a paragraph where every sentence is 18 words.

## The optional readability score

`${CLAUDE_PLUGIN_ROOT}/scripts/readability.js` can run against a drafted resume or cover letter and report a Flesch reading-ease score alongside the sentence-length distribution. **50 is a reasonable floor** for professional prose at this level — not 90. Treat the score as diagnostic, not as the gate: a passage that obeys every rule above but scores 48 is not sent back for a rewrite on the score alone, and a passage that scores 92 but contains a 40-word run-on sentence fails on the sentence-length rule regardless of what the score says. The sentence-level rules in this document are what bind; the script is a second opinion, run when it's useful and ignored when it disagrees with a rule that's actually being followed.
