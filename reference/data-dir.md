# DATA_DIR

`DATA_DIR` is the directory holding everything the jobhunt team knows: preferences, work history, application-form answers, the careers cache, scan history, the per-job folders, and the rendered documents. It is the user's data, it lives outside the plugin, and it is never written to by an installer. This file is the single source of truth for how every agent and skill locates it. Agent and skill files MUST point here rather than restating the resolution order — one canonical copy is the whole point, because a second copy that drifts sends two agents to two different directories in the same session.

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
├── contacts.csv              only if the user imported one
├── jobs/                     one folder per posting worth keeping; empty at setup
└── outputs/                  rendered .docx, one folder per job slug; empty at setup
```

Every file is specified in [`data-formats.md`](./data-formats.md). Setup copies the plugin's `templates/*` into place and fills them from its interview; it never writes `job-history.md` content, and it never invents a fact about the user's work history.

### `jobs/` and `outputs/`

Each posting the team keeps gets `jobs/[company-slug]-[role-slug]-[YYYY-MM-DD]/`, containing `posting.md` and, once materials exist, `resume.md`, `cover-letter.md`, and `applied.md`. The rendered `.docx` pair for that application goes in `outputs/[same-slug]/`.

Rendered output lives beside the data rather than in the plugin so that a `git pull` on the plugin never touches a user's documents, and so a user can back up or sync `DATA_DIR` as one unit.

### `scripts/` stays in the plugin

The renderer is code, not user data. `scripts/render.js` and its dependencies live in the plugin directory and are invoked with `--data-dir` pointing at the resolved `DATA_DIR`. This is a deliberate departure from a layout where each user carried their own copy of the build scripts: code in the plugin stays updatable by `git pull`, and content stays in markdown files the user can read.

---

## The multi-project implication

`DATA_DIR` resolution is per-invocation, based on the working directory, so:

- **One shared data directory is the default.** With `~/.jobhunt/` set up and no local override, every project on the machine resolves to the same data directory. A job search is one search; running it from whichever project happens to be open should not fragment its history. This is the recommended arrangement for a single user.
- **A local `./.jobhunt/` shadows the shared one, for that working directory only.** This is the escape hatch for a genuinely separate search — a second persona, a test run, a shared machine. It is also the accident to watch for: an empty `.jobhunt` directory created by mistake in a project folder will shadow `~/.jobhunt` and make the team look like it has amnesia. If an agent resolves to a `DATA_DIR` that exists but is missing the core files, it MUST say which path it resolved and ask, rather than treating the search as new.
- **`$JOBHUNT_DATA_DIR` overrides both**, and is the right tool for scripted or CI-style runs and for pointing at a scratch directory during testing.

State the resolved path in task output whenever a run creates or modifies files. It costs one line and it is how a user catches a wrong-directory run on the first scan instead of the fifth.

---

## Paths written into data files

Paths recorded *inside* data files are always relative to `DATA_DIR` — `jobs/northwind-systems-dir-it-2026-01-15/resume.md`, `outputs/northwind-systems-dir-it-2026-01-15/`. Never write an absolute path into a data file. Absolute paths break the moment the directory moves, they leak the user's home directory layout into files they may share, and they make a data directory non-portable between machines.
