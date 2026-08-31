#!/usr/bin/env node
'use strict';

/**
 * Standalone readability report for a markdown file.
 *
 * Usage: node readability.js <file.md>
 *
 * Reports the Flesch reading-ease score, sentence count, median and max
 * sentence length (in words), and flags any sentence over 35 words.
 *
 * This is advisory, not a gate — it does not fail the process or block
 * anything. It's meant to be used alongside
 * skills/tailor-resume/references/writing-rules.md, whose measurable rules
 * are what actually bind. No other file in this renderer depends on it, and
 * it has no runtime dependencies of its own.
 */

const fs = require('fs');
const path = require('path');

/** Strip common markdown syntax down to plain prose, line by line, so
 * headings/bullets/emphasis markers/links/tables don't distort sentence
 * detection or word counts. */
function stripMarkdown(content) {
  return content
    .split(/\r\n|\n/)
    .map((line) => {
      let l = line;
      l = l.replace(/^#{1,6}\s+/, '');
      l = l.replace(/^[-*]\s+/, '');
      l = l.replace(/\*\*(.*?)\*\*/g, '$1');
      l = l.replace(/\*(.*?)\*/g, '$1');
      l = l.replace(/_(.*?)_/g, '$1');
      l = l.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      l = l.replace(/`+/g, '');
      l = l.replace(/\|/g, ' ');
      return l;
    })
    .join(' ');
}

/** Crude but serviceable sentence splitter: breaks after ./!/? when
 * followed by whitespace + a capital letter, or by end of string. Not
 * abbreviation-aware; good enough for an advisory tool. */
function splitSentences(text) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const matches = normalized.match(/[^.!?]+[.!?]+(?=\s+[A-Z]|\s*$)|[^.!?]+$/g) || [];
  return matches.map((s) => s.trim()).filter(Boolean);
}

function countWords(sentence) {
  return sentence.split(/\s+/).filter(Boolean).length;
}

/** Heuristic vowel-group syllable counter, the same approach most
 * lightweight readability tools use. Not phonetically exact. */
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return groups ? Math.max(groups.length, 1) : 1;
}

function fleschReadingEase(totalWords, totalSentences, totalSyllables) {
  return 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);
}

function median(nums) {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

function analyze(content) {
  const prose = stripMarkdown(content);
  const sentences = splitSentences(prose);
  const sentenceWordCounts = sentences.map(countWords);
  const totalWords = sentenceWordCounts.reduce((a, b) => a + b, 0);
  const totalSentences = sentences.length;

  let totalSyllables = 0;
  sentences.forEach((sentence) => {
    sentence
      .split(/\s+/)
      .filter(Boolean)
      .forEach((word) => {
        totalSyllables += countSyllables(word);
      });
  });

  const score =
    totalWords > 0 && totalSentences > 0
      ? fleschReadingEase(totalWords, totalSentences, totalSyllables)
      : null;

  const flagged = sentences
    .map((sentence, i) => ({ sentence, words: sentenceWordCounts[i] }))
    .filter((s) => s.words > 35);

  return {
    totalWords,
    totalSentences,
    score,
    median: median(sentenceWordCounts),
    max: sentenceWordCounts.length ? Math.max(...sentenceWordCounts) : 0,
    flagged,
  };
}

function printReport(filePath, report) {
  console.log(`Readability report for ${filePath}`);
  console.log(`  Sentences:              ${report.totalSentences}`);
  console.log(`  Words:                  ${report.totalWords}`);
  console.log(`  Median sentence length: ${report.median} words`);
  console.log(`  Max sentence length:    ${report.max} words`);
  console.log(
    `  Flesch reading ease:    ${report.score !== null ? report.score.toFixed(1) : 'n/a (no scoreable sentences)'}`
  );
  if (report.flagged.length > 0) {
    console.log(`\n  Sentences over 35 words (${report.flagged.length}):`);
    report.flagged.forEach(({ sentence, words }) => {
      const preview = sentence.length > 100 ? `${sentence.slice(0, 100)}...` : sentence;
      console.log(`    [${words} words] ${preview}`);
    });
  } else {
    console.log('\n  No sentences over 35 words.');
  }
  console.log(
    '\n  Advisory only, not a gate. See skills/tailor-resume/references/writing-rules.md for the binding rules.'
  );
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node readability.js <file.md>');
    process.exit(1);
  }
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: ${resolved} does not exist`);
    process.exit(1);
  }
  const content = fs.readFileSync(resolved, 'utf8');
  printReport(resolved, analyze(content));
}

if (require.main === module) {
  main();
}

module.exports = { analyze, splitSentences, countSyllables, fleschReadingEase, median };
