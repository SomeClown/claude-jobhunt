'use strict';

/**
 * Parser for jobs/<slug>/resume.md.
 *
 * Targets exactly the grammar documented in reference/data-formats.md under
 * `jobs/[slug]/resume.md`. Anything that does not match that grammar is a
 * parse error carrying a 1-based line number and a description of what was
 * expected — this parser never guesses or silently skips malformed input.
 */

const BULLET_SEP = ' • '; // space, U+2022 BULLET, space
const EN_DASH = '–';

class ParseError extends Error {
  constructor(file, line, message) {
    super(`${file}:${line}: ${message}`);
    this.file = file;
    this.line = line;
    this.parseError = true;
  }
}

function splitLines(content) {
  const lines = content.split(/\r\n|\n/);
  // A file with the required single trailing newline splits into one
  // trailing empty string; drop it so line counts match the file on disk.
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function isBlank(line) {
  return line === undefined || line.trim() === '';
}

/** Section-heading recognition per data-formats.md: all-uppercase letters,
 * spaces, `&`, and `/`, with no trailing colon. */
function isSectionHeading(line) {
  return /^[A-Z][A-Z &/]*$/.test(line);
}

/** The optional headline is looser: any ALL-CAPS line (letters compare equal
 * to their uppercase form, at least one letter present). An em dash and
 * other punctuation are allowed there, unlike the fixed section headings. */
function isAllCapsLine(line) {
  return /[A-Z]/.test(line) && line === line.toUpperCase();
}

/**
 * Forbidden-construct scan, applied to the whole file before structural
 * parsing: markdown headings, bold/italic markers, links, tables, and
 * horizontal rules are never valid in resume.md (it is plain text with a
 * fixed shape, not general markdown).
 */
function checkForbiddenMarkdown(lines, file) {
  const headingRe = /^#{1,6}\s/;
  const linkRe = /\[[^\]]+\]\([^)]+\)/;
  const hrRe = /^(-{3,}|\*{3,}|_{3,})$/;
  const singleAsteriskItalicRe = /(^|[^*])\*([^*\n]+)\*([^*]|$)/;
  const underscoreItalicRe = /\b_[^_\s][^_]*_\b/;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (headingRe.test(line)) {
      throw new ParseError(file, lineNum, 'markdown headings ("#") are not allowed in resume.md');
    }
    if (line.includes('**')) {
      throw new ParseError(file, lineNum, 'bold markers ("**") are not allowed in resume.md');
    }
    if (line.includes('|')) {
      throw new ParseError(file, lineNum, 'tables ("|") are not allowed in resume.md');
    }
    if (linkRe.test(line)) {
      throw new ParseError(file, lineNum, 'markdown links are not allowed in resume.md');
    }
    if (hrRe.test(line.trim())) {
      throw new ParseError(file, lineNum, 'horizontal rules are not allowed in resume.md');
    }
    if (singleAsteriskItalicRe.test(line) || underscoreItalicRe.test(line)) {
      throw new ParseError(file, lineNum, 'italic markers ("*" or "_") are not allowed in resume.md');
    }
  });
}

function parseResume(content, file) {
  const lines = splitLines(content);
  checkForbiddenMarkdown(lines, file);

  const fail = (lineNum, message) => {
    throw new ParseError(file, lineNum, message);
  };

  // --- Line 1: name ---
  if (isBlank(lines[0])) {
    fail(1, 'expected the candidate name on line 1, got a blank line');
  }
  const name = lines[0].trim();

  // --- Line 2: contact line ---
  if (lines[1] === undefined) {
    fail(2, 'expected a contact line, reached end of file');
  }
  if (isBlank(lines[1])) {
    fail(2, 'expected a contact line, got a blank line');
  }
  const contactItems = lines[1].split(BULLET_SEP).map((s) => s.trim());
  if (contactItems.length < 2 || contactItems.length > 5) {
    fail(
      2,
      `expected 2 to 5 contact items separated by " • ", found ${contactItems.length}`
    );
  }
  if (contactItems.some((item) => item === '')) {
    fail(2, 'contact line has an empty item between separators');
  }

  // --- Line 3: required blank line ---
  if (!isBlank(lines[2])) {
    fail(3, 'expected a blank line after the contact line');
  }

  let idx = 3;
  let headline = null;

  if (lines[idx] === undefined) {
    fail(idx + 1, 'expected the SUMMARY heading, reached end of file');
  }
  if (lines[idx].trim() === 'SUMMARY') {
    // no headline present
  } else if (isAllCapsLine(lines[idx])) {
    headline = lines[idx].trim();
    idx += 1;
    if (!isBlank(lines[idx])) {
      fail(idx + 1, 'expected a blank line after the headline');
    }
    idx += 1;
    if (isBlank(lines[idx]) || lines[idx].trim() !== 'SUMMARY') {
      fail(idx + 1, `expected the SUMMARY heading, got ${JSON.stringify(lines[idx])}`);
    }
  } else {
    fail(idx + 1, 'expected an ALL-CAPS headline or the SUMMARY heading');
  }

  // idx now points at the "SUMMARY" heading line
  idx += 1;

  // --- SUMMARY paragraph ---
  const summaryLines = [];
  while (idx < lines.length && !isBlank(lines[idx])) {
    if (/^-\s/.test(lines[idx])) {
      fail(idx + 1, 'SUMMARY may not contain bullets');
    }
    summaryLines.push(lines[idx].trim());
    idx += 1;
  }
  if (summaryLines.length === 0) {
    fail(idx + 1, 'SUMMARY requires at least one line of prose');
  }
  const summary = summaryLines.join(' ');
  if (!isBlank(lines[idx])) {
    fail(idx + 1, 'expected a blank line after SUMMARY');
  }
  idx += 1;

  // --- Key Skills: ---
  if (isBlank(lines[idx]) || lines[idx].trim() !== 'Key Skills:') {
    fail(idx + 1, `expected the "Key Skills:" label, got ${JSON.stringify(lines[idx])}`);
  }
  idx += 1;
  if (isBlank(lines[idx])) {
    fail(idx + 1, 'expected one line of skills after "Key Skills:"');
  }
  const skillsLine = lines[idx];
  idx += 1;
  if (!isBlank(lines[idx])) {
    fail(
      idx + 1,
      'a hard-wrapped skills block is a parse error; "Key Skills:" must be exactly one line, followed by a blank line'
    );
  }
  const keySkills = skillsLine
    .split(new RegExp(` - | ${EN_DASH} `))
    .map((s) => s.trim())
    .filter((s) => s !== '');
  if (keySkills.length < 1) {
    fail(idx, 'expected at least one skill on the Key Skills line');
  }
  idx += 1;

  // --- PROFESSIONAL EXPERIENCE ---
  if (isBlank(lines[idx]) || lines[idx].trim() !== 'PROFESSIONAL EXPERIENCE') {
    fail(
      idx + 1,
      `expected the "PROFESSIONAL EXPERIENCE" heading, got ${JSON.stringify(lines[idx])}`
    );
  }
  idx += 1;
  if (!isBlank(lines[idx])) {
    fail(idx + 1, 'expected a blank line after "PROFESSIONAL EXPERIENCE"');
  }
  idx += 1;

  const experience = [];
  const dateRangeRe = new RegExp(`^(\\d{2}/\\d{4}) (-|${EN_DASH}) (\\d{2}/\\d{4}|Present)$`);

  while (idx < lines.length) {
    if (isBlank(lines[idx])) {
      idx += 1;
      continue;
    }
    if (
      /^CAREER NOTES:/.test(lines[idx]) ||
      lines[idx].trim() === 'EDUCATION' ||
      lines[idx].trim() === 'SUPPLEMENTAL INFORMATION'
    ) {
      break;
    }

    const headerLineNum = idx + 1;
    const headerLine = lines[idx];
    const parts = headerLine.split(BULLET_SEP);
    if (parts.length !== 2) {
      fail(
        headerLineNum,
        `expected an employer header "Company, Location • Dates", got ${JSON.stringify(headerLine)}`
      );
    }
    const [companyLocation, dateRangeRaw] = parts.map((s) => s.trim());
    const commaIdx = companyLocation.indexOf(',');
    if (commaIdx === -1) {
      fail(
        headerLineNum,
        `expected "Company, Location" before the date range, got ${JSON.stringify(companyLocation)}`
      );
    }
    const company = companyLocation.slice(0, commaIdx).trim();
    const location = companyLocation.slice(commaIdx + 1).trim();
    if (!company || !location) {
      fail(headerLineNum, 'employer header is missing a company or a location');
    }
    if (!dateRangeRe.test(dateRangeRaw)) {
      fail(
        headerLineNum,
        `expected a date range like "MM/YYYY - MM/YYYY" or "MM/YYYY - Present", got ${JSON.stringify(dateRangeRaw)}`
      );
    }
    idx += 1;

    // Title line
    if (isBlank(lines[idx])) {
      fail(idx + 1, 'expected a title line after the employer header');
    }
    if (/^-\s/.test(lines[idx])) {
      fail(idx + 1, 'expected a title line, got a bullet');
    }
    const title = lines[idx].trim();
    idx += 1;

    // Achievement bullets
    const bullets = [];
    while (idx < lines.length && !isBlank(lines[idx])) {
      const bulletLine = lines[idx];
      if (/^\s+-/.test(bulletLine)) {
        fail(idx + 1, 'nested/sub-bullets are not allowed');
      }
      if (!/^-\s/.test(bulletLine)) {
        fail(
          idx + 1,
          `expected an achievement bullet starting with "- ", got ${JSON.stringify(bulletLine)}`
        );
      }
      bullets.push(bulletLine.slice(2).trim());
      idx += 1;
    }
    if (bullets.length === 0) {
      fail(idx + 1, `employer block for "${company}" requires at least one achievement bullet`);
    }

    experience.push({ company, location, dateRange: dateRangeRaw, title, bullets });

    if (idx < lines.length && !isBlank(lines[idx])) {
      const nextLine = lines[idx];
      const isKnownNextSection =
        /^CAREER NOTES:/.test(nextLine) ||
        nextLine.trim() === 'EDUCATION' ||
        nextLine.trim() === 'SUPPLEMENTAL INFORMATION';
      if (!isKnownNextSection) {
        fail(idx + 1, 'expected a blank line between employer blocks');
      }
    } else if (idx < lines.length) {
      idx += 1; // consume the blank separator
    }
  }

  if (experience.length === 0) {
    fail(idx + 1, 'PROFESSIONAL EXPERIENCE requires at least one employer block');
  }

  // --- CAREER NOTES: (optional) ---
  let careerNotes = null;
  if (idx < lines.length && /^CAREER NOTES:/.test(lines[idx])) {
    const m = lines[idx].match(/^CAREER NOTES:\s+(.+)$/);
    if (!m) {
      fail(idx + 1, '"CAREER NOTES:" requires text on the same line');
    }
    careerNotes = m[1].trim();
    idx += 1;
    if (idx < lines.length && isBlank(lines[idx])) idx += 1;
  }

  // --- EDUCATION (optional) ---
  let education = null;
  if (idx < lines.length && lines[idx].trim() === 'EDUCATION') {
    idx += 1;
    const eduLines = [];
    while (idx < lines.length && !isBlank(lines[idx])) {
      eduLines.push(lines[idx].trim());
      idx += 1;
    }
    if (eduLines.length === 0) {
      fail(idx + 1, 'EDUCATION requires at least one line');
    }
    education = eduLines;
    if (idx < lines.length && isBlank(lines[idx])) idx += 1;
  }

  // --- SUPPLEMENTAL INFORMATION (optional) ---
  let supplemental = null;
  if (idx < lines.length && lines[idx].trim() === 'SUPPLEMENTAL INFORMATION') {
    idx += 1;
    const suppLines = [];
    while (idx < lines.length && !isBlank(lines[idx])) {
      suppLines.push(lines[idx].trim());
      idx += 1;
    }
    if (suppLines.length === 0) {
      fail(idx + 1, 'SUPPLEMENTAL INFORMATION requires at least one line');
    }
    supplemental = suppLines;
    if (idx < lines.length && isBlank(lines[idx])) idx += 1;
  }

  // --- Nothing should be left ---
  while (idx < lines.length && isBlank(lines[idx])) idx += 1;
  if (idx < lines.length) {
    fail(idx + 1, `unexpected content after the recognized sections: ${JSON.stringify(lines[idx])}`);
  }

  return {
    name,
    contactItems,
    headline,
    summary,
    keySkills,
    experience,
    careerNotes,
    education,
    supplemental,
  };
}

module.exports = { parseResume, ParseError };
