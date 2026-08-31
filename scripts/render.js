#!/usr/bin/env node
'use strict';

/**
 * jobhunt markdown-to-docx renderer.
 *
 * Usage:
 *   node render.js --job <slug> --type resume|cover-letter|both [--data-dir <path>] [--out <path>]
 *
 * Resolves DATA_DIR/jobs/<slug>/<type>.md and renders it to
 * DATA_DIR/outputs/<slug>/<Name>_<Type>.docx. The filename is derived from
 * the candidate name found in the document, never hardcoded.
 *
 * DATA_DIR resolution (see reference/data-dir.md): --data-dir flag, then
 * $JOBHUNT_DATA_DIR, then ./.jobhunt/, then ~/.jobhunt/.
 *
 * resume.md/cover-letter.md are the single source of truth. No content ever
 * lives in this code.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { Packer } = require('docx');

const { parseResume, ParseError } = require('./lib/parse-resume');
const { parseLetter } = require('./lib/parse-letter');
const tpl = require('./lib/docx-template');

function usageError(message) {
  const err = new Error(message);
  err.usage = true;
  return err;
}

function parseArgs(argv) {
  const args = { job: null, type: null, dataDir: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--job':
        args.job = argv[i + 1];
        i += 1;
        break;
      case '--type':
        args.type = argv[i + 1];
        i += 1;
        break;
      case '--data-dir':
        args.dataDir = argv[i + 1];
        i += 1;
        break;
      case '--out':
        args.out = argv[i + 1];
        i += 1;
        break;
      default:
        throw usageError(`unrecognized argument: ${arg}`);
    }
  }
  return args;
}

function resolveDataDir(cliOverride) {
  if (cliOverride) {
    const resolved = path.resolve(cliOverride);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw usageError(`--data-dir ${cliOverride} does not exist`);
    }
    return resolved;
  }

  const envDir = process.env.JOBHUNT_DATA_DIR;
  if (envDir) {
    const resolved = path.resolve(envDir);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw usageError(
        `$JOBHUNT_DATA_DIR is set to ${envDir}, but that directory does not exist`
      );
    }
    return resolved;
  }

  const cwdDir = path.resolve(process.cwd(), '.jobhunt');
  if (fs.existsSync(cwdDir) && fs.statSync(cwdDir).isDirectory()) {
    return cwdDir;
  }

  const homeDir = path.resolve(os.homedir(), '.jobhunt');
  if (fs.existsSync(homeDir) && fs.statSync(homeDir).isDirectory()) {
    return homeDir;
  }

  throw usageError(
    'no DATA_DIR found ($JOBHUNT_DATA_DIR unset, no ./.jobhunt, no ~/.jobhunt). ' +
      'Run jobhunt:setup first, or pass --data-dir <path>.'
  );
}

function safeFilenamePart(text) {
  return text
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildResumeDocument(model) {
  const children = [];
  children.push(tpl.nameParagraph(model.name));
  children.push(tpl.contactParagraph(model.contactItems.join(' • ')));
  if (model.headline) {
    children.push(tpl.headlineParagraph(model.headline));
  }

  children.push(tpl.sectionHeading('SUMMARY'));
  children.push(tpl.bodyParagraph(model.summary));

  children.push(tpl.labelValueParagraph('Key Skills:', model.keySkills.join(' – ')));

  children.push(tpl.sectionHeading('PROFESSIONAL EXPERIENCE'));
  model.experience.forEach((role) => {
    children.push(tpl.employerHeaderParagraph(role.company, role.location, role.dateRange));
    children.push(tpl.titleParagraph(role.title));
    role.bullets.forEach((bullet) => {
      children.push(tpl.bulletParagraph(bullet));
    });
  });

  if (model.careerNotes) {
    children.push(tpl.labelValueParagraph('CAREER NOTES:', model.careerNotes));
  }

  if (model.education) {
    children.push(tpl.sectionHeading('EDUCATION'));
    model.education.forEach((line) => children.push(tpl.bodyParagraph(line)));
  }

  if (model.supplemental) {
    children.push(tpl.sectionHeading('SUPPLEMENTAL INFORMATION'));
    model.supplemental.forEach((line) => children.push(tpl.bodyParagraph(line)));
  }

  return tpl.buildDocument(children);
}

function buildCoverLetterDocument(model) {
  const children = [];
  children.push(tpl.letterParagraph(model.salutation));
  model.paragraphs.forEach((p) => children.push(tpl.letterParagraph(p)));
  children.push(tpl.letterParagraph(model.closing));
  children.push(tpl.letterParagraph(model.signOff));
  return tpl.buildDocument(children);
}

const TYPE_INFO = {
  resume: { fileStem: 'resume', label: 'Resume' },
  'cover-letter': { fileStem: 'cover-letter', label: 'Cover_Letter' },
};

async function renderOne(dataDir, slug, type, outOverride) {
  const info = TYPE_INFO[type];
  const mdPath = path.join(dataDir, 'jobs', slug, `${info.fileStem}.md`);
  if (!fs.existsSync(mdPath)) {
    throw usageError(`${mdPath} does not exist`);
  }
  const raw = fs.readFileSync(mdPath, 'utf8');

  let model;
  let doc;
  let candidateName;
  if (type === 'resume') {
    model = parseResume(raw, mdPath);
    doc = buildResumeDocument(model);
    candidateName = model.name;
  } else {
    model = parseLetter(raw, mdPath);
    doc = buildCoverLetterDocument(model);
    candidateName = model.signOff;
    console.log(`${mdPath}: ${model.wordCount} words in the body` +
      (model.wordCount < 250 || model.wordCount > 350 ? ' (outside the 250-350 target range)' : ''));
  }

  const safeName = safeFilenamePart(candidateName);
  const outPath = outOverride
    ? path.resolve(outOverride)
    : path.join(dataDir, 'outputs', slug, `${safeName}_${info.label}.docx`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buffer);
  console.log(`Wrote ${outPath}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.job) {
    throw usageError('--job <slug> is required');
  }
  if (!args.type || !['resume', 'cover-letter', 'both'].includes(args.type)) {
    throw usageError('--type must be one of resume|cover-letter|both');
  }
  if (args.out && args.type === 'both') {
    throw usageError('--out cannot be combined with --type both (ambiguous output path for two files)');
  }

  const dataDir = resolveDataDir(args.dataDir);
  console.log(`Using DATA_DIR: ${dataDir}`);

  const types = args.type === 'both' ? ['resume', 'cover-letter'] : [args.type];
  for (const type of types) {
    // eslint-disable-next-line no-await-in-loop
    await renderOne(dataDir, args.job, type, args.out);
  }
}

main().catch((err) => {
  if (err instanceof ParseError || err.parseError) {
    console.error(err.message);
  } else if (err.usage) {
    console.error(`Error: ${err.message}`);
    console.error(
      'Usage: node render.js --job <slug> --type resume|cover-letter|both [--data-dir <path>] [--out <path>]'
    );
  } else {
    console.error(err.stack || err.message || String(err));
  }
  process.exit(1);
});
