# Fit scoring

The rubric `jobhunt:scan-roles` and `jobhunt:keyword-search` both use to rate every
plausible role `High`, `Medium`, or `Low`. It is a procedure, not a vibe: applied by
hand to the same posting twice, it produces the same tier both times. Follow the
steps in order — later steps assume the earlier ones already ran.

Everything here is a default. `preferences.md` → `## Scoring Overrides` can adjust
any of it; the base rubric still runs first, and an override is applied as a stated
adjustment to its output, not a replacement for the procedure.

---

## Step 0 — Read before scoring

Before applying anything below, read what the role actually does — the
responsibilities prose, not just the title — and note six things: the employer, the
function it performs, its title, its stated comp (or lack of one), its
location/remote policy, and its Required-qualifications list. Steps 1-6 are checks
against these six facts.

## Step 1 — Hard exclusions (never scored)

Check these first. Any one hit means this posting is **excluded, not scored** — do
not proceed to Step 2, and do not assign a tier. Count it toward the run's exclusion
tally instead (see Output discipline, below).

- The employer is on the `## Dealbreakers` list in `preferences.md`.
- The location model is one `preferences.md` rules out **explicitly** (e.g.
  relocation required, where the user has stated they will not relocate). A location
  that merely fails to satisfy a stated positive preference is **not** a Step 1
  exclusion — it goes to Step 5.
- A stated comp ceiling — the top of a posted range, or a single stated figure — is
  below the user's stated comp floor in `## Compensation`. Where a posting states
  conflicting comp figures, apply Step 4's more-favourable-figure rule *before*
  testing against the floor.

## Step 2 — Function classification

Classify what the role actually does against the user's target function:

- **Match** — the role performs the target function.
- **Adjacent** — real overlap with the target function, but not the same job. This
  is one of the four Step 7 factors.
- **Mismatch** — a different job family entirely, even when the title sits
  comfortably in the target band. The recurring examples: a quota-carrying sales
  role, a consulting practice's P&L leadership, a second-line assurance function that
  reviews or attests to work others own — all of which routinely carry
  Director/VP/CTO-adjacent titles without being the target function. **A mismatch
  forces the final rating to cap at Medium**, no matter what the rest of this
  procedure produces, and the write-up must name the mismatch explicitly (a title
  in-band on a different job family is exactly the case this gate exists to catch).
  A mismatch also counts as one Step 7 factor in its own right. Because a mismatch is
  always a counted factor, a mismatch posting can never reach High.

  An assurance function that reviews or attests to work others own is a mismatch; a
  function that designs, builds, and operates the controls or systems itself is not,
  even when its title uses risk, controls, audit, or compliance vocabulary.

  **General rule for revenue-generating functions.** "Sits inside a
  revenue-generating organisation" is not by itself a mismatch. A role there is a
  mismatch only when it carries a quota, owns bookings, or owns a P&L. A role that
  advises on work the candidate has themselves owned is a **Match**; advising on work
  the candidate has never owned is **Adjacent**. Sales incentive compensation alone
  does not constitute carrying a quota — the mismatch trigger is a stated quota
  number, bookings ownership, or P&L ownership.

  **Illustration — how this applies in one industry.** In enterprise technology, this
  general rule is what makes technical pre-sales and solutions-engineering roles —
  including the management layer over an SE team — a **Match** whenever
  `preferences.md` or `profile.md` documents pre-sales as part of the candidate's own
  background, and what makes vendor-side executive advisory roles (Field CISO,
  virtual or fractional CTO/CISO, technology evangelist) a **Match** whenever
  `profile.md` documents the candidate holding that advisory or pre-sales
  accountability of their own. "Advising rather than owning" makes such a role
  Adjacent only where the candidate has never held the advisory accountability
  itself; a consulting practice's P&L leadership remains a mismatch regardless, and
  so does a quota-carrying seller. Other professions have their own instances of the
  same general rule — apply the rule above directly when a posting doesn't match this
  example.

To separate **Match** from **Adjacent**, ask what the role's *primary accountability*
is, not what skills it touches. It is a Match if the role's core accountability is
one the candidate has held before, even at different scale or in a narrower slice of
it. It is Adjacent if the core accountability is a neighbouring function that draws
on the same skills — advising on work the candidate has never owned, or owning a
function the candidate has only ever consumed rather than run. Owning a narrower
slice of a function the candidate previously owned end to end is a **Match**, not
Adjacent. Scale differences and narrower scope do **not** by themselves make a role
Adjacent; a different primary accountability does.

This is the single most valuable check in the rubric — reading what a role does,
rather than scoring the title, is what keeps a title in-band on a different job
family from reading as a fit.

## Step 3 — Title-band check

Compare the posting's title to the bands in `preferences.md` → `## Target Roles`.

- **In-band** — matches a listed title or band directly.
- **One band off** — adjacent to a listed band (e.g. Senior Manager when the target
  bands are Director and Head-of). One Step 7 factor.

A title more than one band off, on a role that otherwise looked plausible enough to
reach scoring, is unusual; when it happens, treat it the same as one band off and
name the gap explicitly in the write-up rather than inventing a new tier.

To separate **in-band** from **one band off**: a title is in-band when it matches a
listed title, or sits between two listed titles in seniority. It is one band off
when it sits immediately above the highest listed band or immediately below the
lowest. Seniority modifiers the target list does not itself name — Senior,
Executive, Global, Group — do not on their own move a title out of band. When the
modifier represents a level the candidate has never held, name that in the write-up
as a stretch; do not convert it into a Step 7 factor.

A title on a career ladder the target list does not cover is scored one band off by
default, and the write-up names the job-family gap rather than burying it in the
tier. "Band" means whatever ladder the user's own `## Target Roles` describes —
corporate, clinical, academic, public-sector, or trade — not any particular
industry's titles.

## Step 4 — Comp check

- **A posted range whose top is at or above the floor is in range**, even when its
  bottom falls below. Score the range by its ceiling, note the shortfall in the
  write-up if the bottom is materially under the floor, and do not treat it as a
  factor. Step 1 excludes only when the **ceiling** — or a single stated figure — is
  below the floor.
- **When a posting states two conflicting comp figures** (a header band and a
  different figure in the body, say), score on the more favourable one, record both
  in the write-up, and flag the contradiction as an item to clarify with the
  recruiter.
- **In range**, at or above the floor — no factor.
- **Unlisted** — record it as an open comp item and route it to the appraiser to
  confirm against the floor before deep investment. Treated as neutral for scoring:
  it satisfies the "in-band-or-unlisted" condition for High. **No factor, whether or
  not a prior comp signal exists for this employer.**

Unlisted comp is a verification task, not a scoring penalty. A senior role at an
employer whose peers post in-band is a reasonable bet to clear the floor; the check
belongs at deep-dive, not at scan time.

**Comp unlisted is always recorded as a gap in the write-up.** It is never scored as
favorable by omission, even when it doesn't cost a tier.

## Step 5 — Location check

Already excluded in Step 1 if the location model doesn't work at all. For what's
left:

Score against the location preferences `preferences.md` actually states, not against
a remote-first default. If the user has stated more than one acceptable location
model (e.g. "remote **or** a named metro area"), a posting matching **any one** of
them **works cleanly** — an in-area hybrid or in-office schedule is a clean match,
not an awkward one.

- **Works cleanly** — no factor.
- **Resolvable but awkward** — satisfies the user's stated constraint only through
  interpretation or a documented exception (a `## Company-Specific Exceptions` entry,
  a `## Scoring Overrides` rule addressing exactly this case). One Step 7 factor.
- **Outside the stated preference, but not explicitly excluded** — the posting's
  location matches none of the user's stated positive location preferences, and
  `preferences.md` contains no rule ruling it out. One Step 7 factor, and the
  write-up names the location gap plainly. Do **not** exclude at Step 1 on this
  basis.

## Step 6 — Required-qualification check

This check fires only on a **screen-out** requirement: one a recruiter or ATS
rejects on mechanically, where no cover-letter argument changes the answer. The
closed list:

- a stated minimum **years in a specific job title** the candidate has never held;
- a **named credential, licence, or certification** stated as required (not
  preferred);
- **citizenship, work authorisation, or security clearance** the profile cannot
  establish;
- a **degree in a named field** stated as required, where the profile's degree is in
  a different field.

A requirement carrying its own escape clause — "or equivalent experience", "or
related field", "or related discipline" — is **not** a screen-out, because the
escape clause is what the ATS filters on. A degree requirement is a screen-out only
where the named field is stated with no equivalence or related-field escape **and**
the profile's degree is in a discipline a recruiter would not read as the same one.
A closely neighbouring field — Information Technology against a Computer Science,
Software Engineering, or Engineering requirement, or (outside technology) a Public
Health degree against a Health Administration requirement — is a **depth gap**, not
a screen-out.

Item 1 fires on a **title** only — "3+ years as a product manager", "N years as a
CISO". A minimum expressed as years *performing a function* — "N years in a
people-management role leading technical security teams", "N years in a federal or
regulated environment", "N years in an accredited teaching hospital" — is a **depth
gap**, answered from the profile's substance rather than its titles.

If one of these hits: **this posting is Low**, regardless of everything else. Skip
Step 7 and go straight to the tier assignment. Name the specific missing
qualification in the write-up.

Everything else in a `**Required**` list — a tool, a platform, an organisational
scale, a domain, a methodology the profile can't fully document — is a **depth gap**,
not a screen-out. Depth gaps are named honestly in the write-up and, where the
posting is otherwise strong, handled as an aside in the materials. **They do not
force Low and they are not Step 7 factors.** A missing *preferred* qualification is
neither.

Two judgement notes. First, if the profile documents the substance of a requirement
at a different level than the posting words it (owning a function versus hands-on
operation of its tooling, for example), that is a depth gap, not an undocumentable
requirement. Second, when a depth gap is severe enough that the write-up would have
to concede the role is out of reach, say so in the write-up — do not encode it by
silently forcing a tier.

## Step 7 — Tally the factors

Count how many of these four are present (drawn from Steps 2, 3, and 5 — Step 4
never contributes a factor, since unlisted comp is always scored as neutral):

1. Title one band off (Step 3)
2. Function adjacent, or function mismatch (Step 2)
3. Location resolvable but awkward (Step 5)
4. Location outside the stated preference but not explicitly excluded (Step 5)

Factors 3 and 4 are alternative outcomes of a single Step 5 determination for a given
posting's location — at most one location factor may be counted.

## Step 8 — Assign the tier

- Step 6 hit → **Low**.
- Zero factors (function match, title in-band, comp in-band-or-unlisted, location
  clean) → **High**.
- Exactly one factor → **Medium**.
- Two or more factors → **Low**.

This is deliberately mechanical. If two readers disagree on the tier, the
disagreement is in Steps 0-6 (what the posting actually says), not in Step 8 (how the
counts map to a tier).

---

## Output discipline

- **Hard exclusions** (Step 1) are never saved and never get an individual report
  line — they're counted in the run's exclusion tally (e.g. "3 excluded: 2
  dealbreaker employers, 1 below comp floor") so the count is visible without
  cluttering the results table with postings nobody can act on.
- **High** gets a saved `posting.md`, per the canonical schema in
  [`${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md`](${CLAUDE_PLUGIN_ROOT}/reference/data-formats.md),
  with `**Rating**: High` and every Step 7 factor that applied — there won't be
  any, by definition — plus any Step 4 comp-unlisted gap recorded regardless.
- **Medium** gets a reported line with the direct employer URL — never an
  aggregator link — and no file. State which single factor caused the Medium rating.
- **Low** gets a reported line only when the near-miss is informative — for example,
  a role blocked purely on location, where the rest of the posting was strong. A Low
  driven by an obvious mismatch (wrong function entirely, wrong seniority by a wide
  margin) doesn't need a line; it isn't a signal anyone will act on.

  **Exception:** when the user has directed that a specific posting be pursued
  regardless of tier, or a `## Company-Specific Exceptions` entry puts the employer
  in scope on different terms, a Low still gets a saved `posting.md`. The rating
  stays Low and stays honest — the file exists to aim the materials, not to gate the
  decision — and the write-up says so explicitly.

## Worked examples

These examples run against an illustrative preferences file — target bands Director
and Head-of, comp floor $170,000 (illustrative; read against whatever currency the
user's own `preferences.md` states), location remote or one named metro area — and
an illustrative candidate. Two variants of that candidate appear below, so that
"function match" and "function mismatch" are always derivable from a stated history
rather than asserted: a technology-operations variant who has previously owned IT
infrastructure, identity, endpoint management, and security operations end to end
(used in the technology examples), and a healthcare-operations variant who has
previously owned nursing-unit operations end to end (used in the Nurse Manager
example). They are self-contained: where an example names a band, a floor, a
location, or a candidate background, it means this illustrative file's, not any real
user's. Score real postings against the actual `preferences.md` and `profile.md`.

**High.** A Director of IT Infrastructure posting, scored against the
technology-operations variant: function match (owns infrastructure, identity,
endpoint management — not a product-engineering mandate wearing an IT title), title
in-band (Director is a listed band), comp $185k-$240k against a $170,000 floor, fully
remote. Zero factors. **High**, comp-unlisted gap not applicable since comp is
listed.

**Medium (one factor).** A Nurse Manager, Medical-Surgical Unit posting, scored
against the healthcare-operations variant: function match (the role's core
accountability — running unit-level nursing operations — is one that variant has
held before), location clean, comp unlisted (routed to the appraiser to confirm
against the floor — neutral, no factor, since unlisted comp is never a scoring
factor). The title, Nurse Manager, sits immediately below Director, the illustrative
target bands' lowest listed band — one band off. **Medium** — reported with the
direct URL, the comp-unlisted item noted for appraiser follow-up, and the title-band
gap named as the factor driving the rating.

**Medium (one factor, function mismatch).** A Director of Sales posting, an in-band
title (Director is a listed band), zero other factors present: function mismatch
(quota-carrying sales, not the target function) — the mismatch itself is the one
counted Step 7 factor, and Step 2's mismatch rule means it can never reach High
regardless. Zero factors from Steps 3-5, one factor from Step 2. **Medium**, with the
mismatch named explicitly in the write-up — never reported as if it were a clean
High.

**Low (two factors).** A VP, Security Operations posting, scored against the
technology-operations variant, on-site five days a week in a metro area that isn't
the illustrative preferences' named metro area and isn't remote, but that the
illustrative preferences also don't explicitly rule out (Step 5:
outside the stated preference, but not explicitly excluded — one factor); the title,
VP, sits immediately above Head-of, the illustrative target bands' highest listed
band — one band off (Step 3: one factor). Comp is unlisted, routed to the appraiser
to confirm against the floor — neutral, no factor. Two factors. **Low**, reported
only because the near-miss (strong function match, blocked by location and title
band) is informative — the write-up should say so.

**Low (required-qualification gap).** An otherwise-clean High-looking posting that
states a required professional licence — for example, an active state teaching
certification, stated as required and not merely preferred — that the candidate's
`profile.md` doesn't document: this is a screen-out under Step 6's closed list, and
Step 6 hits regardless of the Step 7 tally. **Low**, and the write-up names the
specific missing qualification rather than a vague "gaps exist."
