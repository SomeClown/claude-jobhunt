# fill-page.md — the fill subagent contract

This is jobhunt's own fill-subagent contract: the narrow, mechanical layer that actually touches form controls, invoked via `Agent` once `jobhunt:apply` has an approved field plan (stage 5 of that skill). It exists to keep the act of filling separate from the judgment calls — what ATS, what values, what's ambiguous, what needs the user — that all happen before it ever runs.

## What it receives

- **ATS type** — from `jobhunt:apply`'s detection stage.
- **Tab ID** — the browser tab already open on the form.
- **An approved field → value map** — one entry per field, naming the field clearly enough to find on the page (label text, a captured selector if one exists, or both) and the exact value to enter or select.
- **Upload file paths** — for any image uploads that are part of the approved plan. PDF/DOCX files are never included here; `jobhunt:apply` flags those as a manual user step before this subagent is ever invoked.

Nothing else. It does not receive `posting.md`, `profile.md`, or `application-data.md` — every judgment call that needed those was already made before it was invoked.

## What it does

Fills only the fields listed in the map, one at a time, in the order they appear on the page rather than the order they appear in the map — reading the actual form in front of it, not working blind from a list.

## What it never does

- **Never clicks Submit, Send, or Save-and-Continue** — or any control that advances or finalizes the form — under any circumstance, no matter how confident the page looks. This is deliberately stricter than "never clicks the final Submit": some ATS vendors, Workday especially, reuse a "Save and Continue" label for what is actually the final submission on the last page, and this subagent has no reliable way to know, from inside a single page, whether the control in front of it is safe to press. That judgment belongs to the caller, which tracks where the form sits in the overall flow; the fill subagent doesn't try to make it.
- **Never asks the user anything.** Every value it fills was already approved before it was invoked. If a value doesn't fit the field it was meant for, that's a `mismatch`, reported and left unfilled — not a prompt to the user and not a guess at a better-fitting value.
- **Never improvises past a structural surprise.** A field on the page that doesn't match anything in the map, a control of a different type than expected, an unexpected modal or consent banner — any of these stops the loop at that point. Report what was filled before the surprise, name the surprise plainly, and hand back to the caller rather than working around it.

## Per-field status

Report exactly one of these for every field in the map:

| Status | Meaning |
|---|---|
| `filled` | located on the page and set to the approved value |
| `not-found` | nothing on the current page matches the field description — expected and unremarkable on a step that hasn't loaded this field yet |
| `mismatch` | the field was found, but its type or options don't fit the approved value (e.g., a single-select with no option matching the approved text) |
| `needs-manual` | the field requires something outside this subagent's remit — a PDF/DOCX upload, a CAPTCHA, an e-signature drawing, or any control that isn't a straightforward fill |

## Multi-page forms

Each invocation covers exactly one page or step. The loop: the caller scans and gets a step's fields approved → invokes this subagent with that step's map → this subagent fills and reports → the caller reviews the report, decides whether anything needs a second pass or a fallback to manual handling, and — only the caller, never this subagent — clicks whatever advances to the next step, if the step isn't the final review. The same approved-answer context (`application-data.md`'s cached values, the conventions established in `jobhunt:apply`'s stage 3) carries forward across steps without re-asking the user; only genuinely new fields on a later step get a fresh proposal back through the caller.
