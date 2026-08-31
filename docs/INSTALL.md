# Install

## Installing the plugin

**From a marketplace.** If `claude-jobhunt` is registered in a marketplace you have configured, install it the normal way:

```
/plugin install jobhunt
```

**From a direct git clone.** Clone the repository and launch Claude Code with the plugin loaded from the local path:

```
git clone https://github.com/SomeClown/claude-jobhunt
claude --plugin-dir ./claude-jobhunt
```

(`/plugin install` takes a marketplace plugin name, not a filesystem path — for a local clone, `--plugin-dir` is the supported route. To make the clone permanent rather than per-launch, add it through your plugin configuration, or register it in a marketplace you control.)

After launching, verify the install took. Claude Code namespaces plugin components, so expect the six agents to appear in your agent list as `jobhunt:cartographer`, `jobhunt:lookout`, `jobhunt:appraiser`, `jobhunt:scrivener`, `jobhunt:envoy`, and `jobhunt:chronicler`; the eight skills under the `jobhunt:` namespace; and the routing command as `/jobhunt:route`. (The namespace prefix also means the agents cannot collide with same-named agents you already have.)

Either route installs the same thing: six agents under `agents/`, eight skills under `skills/`, and the `/jobhunt:route` command. Nothing about *your* job search is installed by this step — that starts with `jobhunt:setup` (see the [README](../README.md) quickstart).

## Prerequisites

| Requirement | Needed for | What happens without it |
|---|---|---|
| **Claude Code with plugin support** | everything | the plugin won't load |
| **Node.js 18+** | rendering `.docx` files | `jobhunt:render-docx` fails; markdown resumes/letters still get written, just not rendered |
| **`npm install` run once in `scripts/`** | rendering `.docx` files | same as above — the renderer's only runtime dependency is the `docx` package |
| **The `claude-in-chrome` browser MCP** | scanning boards, evaluating postings, filling forms | see below |

### What degrades without the browser MCP

`lookout`, `appraiser`, `scrivener`, and `envoy` all carry browser-control tools (`mcp__claude-in-chrome__*`) in their frontmatter, because visiting a careers board, reading a live posting, and filling a form are the point of those agents. Without `claude-in-chrome` connected:

- **`cartographer` still works fully** — it resolves companies to careers URLs via `WebSearch` only and never opens a browser by design.
- **`chronicler` still works fully** — it only reads and writes files in your data directory.
- **`lookout`, `appraiser`, `scrivener`, and `envoy` are limited or non-functional.** `lookout` can't visit a board to extract roles. `appraiser` can't fetch a live posting to fact-check a scan-level capture. `scrivener` can still write and revise materials from what's already in `posting.md` and `profile.md`, but can't pull a fresher read of the live posting. `envoy` can't detect an ATS or touch a form at all.

Install and connect `claude-in-chrome` (or an equivalent browser-control MCP the agents can use — the tool names in the frontmatter are specific to it) before relying on the plugin for anything past resolving careers URLs.

### `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` is not required

The pipeline runs through ordinary subagent invocation — the orchestrating session (or your own routing, per `docs/ORCHESTRATION.md`) calls each agent in turn. Nothing in this plugin depends on the experimental agent-teams feature flag.

## A note on agent-name collisions

The six agent names (`cartographer`, `lookout`, `appraiser`, `scrivener`, `envoy`, `chronicler`) were chosen to be distinctive rather than generic, specifically so they're unlikely to collide with agents you already have configured elsewhere. A collision is still possible in principle — Claude Code resolves agent names within a scope, and two agents sharing a name in the same scope means one shadows the other silently, with no error.

If you want to confirm there's no shadowing in your environment, check for other agent definitions using these six names — globally or in another project — and confirm the `jobhunt` agents are the ones actually being invoked (their frontmatter `description` blocks are specific enough to check against).
