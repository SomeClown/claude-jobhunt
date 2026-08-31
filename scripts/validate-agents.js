#!/usr/bin/env node
'use strict';

/**
 * validate-agents.js — structural and regression guard for the six agents
 * shipped in agents/, plus cross-checks against skills/ and the plugin
 * manifest. Node stdlib only, no dependencies.
 *
 * Checks performed (exit non-zero on any failure):
 *
 *  1. Every agents/*.md file has well-formed frontmatter with name,
 *     description, tools, model, version.
 *  2. Frontmatter `name` matches the filename.
 *  3. The tools list matches the checked-in snapshot in
 *     scripts/expected-agent-tools.json — this is the regression guard for
 *     a deliberate permission design: cartographer, lookout,
 *     appraiser, and scrivener do NOT have the `Agent` tool, on
 *     purpose, so a scan/evaluation/authoring agent can never spawn a
 *     subagent that spawns another subagent (the fan-out stall class
 *     recorded in the project's operational history). Only `envoy` has
 *     `Agent`, to delegate the fill-page contract. A tool-list drift here
 *     is exactly the class of silent regression this script exists to
 *     catch, so both the snapshot diff AND an explicit standalone
 *     assertion enforce it.
 *  4. `model` is one of the expected values, and the two judgment-heavy
 *     agents (appraiser, scrivener) are pinned to opus while the
 *     rest are sonnet.
 *  5. Every `jobhunt:<skill>` reference anywhere in agents/ and skills/
 *     resolves to a real skills/<name>/SKILL.md.
 *  6. Every `${CLAUDE_PLUGIN_ROOT}/<path>` reference in any .md file in the
 *     repo resolves to a file or directory that actually exists.
 *  7. .claude-plugin/plugin.json parses and has name, version, license.
 *
 * Usage: node scripts/validate-agents.js
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');
const PLUGIN_JSON_PATH = path.join(REPO_ROOT, '.claude-plugin', 'plugin.json');
const SNAPSHOT_PATH = path.join(__dirname, 'expected-agent-tools.json');

const REQUIRED_FRONTMATTER_FIELDS = ['name', 'description', 'tools', 'model', 'version'];
const EXPECTED_MODELS = new Set(['opus', 'sonnet', 'haiku']);
const OPUS_AGENTS = new Set(['appraiser', 'scrivener']);
const AGENT_TOOL = 'Agent';
const AGENT_TOOL_ALLOWED_FOR = new Set(['envoy']);

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function walkFiles(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, predicate, out);
    } else if (predicate(full)) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Frontmatter parsing — deliberately minimal (no js-yaml dependency). Every
// agent file in this repo uses simple single-line `key: value` frontmatter,
// so this parser only supports that shape and fails loudly on anything else
// rather than silently mis-parsing a multi-line value.
// ---------------------------------------------------------------------------
function parseFrontmatter(filePath, content) {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    fail(`${relPath(filePath)}: frontmatter must open with a bare "---" on line 1`);
    return null;
  }
  const closeIdx = lines.indexOf('---', 1);
  if (closeIdx === -1) {
    fail(`${relPath(filePath)}: frontmatter never closes with a second "---"`);
    return null;
  }

  const fm = {};
  for (let i = 1; i < closeIdx; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s?(.*)$/);
    if (!m) {
      fail(`${relPath(filePath)}: line ${i + 1} in frontmatter isn't a simple "key: value" pair: ${JSON.stringify(line)}`);
      continue;
    }
    fm[m[1]] = m[2].trim();
  }
  return fm;
}

function relPath(p) {
  return path.relative(REPO_ROOT, p);
}

// ---------------------------------------------------------------------------
// 1-4: parse each agent, validate frontmatter shape, tools snapshot, model
// ---------------------------------------------------------------------------
function loadSnapshot() {
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    fail(`missing checked-in snapshot: ${relPath(SNAPSHOT_PATH)}`);
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(SNAPSHOT_PATH, 'utf8'));
    delete parsed._comment;
    return parsed;
  } catch (e) {
    fail(`${relPath(SNAPSHOT_PATH)}: does not parse as JSON (${e.message})`);
    return {};
  }
}

function validateAgents() {
  if (!fs.existsSync(AGENTS_DIR)) {
    fail(`agents/ directory not found at ${relPath(AGENTS_DIR)}`);
    return [];
  }

  const snapshot = loadSnapshot();
  const agentFiles = fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.md'))
    .sort();

  const parsedAgents = [];

  for (const file of agentFiles) {
    const filePath = path.join(AGENTS_DIR, file);
    const expectedName = file.replace(/\.md$/, '');
    const content = fs.readFileSync(filePath, 'utf8');
    const fm = parseFrontmatter(filePath, content);
    if (!fm) continue;

    for (const field of REQUIRED_FRONTMATTER_FIELDS) {
      if (!fm[field]) {
        fail(`${relPath(filePath)}: frontmatter missing required field "${field}"`);
      }
    }
    if (!fm.name || !fm.description || !fm.tools || !fm.model || !fm.version) {
      continue; // can't safely proceed with this agent's other checks
    }

    if (fm.name !== expectedName) {
      fail(`${relPath(filePath)}: frontmatter name "${fm.name}" does not match filename "${expectedName}"`);
    }

    const tools = fm.tools.split(',').map((t) => t.trim()).filter(Boolean);

    if (!EXPECTED_MODELS.has(fm.model)) {
      fail(`${relPath(filePath)}: model "${fm.model}" is not one of the expected values (${[...EXPECTED_MODELS].join(', ')})`);
    } else {
      const expectedModel = OPUS_AGENTS.has(expectedName) ? 'opus' : 'sonnet';
      if (fm.model !== expectedModel) {
        fail(`${relPath(filePath)}: model is "${fm.model}", expected "${expectedModel}" (appraiser and scrivener are pinned to opus; every other agent is pinned to sonnet)`);
      }
    }

    if (!/^\d+\.\d+\.\d+$/.test(fm.version)) {
      fail(`${relPath(filePath)}: version "${fm.version}" is not a plain X.Y.Z semver string`);
    }

    // --- Regression guard: only envoy may have the Agent tool. ---
    // Cartographer, lookout, appraiser, and scrivener lack it on purpose:
    // without it they cannot spawn a subagent, which is the structural fix
    // for a previously-observed fan-out failure mode (a scan/evaluation
    // agent recursively delegating until a batch never finishes). If this
    // assertion starts failing, that is a deliberate architecture decision
    // to make explicitly, not a snapshot to rubber-stamp.
    const hasAgentTool = tools.includes(AGENT_TOOL);
    const shouldHaveAgentTool = AGENT_TOOL_ALLOWED_FOR.has(expectedName);
    if (hasAgentTool && !shouldHaveAgentTool) {
      fail(`${relPath(filePath)}: has the "${AGENT_TOOL}" tool but is not in the allowed set (${[...AGENT_TOOL_ALLOWED_FOR].join(', ')}) — this re-enables subagent fan-out for an agent that must run single-context. See the comment above AGENT_TOOL_ALLOWED_FOR in this script.`);
    }
    if (!hasAgentTool && shouldHaveAgentTool) {
      fail(`${relPath(filePath)}: expected to have the "${AGENT_TOOL}" tool (it's in AGENT_TOOL_ALLOWED_FOR) but does not — envoy needs it to delegate the fill-page contract.`);
    }

    // --- Tool-list snapshot diff ---
    const expected = snapshot[expectedName];
    if (!expected) {
      warnings.push(`${relPath(filePath)}: no snapshot entry for "${expectedName}" in ${relPath(SNAPSHOT_PATH)} — add one so future tool-list changes are caught`);
    } else {
      const expectedTools = expected.tools || [];
      const added = tools.filter((t) => !expectedTools.includes(t));
      const removed = expectedTools.filter((t) => !tools.includes(t));
      if (added.length || removed.length) {
        const parts = [];
        if (added.length) parts.push(`added: ${added.join(', ')}`);
        if (removed.length) parts.push(`removed: ${removed.join(', ')}`);
        fail(`${relPath(filePath)}: tools list differs from scripts/expected-agent-tools.json (${parts.join('; ')}). If this is intentional, update the agent AND the snapshot in the same change, with the reason stated.`);
      }
      if (expected.model && expected.model !== fm.model) {
        fail(`${relPath(filePath)}: model "${fm.model}" differs from snapshot's "${expected.model}"`);
      }
    }

    parsedAgents.push({ name: expectedName, filePath, tools, model: fm.model, content });
  }

  const expectedAgentNames = agentFiles.map((f) => f.replace(/\.md$/, ''));
  for (const key of Object.keys(snapshot)) {
    if (!expectedAgentNames.includes(key)) {
      warnings.push(`${relPath(SNAPSHOT_PATH)}: snapshot has an entry for "${key}" but no such agent file exists in agents/`);
    }
  }

  return parsedAgents;
}

// ---------------------------------------------------------------------------
// 5: every jobhunt:<skill> reference resolves to skills/<name>/SKILL.md
// ---------------------------------------------------------------------------
function validateSkillReferences() {
  const searchDirs = [AGENTS_DIR, SKILLS_DIR];
  const files = [];
  for (const dir of searchDirs) {
    walkFiles(dir, (f) => f.endsWith('.md'), files);
  }

  const skillRefRe = /jobhunt:([A-Za-z0-9_-]+)/g;
  const seen = new Set();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    let m;
    while ((m = skillRefRe.exec(content)) !== null) {
      const skillName = m[1];
      const key = `${filePath}:${skillName}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        fail(`${relPath(filePath)}: references "jobhunt:${skillName}" but ${relPath(skillPath)} does not exist`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6: every ${CLAUDE_PLUGIN_ROOT}/<path> reference in any .md resolves
// ---------------------------------------------------------------------------
function validatePluginRootReferences() {
  const files = walkFiles(REPO_ROOT, (f) => f.endsWith('.md'));
  const refRe = /\$\{CLAUDE_PLUGIN_ROOT\}\/([A-Za-z0-9_./-]+)/g;
  const seen = new Set();

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    let m;
    while ((m = refRe.exec(content)) !== null) {
      let refPath = m[1];
      const key = `${filePath}:${refPath}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const resolved = path.join(REPO_ROOT, refPath);
      if (!fs.existsSync(resolved)) {
        fail(`${relPath(filePath)}: references "\${CLAUDE_PLUGIN_ROOT}/${refPath}" but ${relPath(resolved)} does not exist`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7: plugin.json
// ---------------------------------------------------------------------------
function validatePluginJson() {
  if (!fs.existsSync(PLUGIN_JSON_PATH)) {
    fail(`missing ${relPath(PLUGIN_JSON_PATH)}`);
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(PLUGIN_JSON_PATH, 'utf8'));
  } catch (e) {
    fail(`${relPath(PLUGIN_JSON_PATH)}: does not parse as JSON (${e.message})`);
    return;
  }
  for (const field of ['name', 'version', 'license']) {
    if (!parsed[field]) {
      fail(`${relPath(PLUGIN_JSON_PATH)}: missing required field "${field}"`);
    }
  }
}

// ---------------------------------------------------------------------------
// Run everything
// ---------------------------------------------------------------------------
function main() {
  validateAgents();
  validateSkillReferences();
  validatePluginRootReferences();
  validatePluginJson();

  if (warnings.length) {
    console.log(`${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  - ${w}`);
    console.log('');
  }

  if (errors.length) {
    console.error(`FAIL: ${errors.length} error(s):\n`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }

  console.log('PASS: agents, skill references, ${CLAUDE_PLUGIN_ROOT} references, and plugin.json all check out.');
  process.exit(0);
}

main();
