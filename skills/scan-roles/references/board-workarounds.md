# Board workarounds

Patterns you may hit while scanning a careers board, and how to work around them.
These are described against **ATS vendor names**, never employer names — a workaround
that only makes sense pinned to one company is a note in that company's
`company-careers.json` entry, not a rule in this file. Nothing here is guaranteed to
apply to every board a given vendor hosts; treat each item as "worth trying," not
"always true."

**The general principle, ahead of every specific pattern below: prefer the board's
own data endpoint over simulating UI clicks.** A careers board is almost always a
thin client rendering JSON it fetched from somewhere. If you can find that fetch —
via the network panel, via reading the page's own script tags, or just by trying the
vendor's known endpoint shape — calling it directly is faster, cheaper on context, and
far more reliable than clicking a search box and hoping the page re-renders. Simulated
clicks are the fallback, not the first move.

---

## Workday

Workday-hosted tenants frequently ignore simulated clicks on their search box and
pagination controls — the click registers in the DOM but the listing underneath
doesn't refresh, and a naive "click next page" loop will silently re-read the same
page N times.

**What tends to work instead:** navigate to the tenant's own origin (not the
marketing site that links to it) and call its JSON job-listing endpoint directly with
a same-origin fetch. Workday tenants serve their listings from an API under the
tenant's own domain; a cross-origin fetch attempted from the marketing site's origin
is typically blocked, which is why this only works once you're already on the
tenant's own page. If you can't locate the endpoint by inspecting the page's own
requests, falling back to `read_page` against the rendered DOM is the next-best
option — still better than a full-text extraction of the listing page.

## Greenhouse

Some Greenhouse-hosted boards ignore in-page search and numbered pagination controls
the same way — but respond cleanly to **direct URL navigation with a `?page=N`
parameter**. If clicking "next page" isn't moving the listing, try navigating to the
page-N URL directly before assuming the board is broken.

**A caution, not a universal fix:** Content-Security-Policy headers on *some*
Greenhouse-hosted boards block a cross-origin fetch to the Greenhouse boards API from
a script running on the page. Don't assume the "call the API directly" workaround
that works on one Greenhouse board is portable to the next one — check whether the
fetch actually succeeds before relying on it, and fall back to `?page=N` navigation
plus DOM extraction if it doesn't.

## Rails / Turbo-Stream boards

Some boards built on Rails with Turbo Streams resist both filter-button clicks and
"Show more" button clicks — the button appears to respond but the next page of
results never actually appears in the DOM.

**What tends to work instead:** these boards typically load more results from a
`show_more?page=N`-shaped endpoint (or similarly named) that responds to a direct
fetch when the request carries an `Accept: text/vnd.turbo-stream.html` header. Fetch
that endpoint directly with the header set, rather than repeatedly clicking a button
that isn't doing anything.

## Ashby

Some Ashby-embedded boards fail to render at all for automated navigation — the page
loads but the listing never populates, with no error to react to.

**What to do:** don't treat a board that fails to render as confirmed-empty. Flag it
for retry on the next scan the same way an unreachable board gets flagged, and say
explicitly that the failure was a render problem, not a "zero open roles" result —
those are different facts, and collapsing them loses the difference the next run
needs.

---

## When none of this applies

A board that doesn't match any pattern above is not necessarily broken — it's just
not yet a documented case. Try the general principle first (look for the data
endpoint before fighting the UI), fall back to targeted DOM selectors or `read_page`
against the rendered page, and if the board is still genuinely unreadable, record it
as broken and flagged for retry per the rule in `jobhunt:scan-roles` — never as
confirmed-empty.
