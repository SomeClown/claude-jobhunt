# DATA_DIR

`DATA_DIR` is the directory holding the bookkeeping the jobhunt team keeps: preferences, work history, application-form answers, the careers cache, and the two scan-history logs. It is the user's data, it lives outside the plugin, and it is never written to by an installer. This file is the single source of truth for how every agent and skill locates it. Agent and skill files MUST point here rather than restating the resolution order — one canonical copy is the whole point, because a second copy that drifts sends two agents to two different directories in the same session.

The per-posting job folders and the rendered application documents live in a second, separately-resolved directory, `JOBS_DIR` — see below. `DATA_DIR` and `JOBS_DIR` are resolved independently of each other; a resolved `DATA_DIR` says nothing about where `JOBS_DIR` is, or whether it exists at all.

---

## Resolution order

Resolve `DATA_DIR` by taking the **first** of these that exists:

1. **`$JOBHUNT_DATA_DIR`** — if the environment variable is set and names an existing directory, that is `DATA_DIR`. Set but pointing at something that does not exist is an error, not a fall-through: report it and stop, because silently falling back would write the user's data somewhere they are not looking.
2. **`./.jobhunt/`** — a `.jobhunt` directory in the current working directory.
3. **`~/.jobhunt/`** — a `.jobhunt` directory in the user's home directory.

**If none of the three exists**, do not create anything, do not guess, and do not proceed with a partial run. Tell the user to run `jobhunt:setup` and stop. Setup is the only thing that creates a data directory, because creating one is a decision about where a user's personal data lives, and that decision is theirs.

An agent MUST resolve `DATA_DIR` once at the start of a task and use that resolved path for the whole task. Re-resolving mid-task after a directory change can silently switch data directories.

### Symlinks

A `.jobhunt` entry that is a symlink to a directory resolves normally — the symlink target becomes `DATA_DIR`. This is the supported way to keep one real data directory somewhere meaningful (a documents folder, a synced drive) while `~/.jobhunt` points at it.

---

## What `jobhunt:setup` creates

```
<DATA_DIR>/
├── team-memory.md            operational memory and the file-ownership contract
├── preferences.md            what the user is looking for and will not accept
├── profile.md                verified work history; the source of every claim in materials
├── application-data.md       reusable ATS form answers
├── job-history.md            per-application ledger
├── company-careers.json      the careers-URL and scan cache; starts as {}
├── network-scan-history.md   append-only log of contact-sourced scans
├── job-search-history.md     append-only log of keyword searches
└── contacts.csv              only if the user imported one
```

Every file is specified in [`data-formats.md`](./data-formats.md). Setup copies the plugin's `templates/*` into place and fills them from its interview; it never writes `job-history.md` content, and it never invents a fact about the user's work history.

### `scripts/` stays in the plugin

The renderer is code, not user data. `scripts/render.js` and its dependencies live in the plugin directory and are invoked with `--jobs-dir` pointing at the resolved `JOBS_DIR` — both the markdown sources it reads and the `.docx` pair it writes live there now, not in `DATA_DIR`. This is a deliberate departure from a layout where each user carried their own copy of the build scripts: code in the plugin stays updatable by `git pull`, and content stays in markdown files the user can read.

---

## JOBS_DIR

`JOBS_DIR` is the directory holding the substance of the search itself: one input folder per posting worth keeping, and one output folder per application holding the tailored markdown sources and their rendered `.docx` pair together. It is resolved the same way `DATA_DIR` is — independently, with its own environment variable and its own default locations — and this file is equally the single source of truth for how every agent and skill locates it.

### Resolution order

Resolve `JOBS_DIR` by taking the **first** of these that exists:

1. **`$JOBHUNT_JOBS_DIR`** — if the environment variable is set and names an existing directory, that is `JOBS_DIR`. Set but pointing at something that does not exist is an error, not a fall-through, for the same reason as `$JOBHUNT_DATA_DIR`: silently falling back would write the user's documents somewhere they are not looking.
2. **`./job-hunt/`** — a `job-hunt` directory in the current working directory.
3. **`~/job-hunt/`** — a `job-hunt` directory in the user's home directory. This may be a symlink to a real directory kept elsewhere — a documents folder, a synced drive — the same supported pattern as `~/.jobhunt` (see Symlinks, above): the symlink target becomes `JOBS_DIR`.

**If none of the three exists**, do not create anything, do not guess, and do not proceed with a partial run. Tell the user to run `jobhunt:setup` and stop — setup is the only thing that creates a jobs directory, for the same reason it's the only thing that creates a data directory: this is a decision about where a user's documents live, and that decision is theirs.

An agent MUST resolve `JOBS_DIR` once at the start of a task, the same way and at the same time it resolves `DATA_DIR`, and use that resolved path for the whole task. The two are resolved independently — one being set or found says nothing about the other, and a task that touches both resolves both rather than assuming a `DATA_DIR` hit means a `JOBS_DIR` hit.

### Why `JOBS_DIR` is visible and `DATA_DIR` is hidden

This split is deliberate, not an inconsistency. `DATA_DIR` holds bookkeeping the user rarely opens by hand — memory, preferences, history logs — and the leading dot keeps it out of the way in a directory listing. `JOBS_DIR` holds the actual job descriptions and the finished resume and cover-letter documents the user drags into an email attachment or uploads to a portal; it needs to be findable in Finder or Explorer without the user having to turn on hidden files first. A user who has to unhide a dotfile to find the resume they just asked for is exactly the usability failure this split exists to avoid.

### What `jobhunt:setup` creates in `JOBS_DIR`

```
<JOBS_DIR>/
├── input/     one folder per posting worth keeping; empty at setup
└── output/    one folder per job slug, tailored materials plus rendered .docx; empty at setup
```

### `input/` and `output/`

Each posting the team keeps gets `input/[company-slug]-[role-slug]-[YYYY-MM-DD]/`, containing `posting.md` and nothing else — it is the record of the opportunity, not of anything the team produced from it. Once materials exist, the matching `output/[same-slug]/` holds `resume.md`, `cover-letter.md`, and `applied.md`, and, once rendered, the `.docx` pair alongside them. Markdown source and rendered `.docx` are siblings in the same folder now, not split across two different trees — a user assembling an application finds everything worth attaching in one place instead of two.

Output lives beside the data rather than in the plugin so that a `git pull` on the plugin never touches a user's documents, and so a user can back up or sync `JOBS_DIR` as one unit — independently of `DATA_DIR`, if they choose to keep the two on different schedules or different drives.

---

## The multi-project implication

`DATA_DIR` and `JOBS_DIR` resolution are both per-invocation, based on the working directory, and both resolved independently, so:

- **One shared data directory and one shared jobs directory are the default.** With `~/.jobhunt/` and `~/job-hunt/` both set up and no local override, every project on the machine resolves to the same two directories. A job search is one search; running it from whichever project happens to be open should not fragment its history or scatter its documents. This is the recommended arrangement for a single user.
- **A local `./.jobhunt/` or `./job-hunt/` shadows the shared one, for that working directory only** — and the two shadow independently of each other. This is the escape hatch for a genuinely separate search — a second persona, a test run, a shared machine. It is also the accident to watch for: an empty directory created by mistake in a project folder will shadow the shared one and make the team look like it has amnesia, or like a search has no history behind it. If an agent resolves to a `DATA_DIR` or `JOBS_DIR` that exists but is missing the core files or folders, it MUST say which path it resolved and ask, rather than treating the search as new.
- **`$JOBHUNT_DATA_DIR` and `$JOBHUNT_JOBS_DIR` each override their own directory**, independently of the other, and are the right tool for scripted or CI-style runs and for pointing at a scratch directory during testing. Setting one says nothing about the other.

State both resolved paths in task output whenever a run creates or modifies files. It costs one line each and it is how a user catches a wrong-directory run on the first scan instead of the fifth.

---

## Paths written into data files

Paths recorded *inside* a `DATA_DIR` file are relative to `DATA_DIR`, for anything that actually lives there. A reference to a job folder is a different case: because job folders live in `JOBS_DIR`, not `DATA_DIR`, they are always written as `input/[slug]/posting.md` or `output/[slug]/` — no `DATA_DIR`-relative prefix, because the `input/`/`output/` prefix is itself the signal that the path is `JOBS_DIR`-relative, regardless of which file it's written into. `job-history.md`'s `**Files**` field is the common case of this: it lives in `DATA_DIR` but its paths point into `JOBS_DIR` this way — `input/northwind-systems-dir-it-2026-01-15/posting.md`, `output/northwind-systems-dir-it-2026-01-15/`. A path written inside a `JOBS_DIR` file is relative to `JOBS_DIR` on the same principle. Never write an absolute path into a data file, in either directory. Absolute paths break the moment a directory moves, they leak the user's home directory layout into files they may share, and they make a directory non-portable between machines.
