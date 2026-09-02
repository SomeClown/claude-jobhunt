'use strict';

/**
 * Parser for output/<slug>/cover-letter.md.
 *
 * Targets exactly the grammar documented in reference/data-formats.md under
 * `output/[slug]/cover-letter.md`. Fails loudly with a line number on anything
 * that does not match, including the dash rule: the renderer performs no
 * dash substitution, so an em dash or en dash in the file is rejected
 * outright rather than silently shipped or silently fixed.
 *
 * Word count (250-350 words) is reported by scrivener in its task
 * output per data-formats.md, not enforced here as a hard failure; this
 * parser computes and returns it so render.js can print it for visibility,
 * but a file outside that range still renders.
 */

const { ParseError } = require('./parse-resume');

const EM_DASH = '—';
const EN_DASH = '–';

function splitLines(content) {
  const lines = content.split(/\r\n|\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

/** Reject the file outright if it contains an em dash or en dash anywhere,
 * naming every offending line. */
function checkDashes(lines, file) {
  const offenders = [];
  lines.forEach((line, idx) => {
    if (line.includes(EM_DASH) || line.includes(EN_DASH)) {
      offenders.push(idx + 1);
    }
  });
  if (offenders.length > 0) {
    throw new ParseError(
      file,
      offenders[0],
      `em dash or en dash found on line(s) ${offenders.join(', ')}; cover-letter.md must use ASCII hyphens only (the renderer performs no dash substitution)`
    );
  }
}

function checkForbiddenMarkdown(lines, file) {
  const headingRe = /^#{1,6}\s/;
  const linkRe = /\[[^\]]+\]\([^)]+\)/;
  const hrRe = /^(-{3,}|\*{3,}|_{3,})$/;
  const singleAsteriskItalicRe = /(^|[^*])\*([^*\n]+)\*([^*]|$)/;
  const underscoreItalicRe = /\b_[^_\s][^_]*_\b/;
  const bulletRe = /^-\s/;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (headingRe.test(line)) {
      throw new ParseError(file, lineNum, 'markdown headings ("#") are not allowed in cover-letter.md');
    }
    if (line.includes('**')) {
      throw new ParseError(file, lineNum, 'bold markers ("**") are not allowed in cover-letter.md');
    }
    if (line.includes('|')) {
      throw new ParseError(file, lineNum, 'tables ("|") are not allowed in cover-letter.md');
    }
    if (linkRe.test(line)) {
      throw new ParseError(file, lineNum, 'markdown links are not allowed in cover-letter.md');
    }
    if (hrRe.test(line.trim())) {
      throw new ParseError(file, lineNum, 'horizontal rules are not allowed in cover-letter.md');
    }
    if (bulletRe.test(line)) {
      throw new ParseError(file, lineNum, 'bullets are not allowed in cover-letter.md');
    }
    if (singleAsteriskItalicRe.test(line) || underscoreItalicRe.test(line)) {
      throw new ParseError(file, lineNum, 'italic markers ("*" or "_") are not allowed in cover-letter.md');
    }
  });
}

function parseLetter(content, file) {
  const lines = splitLines(content);

  checkDashes(lines, file);
  checkForbiddenMarkdown(lines, file);

  const fail = (lineNum, message) => {
    throw new ParseError(file, lineNum, message);
  };

  if (lines.length === 0 || lines[0].trim() === '') {
    fail(1, 'expected a salutation line, got a blank or empty file');
  }

  // Salutation: exactly "Dear Hiring Manager," or a specific named
  // recipient of the same "Dear <Name>," shape.
  const salutation = lines[0].trim();
  if (!/^Dear .+,$/.test(salutation)) {
    fail(
      1,
      `expected a salutation like "Dear Hiring Manager," (or "Dear <Name>," for a confirmed named recipient), got ${JSON.stringify(lines[0])}`
    );
  }

  if (lines[1] === undefined || lines[1].trim() !== '') {
    fail(2, 'expected a blank line after the salutation');
  }

  // Find the closing: the last two non-blank lines must be "Regards," then
  // the candidate's name, with nothing after the name.
  let lastIdx = lines.length - 1;
  while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx -= 1;
  if (lastIdx < 0) {
    fail(lines.length, 'file ends without a closing ("Regards," and the candidate name)');
  }
  const nameLineIdx = lastIdx;
  const closingLineIdx = nameLineIdx - 1;

  if (closingLineIdx < 0 || lines[closingLineIdx].trim() !== 'Regards,') {
    fail(
      closingLineIdx < 0 ? 1 : closingLineIdx + 1,
      `expected "Regards," as the closing line, got ${JSON.stringify(lines[closingLineIdx])}`
    );
  }
  const signOff = lines[nameLineIdx].trim();
  if (signOff === '') {
    fail(nameLineIdx + 1, 'expected the candidate name after "Regards,"');
  }

  const blankBeforeClosingIdx = closingLineIdx - 1;
  if (blankBeforeClosingIdx < 2 || lines[blankBeforeClosingIdx].trim() !== '') {
    fail(
      blankBeforeClosingIdx < 2 ? 3 : blankBeforeClosingIdx + 1,
      'expected a blank line before "Regards,"'
    );
  }

  // Body: everything strictly between the salutation's blank line and the
  // blank line before "Regards,", grouped into paragraphs on blank lines.
  const bodyLines = lines.slice(2, blankBeforeClosingIdx);
  const paragraphs = [];
  let current = [];
  for (let i = 0; i < bodyLines.length; i += 1) {
    const line = bodyLines[i];
    const lineNum = i + 3; // bodyLines[0] is file line 3
    if (line.trim() === '') {
      if (current.length === 0) {
        fail(lineNum, 'unexpected blank line (paragraphs must be separated by exactly one blank line)');
      }
      paragraphs.push(current);
      current = [];
    } else {
      current.push(line.trim());
    }
  }
  if (current.length > 0) {
    paragraphs.push(current);
  }

  if (paragraphs.length === 0) {
    fail(3, 'expected at least one body paragraph');
  }
  if (paragraphs.length < 3 || paragraphs.length > 5) {
    fail(3, `expected 3 to 5 body paragraphs, found ${paragraphs.length}`);
  }

  const paragraphTexts = paragraphs.map((pLines) => pLines.join(' '));
  const wordCount = paragraphTexts.join(' ').split(/\s+/).filter(Boolean).length;

  return {
    salutation,
    paragraphs: paragraphTexts,
    closing: 'Regards,',
    signOff,
    wordCount,
  };
}

module.exports = { parseLetter };
