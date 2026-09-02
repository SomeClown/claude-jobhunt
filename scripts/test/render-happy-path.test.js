'use strict';

/**
 * Happy-path coverage for render.js, using the shipped example under
 * examples/output/ as the fixture (per examples/README.md, that example is
 * explicitly designed to double as the renderer's test fixture).
 *
 * Every test copies the fixture into a fresh mkdtempSync() directory so
 * nothing is ever written into the repo, and cleans up after itself.
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
const FIXTURE_JOB_DIR = path.resolve(SCRIPTS_DIR, '..', 'examples', 'output', FIXTURE_SLUG);

const UNZIP_AVAILABLE = spawnSync('unzip', ['-v']).status === 0;

/** Copy the shipped example's output folder into a fresh temp JOBS_DIR.
 * Returns the temp JOBS_DIR root; the job's sources and rendered .docx both
 * live at <jobsDir>/output/<FIXTURE_SLUG>. */
function makeFixtureJobsDir() {
  const jobsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jobhunt-render-test-'));
  const destJobDir = path.join(jobsDir, 'output', FIXTURE_SLUG);
  fs.mkdirSync(destJobDir, { recursive: true });
  for (const file of fs.readdirSync(FIXTURE_JOB_DIR)) {
    fs.copyFileSync(path.join(FIXTURE_JOB_DIR, file), path.join(destJobDir, file));
  }
  return jobsDir;
}

function runRender(args) {
  return spawnSync('node', [RENDER_JS, ...args], { encoding: 'utf8' });
}

/** Read word/document.xml out of a .docx (a zip file) without adding a
 * dependency: shell out to `unzip -p`. Callers must guard with
 * UNZIP_AVAILABLE. */
function readDocumentXml(docxPath) {
  const result = spawnSync('unzip', ['-p', docxPath, 'word/document.xml'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `unzip failed on ${docxPath}: ${result.stderr}`);
  return result.stdout;
}

test('renders both resume and cover letter for the shipped example via --jobs-dir', async (t) => {
  const jobsDir = makeFixtureJobsDir();
  t.after(() => fs.rmSync(jobsDir, { recursive: true, force: true }));

  const result = runRender(['--job', FIXTURE_SLUG, '--type', 'both', '--jobs-dir', jobsDir]);

  assert.equal(result.status, 0, `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);

  const outDir = path.join(jobsDir, 'output', FIXTURE_SLUG);
  const resumePath = path.join(outDir, 'Alex_Rivera_Resume.docx');
  const letterPath = path.join(outDir, 'Alex_Rivera_Cover_Letter.docx');

  assert.ok(fs.existsSync(resumePath), `expected ${resumePath} to exist`);
  assert.ok(fs.existsSync(letterPath), `expected ${letterPath} to exist`);
  assert.ok(fs.statSync(resumePath).size > 0, 'resume .docx should be nonempty');
  assert.ok(fs.statSync(letterPath).size > 0, 'cover letter .docx should be nonempty');
});

test(
  'resume .docx contains the candidate name and a known phrase from the source',
  { skip: UNZIP_AVAILABLE ? false : 'unzip is not available on this machine' },
  async (t) => {
    const jobsDir = makeFixtureJobsDir();
    t.after(() => fs.rmSync(jobsDir, { recursive: true, force: true }));

    const result = runRender(['--job', FIXTURE_SLUG, '--type', 'resume', '--jobs-dir', jobsDir]);
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);

    const docxPath = path.join(jobsDir, 'output', FIXTURE_SLUG, 'Alex_Rivera_Resume.docx');
    const xml = readDocumentXml(docxPath);

    assert.ok(xml.includes('Alex Rivera'), 'document.xml should contain the candidate name');
    assert.ok(
      xml.includes('SOC 2 Type II'),
      'document.xml should contain a known phrase from resume.md'
    );
  }
);

test(
  'cover letter .docx contains the candidate name and a known phrase from the source',
  { skip: UNZIP_AVAILABLE ? false : 'unzip is not available on this machine' },
  async (t) => {
    const jobsDir = makeFixtureJobsDir();
    t.after(() => fs.rmSync(jobsDir, { recursive: true, force: true }));

    const result = runRender(['--job', FIXTURE_SLUG, '--type', 'cover-letter', '--jobs-dir', jobsDir]);
    assert.equal(result.status, 0, `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);

    const docxPath = path.join(jobsDir, 'output', FIXTURE_SLUG, 'Alex_Rivera_Cover_Letter.docx');
    const xml = readDocumentXml(docxPath);

    assert.ok(xml.includes('Alex Rivera'), 'document.xml should contain the candidate name');
    assert.ok(
      xml.includes('Northwind Systems'),
      'document.xml should contain a known phrase from cover-letter.md'
    );
  }
);

test('output filenames are derived from the candidate name found in the document, not hardcoded', async (t) => {
  const jobsDir = makeFixtureJobsDir();
  t.after(() => fs.rmSync(jobsDir, { recursive: true, force: true }));

  const result = runRender(['--job', FIXTURE_SLUG, '--type', 'both', '--jobs-dir', jobsDir]);
  assert.equal(result.status, 0, `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);

  const outDir = path.join(jobsDir, 'output', FIXTURE_SLUG);
  const entries = fs.readdirSync(outDir).filter((name) => name.endsWith('.docx')).sort();

  assert.deepEqual(entries, ['Alex_Rivera_Cover_Letter.docx', 'Alex_Rivera_Resume.docx']);
});

test('readability.js runs on the shipped example cover letter and exits 0', (t) => {
  const readabilityJs = path.join(SCRIPTS_DIR, 'readability.js');
  const letterPath = path.join(FIXTURE_JOB_DIR, 'cover-letter.md');

  const result = spawnSync('node', [readabilityJs, letterPath], { encoding: 'utf8' });

  assert.equal(result.status, 0, `expected exit 0, got ${result.status}\nstderr: ${result.stderr}`);
  assert.ok(result.stdout.includes('Readability report for'));
  assert.ok(result.stdout.includes('Flesch reading ease'));
});
