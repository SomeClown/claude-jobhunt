'use strict';

/**
 * Regression tests pinning the five failure modes verified by hand during
 * the release rehearsal: each must exit non-zero, print a message naming
 * the offending file and (where applicable) line number, and must not
 * leave a partial output file behind.
 *
 * Fixtures are always a copy of the shipped example
 * (examples/jobs/northwind-systems-dir-it-2026-01-15/), mutated in a fresh
 * mkdtempSync() temp dir. Nothing is ever written into the repo.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS_DIR = path.resolve(__dirname, '..');
const RENDER_JS = path.join(SCRIPTS_DIR, 'render.js');
const FIXTURE_SLUG = 'northwind-systems-dir-it-2026-01-15';
const FIXTURE_JOB_DIR = path.resolve(SCRIPTS_DIR, '..', 'examples', 'jobs', FIXTURE_SLUG);

function splitLines(content) {
  const lines = content.split(/\r\n|\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function joinLines(lines) {
  return `${lines.join('\n')}\n`;
}

/** Copy the shipped example job folder into a fresh temp DATA_DIR, applying
 * a mutator to one of its two source files before writing it out. Returns
 * the temp DATA_DIR root. */
function makeMutatedFixtureDataDir({ resumeMutator, letterMutator } = {}) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobhunt-render-fail-test-'));
  const destJobDir = path.join(dataDir, 'jobs', FIXTURE_SLUG);
  fs.mkdirSync(destJobDir, { recursive: true });

  for (const file of fs.readdirSync(FIXTURE_JOB_DIR)) {
    fs.copyFileSync(path.join(FIXTURE_JOB_DIR, file), path.join(destJobDir, file));
  }

  if (resumeMutator) {
    const resumePath = path.join(destJobDir, 'resume.md');
    const lines = splitLines(fs.readFileSync(resumePath, 'utf8'));
    fs.writeFileSync(resumePath, joinLines(resumeMutator(lines)));
  }
  if (letterMutator) {
    const letterPath = path.join(destJobDir, 'cover-letter.md');
    const lines = splitLines(fs.readFileSync(letterPath, 'utf8'));
    fs.writeFileSync(letterPath, joinLines(letterMutator(lines)));
  }

  return dataDir;
}

function runRender(args) {
  return spawnSync('node', [RENDER_JS, ...args], { encoding: 'utf8' });
}

function assertNoOutputsDir(dataDir) {
  assert.ok(
    !fs.existsSync(path.join(dataDir, 'outputs')),
    'no outputs/ directory should be created on a failed render (no partial output)'
  );
}

test('rejects an em dash in a cover letter, naming the offending line', (t) => {
  let emDashLineNum;
  const dataDir = makeMutatedFixtureDataDir({
    letterMutator(lines) {
      const idx = lines.findIndex((line) => line.includes('mid-scroll'));
      assert.notEqual(idx, -1, 'fixture no longer contains the expected "mid-scroll" text');
      emDashLineNum = idx + 1;
      const mutated = [...lines];
      mutated[idx] = mutated[idx].replace('mid-scroll', 'mid—scroll'); // em dash
      return mutated;
    },
  });
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const result = runRender(['--job', FIXTURE_SLUG, '--type', 'cover-letter', '--data-dir', dataDir]);

  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\nstdout: ${result.stdout}`);
  assert.match(result.stderr, new RegExp(`cover-letter\\.md:${emDashLineNum}:`));
  assert.match(result.stderr, /em dash or en dash found on line\(s\)/);
  assert.match(result.stderr, /ASCII hyphens only/);
  assertNoOutputsDir(dataDir);
});

test('rejects an en dash in a cover letter, naming the offending line', (t) => {
  let enDashLineNum;
  const dataDir = makeMutatedFixtureDataDir({
    letterMutator(lines) {
      const idx = lines.findIndex((line) => line.includes('mid-scroll'));
      assert.notEqual(idx, -1, 'fixture no longer contains the expected "mid-scroll" text');
      enDashLineNum = idx + 1;
      const mutated = [...lines];
      mutated[idx] = mutated[idx].replace('mid-scroll', 'mid–scroll'); // en dash
      return mutated;
    },
  });
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const result = runRender(['--job', FIXTURE_SLUG, '--type', 'cover-letter', '--data-dir', dataDir]);

  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\nstdout: ${result.stdout}`);
  assert.match(result.stderr, new RegExp(`cover-letter\\.md:${enDashLineNum}:`));
  assert.match(result.stderr, /em dash or en dash found on line\(s\)/);
  assertNoOutputsDir(dataDir);
});

test('rejects a markdown heading in a resume, naming the offending line', (t) => {
  let headingLineNum;
  const dataDir = makeMutatedFixtureDataDir({
    resumeMutator(lines) {
      const idx = lines.findIndex((line) => line.trim() === 'Key Skills:');
      assert.notEqual(idx, -1, 'fixture no longer contains the expected "Key Skills:" label');
      headingLineNum = idx + 1;
      const mutated = [...lines];
      mutated[idx] = `# ${mutated[idx]}`;
      return mutated;
    },
  });
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const result = runRender(['--job', FIXTURE_SLUG, '--type', 'resume', '--data-dir', dataDir]);

  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\nstdout: ${result.stdout}`);
  assert.match(result.stderr, new RegExp(`resume\\.md:${headingLineNum}:`));
  assert.match(result.stderr, /markdown headings \("#"\) are not allowed in resume\.md/);
  assertNoOutputsDir(dataDir);
});

test('rejects a hard-wrapped Key Skills block, naming the offending line', (t) => {
  let continuationLineNum;
  const dataDir = makeMutatedFixtureDataDir({
    resumeMutator(lines) {
      const labelIdx = lines.findIndex((line) => line.trim() === 'Key Skills:');
      assert.notEqual(labelIdx, -1, 'fixture no longer contains the expected "Key Skills:" label');
      const skillsIdx = labelIdx + 1;
      const skillsLine = lines[skillsIdx];
      const breakAt = skillsLine.indexOf(' - ');
      assert.notEqual(breakAt, -1, 'expected the skills line to contain " - " separators to hard-wrap on');

      // Hard-wrap: split one skills line into two, with no blank line
      // between them (the well-formed shape requires the block to be
      // exactly one line followed by a blank line).
      const firstHalf = skillsLine.slice(0, breakAt);
      const secondHalf = skillsLine.slice(breakAt + 1); // drop the leading space
      continuationLineNum = skillsIdx + 2; // 1-based line of the continuation

      const mutated = [...lines];
      mutated.splice(skillsIdx, 1, firstHalf, secondHalf);
      return mutated;
    },
  });
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const result = runRender(['--job', FIXTURE_SLUG, '--type', 'resume', '--data-dir', dataDir]);

  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\nstdout: ${result.stdout}`);
  assert.match(result.stderr, new RegExp(`resume\\.md:${continuationLineNum}:`));
  assert.match(result.stderr, /hard-wrapped skills block is a parse error/);
  assertNoOutputsDir(dataDir);
});

test('fails with a clear message and no output when the job folder does not exist', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobhunt-render-fail-test-'));
  fs.mkdirSync(path.join(dataDir, 'jobs'), { recursive: true });
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

  const result = runRender(['--job', 'no-such-job-slug', '--type', 'resume', '--data-dir', dataDir]);

  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\nstdout: ${result.stdout}`);
  assert.match(result.stderr, /no-such-job-slug[/\\]resume\.md does not exist/);
  assert.match(result.stderr, /Usage: node render\.js/);
  assertNoOutputsDir(dataDir);
});

test('rejects --out combined with --type both as ambiguous, with no output written', (t) => {
  const dataDir = makeMutatedFixtureDataDir();
  const outPath = path.join(os.tmpdir(), `jobhunt-render-fail-test-out-${process.pid}.docx`);
  t.after(() => {
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(outPath, { force: true });
  });

  const result = runRender([
    '--job', FIXTURE_SLUG,
    '--type', 'both',
    '--out', outPath,
    '--data-dir', dataDir,
  ]);

  assert.equal(result.status, 1, `expected exit 1, got ${result.status}\nstdout: ${result.stdout}`);
  assert.match(result.stderr, /--out cannot be combined with --type both/);
  assert.match(result.stderr, /Usage: node render\.js/);
  assert.ok(!fs.existsSync(outPath), 'the --out path should not have been written');
  assertNoOutputsDir(dataDir);
});
