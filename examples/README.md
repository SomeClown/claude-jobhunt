# Examples

`input/northwind-systems-dir-it-2026-01-15/posting.md` and
`output/northwind-systems-dir-it-2026-01-15/{resume.md,cover-letter.md,applied.md}`
together are a single worked example of one application, end to end, in the
exact shapes specified in
[`../reference/data-formats.md`](../reference/data-formats.md). Read it to see
what "good" looks like — a High-fit posting with an honestly named depth gap,
a resume reordered and tailored to that posting, a cover letter that handles
the gap as a natural aside instead of a confession, and a completed
application record with the user (never an agent) shown clicking Submit.

**Everything here is fictional.** The candidate (Alex Rivera), the company
(Northwind Systems), the posting, and every employer named in the resume's
history are invented for this documentation and do not describe any real
person, company, or job listing.

This folder also doubles as a fixture for `scripts/render.js`. Because
`resume.md` and `cover-letter.md` are parsed strictly, a change to the
renderer or to the canonical schema can be checked against this folder as a
known-good input:

```
node scripts/render.js --job northwind-systems-dir-it-2026-01-15 --type both --jobs-dir /path/to/a/copy/of/examples
```

(`render.js` expects a `JOBS_DIR` containing an `output/` subdirectory, so
point `--jobs-dir` at a directory that contains this `examples/output/`
layout — or a copy of it — rather than at `examples/` itself.)
