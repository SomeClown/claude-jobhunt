# Architecture

This document is about *why* the six agents are split where they are, not just what each one does. The split isn't arbitrary — every boundary here is either a correctness property (a file can only be trusted if exactly one agent writes it) or a safety property (a subagent that can't fan out can't stall; an agent that can't click Submit can't submit by accident).

## The six agents

| Agent | Owns | Lacks (deliberately) |
|---|---|---|
| **cartographer** | `company-careers.json`'s resolution fields (`careers_url`, `type`, `last_resolved`) | the `Agent` tool; any browser tool |
| **lookout** | `network-scan-history.md`, `job-search-history.md`, `company-careers.json`'s scan fields, High-fit `posting.md` saves | the `Agent` tool |
| **appraiser** | deep-dive `posting.md` fills | the `Agent` tool; never writes materials |
| **scrivener** | `jobs/[slug]/resume.md`, `cover-letter.md`, the rendered `.docx` pair | the `Agent` tool |
| **envoy** | `application-data.md`, `jobs/[slug]/applied.md` | Submit/Send-clicking, ever |
| **chronicler** | `job-history.md`, `preferences.md` (on explicit change), `team-memory.md` | any tool that touches materials, postings, or the cache |

Skill-to-agent map: `cartographer` drives `jobhunt:resolve-careers`; `lookout` drives `jobhunt:scan-roles` and `jobhunt:keyword-search`; `appraiser` uses no dedicated skill of its own (it applies the same fit-scoring procedure inline, against a live posting); `scrivener` drives `jobhunt:tailor-resume`, `jobhunt:cover-letter`, and `jobhunt:render-docx`; `envoy` drives `jobhunt:apply`, which in turn delegates the mechanical fill step to a fill subagent per `skills/apply/references/fill-page.md`. `jobhunt:setup` isn't owned by any of the six — it's the front door, invoked directly, that builds the data directory those six then operate on.

## Single-writer file ownership is a correctness property, not tidiness

Every file in a user's data directory has exactly one agent permitted to write it (`reference/data-formats.md`'s ownership table is the normative copy; `team-memory.md`'s File Ownership section is the operational restatement). This isn't a style preference — it's what makes any of the files trustworthy at all. A file two agents can write turns into a file nobody can trust: two agents append the same fact in slightly different words, a third reads the older phrasing, and the disagreement is invisible because both writes technically succeeded. The project's operational history records exactly this failure once — an agent updated a shared file it didn't own, a different agent then reported the file as "already updated," and the state pointers at the top disagreed with the newest entry at the bottom. Nothing errored. The cost was paid later, by whichever reader trusted the wrong half.

The fix generalizes past that one file: **every agent that produces something reports it in its task output; exactly one agent (usually `chronicler`, sometimes the file's direct owner) writes it down.** `job-history.md` and `team-memory.md` are both chronicler-only for the same reason. `company-careers.json` is the one file with a field-level split (resolution fields vs. scan fields) rather than a whole-file single owner — and even there, each writer merges into the existing object and never touches a field it doesn't own.

## Why cartographer, lookout, appraiser, and scrivener lack the `Agent` tool

`cartographer`, `lookout`, `appraiser`, and `scrivener` do not have the `Agent` tool in their frontmatter. Only `envoy` does. This is enforced structurally, not just by convention: `scripts/validate-agents.js` fails the build if any agent outside that allow-list gains `Agent`, and `scripts/expected-agent-tools.json` is the checked-in snapshot it diffs against.

The reason is a specific, previously-observed failure mode: a subagent that spawns its own subagents can fan out into a state where a grandchild's completion notification never reliably routes back to the original spawner. The parent then waits on work it will never hear finished — a stall, not a crash, which makes it worse (no error, no retry, just a session that never completes). The fix isn't "be careful about fan-out" — that's a rule that erodes under pressure the first time a batch looks big. The fix is structural: an agent that never has `Agent` in its tool list *cannot* spawn a subagent, so the failure class is unavailable to it regardless of how it's prompted. `envoy` is the one exception, and only for one narrow, single-level delegation — handing an already-approved field-plan to the fill subagent contract in `skills/apply/references/fill-page.md`, which itself has no `Agent` tool and cannot delegate further.

Practically, this means batch work (a network scan, a keyword sweep) runs inside one agent's own context rather than fanning out per-company or per-posting. For the batch sizes this plugin is designed around, that's not a real limitation — it's the thing that makes the batch reliably finish.

## Why resume, cover letter, and rendering live in one agent

`scrivener` owns the tailored resume, the cover letter, and the `.docx` render step together, rather than splitting them across separate agents. The reason is that gap-handling has to agree between the two documents: how a missing qualification is framed in the resume (omitted, or covered by a transferable angle) and how it's conceded in the cover letter (named as an honest aside, or not mentioned) are one decision, not two. Splitting resume-writing and cover-letter-writing across two agents means that decision gets made twice, independently, by two contexts that can't see each other's reasoning — and the two documents drift: a resume that quietly omits a requirement next to a cover letter that names the same gap outright reads as an inconsistency to whoever reads both. Keeping all three in one agent's hands means the tailoring notes from the resume pass are still in context when the cover letter gets drafted.

## Why evaluation stops for a human decision instead of flowing into drafting

`appraiser` produces a fit assessment and a pursue/pass recommendation, then stops — it never proceeds into drafting materials on its own, even when asked to "evaluate and tailor" in one request. The decision to invest tailoring effort in a specific posting is the user's, not the team's: it routes real time (and, once `envoy` is involved, a real application) on a judgment call only the user has full context for. An agent that can evaluate and then silently proceed to drafting has effectively made that call on the user's behalf, however good its judgment. Stopping for the decision costs one round-trip; skipping it costs a materials pass on a posting the user would have passed on for a reason the agent had no way to see (a personal history with the employer, a scheduling conflict, a change of mind since the last preferences update).

## The model-pin policy

Each agent's `model` is pinned in its own frontmatter, independent of whatever model the orchestrating session itself is running on:

| Agent | Model | Why |
|---|---|---|
| `appraiser` | opus | Judgment-heavy: reading what a role actually does versus what its title implies, weighing gap severity, and rendering an honest pursue/pass call are exactly the kind of nuanced reasoning that benefits from the stronger model. |
| `scrivener` | opus | Same reasoning, applied to writing: mapping requirements to documented facts, deciding what to lead with, and phrasing an honest gap as a natural aside rather than a flat confession all reward the stronger model's judgment. |
| `cartographer`, `lookout`, `envoy`, `chronicler` | sonnet | Execution-heavy: resolving names via search, extracting listing data, filling form fields from an approved plan, and writing bookkeeping entries in an established format are comparatively mechanical — faster and cheaper without a meaningful quality loss. |

The split is judgment vs. execution, not "important agent vs. unimportant agent" — `envoy` sits at the most safety-critical point in the pipeline and still runs on the faster model, because its job (fill exactly what was approved, stop at the review page) doesn't need heavier reasoning, it needs reliable narrow execution. `scripts/validate-agents.js` enforces this pin as a regression guard (appraiser and scrivener must be `opus`; everything else must be `sonnet`), because a silent model downgrade on a judgment-heavy agent is the kind of drift that's easy to not notice until the quality of a pursue/pass call or a tailored resume quietly degrades.

Because the pin lives in each agent's own frontmatter, it holds regardless of what model is driving the session that invokes them — a user running a lighter model for everyday work still gets `opus`-level judgment on evaluation and materials specifically, and still gets `sonnet`-speed execution on the rest.

## What's intentionally not automated

- **Submission.** Every submit/send action needs the user's own live click. See `docs/SAFETY.md`.
- **Account creation and authentication.** If a form requires signing in, the plugin stops and waits for the user.
- **PDF/DOCX upload.** The available browser tooling uploads images only; a resume or cover-letter file upload is always a manual step.
- **Anything from `preferences.md` that isn't explicitly stated.** A soft, unstated preference is never inferred into a hard filter.
