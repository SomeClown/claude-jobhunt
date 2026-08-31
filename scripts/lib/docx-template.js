'use strict';

/**
 * Shared styling primitives for the jobhunt renderer.
 *
 * Every visual decision (fonts, sizes, margins, heading structure, bullet
 * style, bold/normal runs) lives here, once, so resume.md and cover-letter.md
 * render with the same clean, ATS-friendly look: no tables, no columns, no
 * text boxes for layout, real Word heading structure (not just bold text),
 * standard fonts.
 *
 * render.js composes these primitives into a full Document; this module has
 * no knowledge of resume.md/cover-letter.md grammar.
 */

const {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} = require('docx');

const FONT = 'Calibri';

// Font sizes are in half-points (docx convention): 22 = 11pt.
const SIZE_NAME = 32; // 16pt
const SIZE_HEADLINE = 22; // 11pt
const SIZE_SECTION_HEADING = 22; // 11pt
const SIZE_BODY = 22; // 11pt

const MARGIN_TWIPS = convertInchesToTwip(0.75);

const SPACING_AFTER_NAME = 60;
const SPACING_AFTER_CONTACT = 200;
const SPACING_AFTER_HEADLINE = 200;
const SPACING_BEFORE_SECTION = 220;
const SPACING_AFTER_SECTION = 100;
const SPACING_AFTER_PARAGRAPH = 120;
const SPACING_AFTER_BULLET = 40;
const SPACING_AFTER_EMPLOYER_HEADER = 20;
const SPACING_AFTER_TITLE = 60;
const SPACING_AFTER_EMPLOYER_BLOCK = 160;

function pageMargins() {
  return {
    top: MARGIN_TWIPS,
    bottom: MARGIN_TWIPS,
    left: MARGIN_TWIPS,
    right: MARGIN_TWIPS,
  };
}

/** A bold run. */
function boldRun(text, extra) {
  return new TextRun(Object.assign({ text, font: FONT, size: SIZE_BODY, bold: true }, extra));
}

/** A normal (non-bold) run. */
function normalRun(text, extra) {
  return new TextRun(Object.assign({ text, font: FONT, size: SIZE_BODY }, extra));
}

/** The candidate's name, rendered as the document title. */
function nameParagraph(name) {
  return new Paragraph({
    heading: HeadingLevel.TITLE,
    spacing: { after: SPACING_AFTER_NAME },
    children: [new TextRun({ text: name, font: FONT, size: SIZE_NAME, bold: true })],
  });
}

/** The contact line under the name. */
function contactParagraph(text) {
  return new Paragraph({
    spacing: { after: SPACING_AFTER_CONTACT },
    children: [new TextRun({ text, font: FONT, size: SIZE_BODY })],
  });
}

/** The optional ALL-CAPS positioning headline. */
function headlineParagraph(text) {
  return new Paragraph({
    spacing: { after: SPACING_AFTER_HEADLINE },
    children: [new TextRun({ text, font: FONT, size: SIZE_HEADLINE, bold: true })],
  });
}

/** A real ALL-CAPS section heading (SUMMARY, PROFESSIONAL EXPERIENCE, ...). */
function sectionHeading(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: SPACING_BEFORE_SECTION, after: SPACING_AFTER_SECTION },
    border: {
      bottom: { color: '999999', space: 2, style: 'single', size: 4 },
    },
    children: [new TextRun({ text, font: FONT, size: SIZE_SECTION_HEADING, bold: true })],
  });
}

/** A plain body paragraph (e.g. SUMMARY prose). */
function bodyParagraph(text, extra) {
  return new Paragraph(
    Object.assign(
      { spacing: { after: SPACING_AFTER_PARAGRAPH }, children: [normalRun(text)] },
      extra
    )
  );
}

/** A "Label: value" line, label bold, value normal, one paragraph. */
function labelValueParagraph(label, value, extra) {
  return new Paragraph(
    Object.assign(
      {
        spacing: { after: SPACING_AFTER_PARAGRAPH },
        children: [boldRun(`${label} `), normalRun(value)],
      },
      extra
    )
  );
}

/** A real bulleted paragraph, using Word's built-in bullet numbering. */
function bulletParagraph(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: SPACING_AFTER_BULLET },
    indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.15) },
    children: [normalRun(text)],
  });
}

/**
 * An employer/title header line for a resume experience block:
 * "Company, Location • Dates" rendered as a heading-level paragraph,
 * followed by the title line.
 */
function employerHeaderParagraph(company, location, dateRange) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: SPACING_BEFORE_SECTION, after: SPACING_AFTER_EMPLOYER_HEADER },
    children: [
      new TextRun({ text: `${company}, ${location}`, font: FONT, size: SIZE_BODY, bold: true }),
      new TextRun({ text: ` • ${dateRange}`, font: FONT, size: SIZE_BODY, bold: false }),
    ],
  });
}

function titleParagraph(text) {
  return new Paragraph({
    spacing: { after: SPACING_AFTER_TITLE },
    children: [new TextRun({ text, font: FONT, size: SIZE_BODY, italics: true })],
  });
}

/** Spacer paragraph used to separate employer blocks or major groups. */
function spacerParagraph() {
  return new Paragraph({ spacing: { after: SPACING_AFTER_EMPLOYER_BLOCK }, children: [] });
}

/** A plain, unstyled prose paragraph for cover-letter body paragraphs. */
function letterParagraph(text) {
  return new Paragraph({
    spacing: { after: SPACING_AFTER_PARAGRAPH },
    alignment: AlignmentType.LEFT,
    children: [normalRun(text)],
  });
}

/** Build the final Document from a flat list of Paragraph children. */
function buildDocument(children) {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY },
        },
      },
    },
    sections: [
      {
        properties: { page: { margin: pageMargins() } },
        children,
      },
    ],
  });
}

module.exports = {
  FONT,
  boldRun,
  normalRun,
  nameParagraph,
  contactParagraph,
  headlineParagraph,
  sectionHeading,
  bodyParagraph,
  labelValueParagraph,
  bulletParagraph,
  employerHeaderParagraph,
  titleParagraph,
  spacerParagraph,
  letterParagraph,
  buildDocument,
};
