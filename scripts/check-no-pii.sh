#!/usr/bin/env bash
#
# check-no-pii.sh — repo hygiene guard for claude-jobhunt
#
# claude-jobhunt is an extract-and-rewrite of a private job-search system whose
# data and scripts were saturated with one person's personal information. This
# guard exists to keep that PII from ever reaching the public repo, and to keep
# a small number of retired-system names out of it too.
#
# ---------------------------------------------------------------------------
# DESIGN DECISIONS (read before editing this file)
# ---------------------------------------------------------------------------
#
# 1. Pattern classes, not personal literals. We do NOT hardcode the private
#    system's actual identifying strings (real name variants, home address,
#    phone number, former employer names, the proprietary product name it may
#    have been built on) anywhere in this script, because writing them into a
#    public repo file to detect them would defeat the entire purpose. Instead
#    we grep for pattern CLASSES that any such string would fall into:
#      - an absolute /Users/<something>/ path
#      - a ~/.claude/projects/ path
#      - an email-address shape
#      - a US phone-number shape (requires an area code; see note below)
#    plus a short list of genuinely non-identifying banned tokens: the retired
#    agent names `resume-author` and `job-scout`, the old data-dir/plugin
#    name `proficiently`, and this project's own pre-rename agent names
#    (`scout-mapper`, `scout-scanner`, `evaluator`, `materials-author`,
#    `courier`, `archivist` — renamed to `cartographer`, `lookout`,
#    `appraiser`, `scrivener`, `envoy`, `chronicler` to avoid colliding with
#    agents users already have). All of these are safe to spell out here
#    because they identify a piece of software history, not a person.
#
#    Tradeoff: pattern classes can't catch a bare personal name or a specific
#    employer name typed in prose (there is no reliable regex for "a human
#    name"). For that, maintainers who know the actual values can create an
#    optional, gitignored local file at the repo root named
#    `.pii-patterns.local` — one extended-regex pattern per line, '#' comments
#    and blank lines ignored — and this script will additionally grep for
#    every pattern in it. That file is never committed (add it to your own
#    ignore rules) and never shipped, so a deeper personal scan is possible
#    without ever publishing the values being scanned for.
#
# 2. Narrow attribution allowlist. The repo deliberately carries its author's
#    real name, GitHub handle, and email as public attribution in exactly two
#    files: LICENSE (MIT copyright line) and .claude-plugin/plugin.json
#    (author block + repo URLs). Those two literal strings are allowlisted,
#    but ONLY inside those two files — the same name or email appearing
#    anywhere else (a skill example, a doc, a template) still fails, because
#    that would be a real leak, not attribution.
#
# 3. Reserved placeholder domains are not PII. The repo's synthetic examples
#    (a sample resume in reference/data-formats.md, templates/contacts.sample.csv)
#    intentionally use `@example.com`-style addresses (RFC 2606 reserved
#    domains: example.com/.org/.net). Those can never resolve to a real
#    person's mailbox, so they're exempted from the email check everywhere,
#    not just in two files — the exemption is about the domain being
#    structurally non-identifying, not about where it appears.
#
# 4. The phone pattern requires an area code (10-digit US shape). A bare
#    7-digit local number has a much higher false-positive rate against
#    ordinary text (IDs, versions, dates) for very little real protection —
#    modern personal phone numbers are essentially always shared with an area
#    code. This also means the repo's own fictional example number
#    (555-01XX, the NANP-reserved fictional exchange) never needs a special
#    exemption: it's 7 digits and simply doesn't match.
#
# 5. Scan set = what could plausibly reach the public repo. Rather than
#    walking the whole filesystem tree, this script scans git-tracked files
#    plus untracked-but-not-ignored files (`git ls-files --cached --others
#    --exclude-standard`) when run inside a git working tree. That
#    automatically skips `.git/`, anything covered by .gitignore (including a
#    contributor's own global excludes, e.g. local Claude Code state such as
#    `.claude/settings.local.json`), and it still catches a new file about to
#    be committed. Outside a git working tree (e.g. an extracted release
#    tarball with no `.git/`), it falls back to a plain `find` that excludes
#    `.git/` and `node_modules/` by name.
#
# ---------------------------------------------------------------------------
# USAGE
# ---------------------------------------------------------------------------
#   scripts/check-no-pii.sh              # scan the repo, exit non-zero on any hit
#   scripts/check-no-pii.sh --self-test  # prove the guard actually fires, then clean up
#
set -euo pipefail

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

LOCAL_IGNORE_FILE="$REPO_ROOT/.pii-patterns.local"

# Files where the author's real-name/handle/email attribution is allowed.
ALLOWLISTED_FILES=("LICENSE" ".claude-plugin/plugin.json")
ALLOWLIST_NAME="Teren Bryson"
ALLOWLIST_HANDLE="SomeClown"
ALLOWLIST_EMAIL="terenbryson@proton.me"

# Files where the project's own public repository URL may appear. An install
# doc has to contain a copy-pasteable clone command; forcing the reader to go
# look the URL up somewhere else is a worse outcome than permitting the handle
# in exactly the places a reader needs it. This permits the handle ONLY as part
# of a github.com repo URL, and only in these files — a bare handle, or the
# author's name or email, still fails everywhere outside ALLOWLISTED_FILES.
REPO_URL_FILES=("README.md" "docs/INSTALL.md" "CONTRIBUTING.md")
REPO_URL_RE="github\.com/${ALLOWLIST_HANDLE}/"

# Reserved, structurally non-identifying email domains (RFC 2606).
RESERVED_EMAIL_DOMAINS_RE='@[A-Za-z0-9._-]*\.?(example)\.(com|org|net)'

violation_count=0

# ---------------------------------------------------------------------------
# Build the list of files to scan
# ---------------------------------------------------------------------------
list_scan_files() {
  if git -C "$REPO_ROOT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git -C "$REPO_ROOT" ls-files --cached --others --exclude-standard -z
  else
    find "$REPO_ROOT" \
      \( -path "$REPO_ROOT/.git" -o -path "$REPO_ROOT/node_modules" \) -prune -o \
      -type f -print0
  fi
}

is_allowlisted_file() {
  local rel="$1" f
  for f in "${ALLOWLISTED_FILES[@]}"; do
    [[ "$rel" == "$f" ]] && return 0
  done
  return 1
}

is_self() {
  local abs="$1"
  [[ "$abs" == "$SCRIPT_PATH" ]]
}

is_repo_url_file() {
  local rel="$1" f
  for f in "${REPO_URL_FILES[@]}"; do
    [[ "$rel" == "$f" ]] && return 0
  done
  return 1
}

# ---------------------------------------------------------------------------
# report_hits <label> <grep-extended-regex> [--case-insensitive]
#
# Greps every scan-set file for the pattern and prints/counts real hits,
# applying the attribution allowlist and the self-exclusion above.
# ---------------------------------------------------------------------------
report_hits() {
  local label="$1" pattern="$2" ci_flag="${3:-}"
  local grep_opts=(-nE)
  [[ "$ci_flag" == "--case-insensitive" ]] && grep_opts+=(-i)

  while IFS= read -r -d '' rel; do
    local abs="$REPO_ROOT/$rel"
    [[ -f "$abs" ]] || continue
    is_self "$abs" && continue

    local hits
    hits="$(grep "${grep_opts[@]}" "$pattern" "$abs" 2>/dev/null || true)"
    [[ -z "$hits" ]] && continue

    if is_allowlisted_file "$rel"; then
      # Only the exact attribution strings are permitted in these two files;
      # anything else matching the pattern still fails.
      hits="$(printf '%s\n' "$hits" | grep -vF "$ALLOWLIST_NAME" \
        | grep -vF "$ALLOWLIST_HANDLE" | grep -vF "$ALLOWLIST_EMAIL" || true)"
      [[ -z "$hits" ]] && continue
    fi

    if is_repo_url_file "$rel"; then
      # Permit the handle only where it forms the project's own repo URL.
      # A bare handle, or the author's name or email, still fails here.
      hits="$(printf '%s\n' "$hits" | grep -vE "$REPO_URL_RE" || true)"
      [[ -z "$hits" ]] && continue
    fi

    while IFS= read -r hit_line; do
      [[ -z "$hit_line" ]] && continue
      echo "  [$label] $rel:$hit_line"
      violation_count=$((violation_count + 1))
    done <<< "$hits"
  done < <(list_scan_files)
}

# report_hits, but for email hits specifically: also drops reserved
# placeholder domains everywhere, not just in the allowlisted files.
report_email_hits() {
  local label="$1" pattern="$2"

  while IFS= read -r -d '' rel; do
    local abs="$REPO_ROOT/$rel"
    [[ -f "$abs" ]] || continue
    is_self "$abs" && continue

    local hits
    hits="$(grep -nE "$pattern" "$abs" 2>/dev/null || true)"
    [[ -z "$hits" ]] && continue

    hits="$(printf '%s\n' "$hits" | grep -viE "$RESERVED_EMAIL_DOMAINS_RE" || true)"
    [[ -z "$hits" ]] && continue

    if is_allowlisted_file "$rel"; then
      hits="$(printf '%s\n' "$hits" | grep -vF "$ALLOWLIST_EMAIL" || true)"
      [[ -z "$hits" ]] && continue
    fi

    while IFS= read -r hit_line; do
      [[ -z "$hit_line" ]] && continue
      echo "  [$label] $rel:$hit_line"
      violation_count=$((violation_count + 1))
    done <<< "$hits"
  done < <(list_scan_files)
}

run_local_patterns() {
  [[ -f "$LOCAL_IGNORE_FILE" ]] || return 0
  echo "Scanning against local-only patterns in .pii-patterns.local ..."
  local line n=0
  while IFS= read -r line || [[ -n "$line" ]]; do
    n=$((n + 1))
    [[ -z "$line" || "$line" == \#* ]] && continue
    report_hits "local-pattern:$n" "$line"
  done < "$LOCAL_IGNORE_FILE"
}

# ---------------------------------------------------------------------------
# The actual scan
# ---------------------------------------------------------------------------
run_scan() {
  violation_count=0
  echo "Scanning $REPO_ROOT for PII and retired-name regressions ..."
  echo

  report_hits "abs-path"       '/Users/[A-Za-z0-9._-]+/'
  report_hits "claude-projects" '~/\.claude/projects/'
  report_email_hits "email"     '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
  report_hits "phone"          '(\+?1[-. ]?)?\([0-9]{3}\)[-. ]?[0-9]{3}[-. ]?[0-9]{4}\b|\b[0-9]{3}[-. ][0-9]{3}[-. ][0-9]{4}\b'
  report_hits "banned-token"   '\b(resume-author|job-scout|proficiently|scout-mapper|scout-scanner|evaluator|materials-author|courier|archivist)\b' --case-insensitive
  report_hits "attribution"    "$ALLOWLIST_NAME|$ALLOWLIST_HANDLE"

  run_local_patterns

  echo
  if [[ "$violation_count" -eq 0 ]]; then
    echo "PASS: no PII or retired-name hits found."
    return 0
  else
    echo "FAIL: $violation_count hit(s) found. See above."
    return 1
  fi
}

# ---------------------------------------------------------------------------
# --self-test: seed a violation, confirm the guard actually fires, clean up.
# A guard that never fires is worse than no guard.
# ---------------------------------------------------------------------------
self_test() {
  local tmp_file
  tmp_file="$REPO_ROOT/.pii-selftest-$$-$(date +%s).md"
  # Seed with a banned token AND an absolute /Users/ path — either one alone
  # is enough to fail the scan; using two increases confidence the seeded
  # file was actually picked up by the file-listing step, not just luck.
  {
    echo "# seeded self-test violation — safe to delete, this file is removed automatically"
    echo "legacy agent name: resume-author"
    echo "absolute path: /Users/selftest-user/Documents/secret.txt"
  } > "$tmp_file"

  # If the repo is a git working tree, an untracked file only enters the scan
  # set if it isn't excluded by .gitignore; the seeded filename below avoids
  # any pattern in this repo's .gitignore (node_modules/, .DS_Store, *.docx,
  # .jobhunt/, scratch/, npm-debug.log*), so it will be picked up as an
  # "untracked, not ignored" file, exactly like a real accidental addition
  # would be.
  cleanup() { rm -f "$tmp_file"; }
  trap cleanup EXIT

  echo "--self-test: seeded $tmp_file with known violations"
  echo

  if run_scan; then
    echo
    echo "SELF-TEST FAILED: the guard did not fire against a seeded violation."
    cleanup
    trap - EXIT
    exit 1
  else
    echo
    echo "SELF-TEST PASSED: the guard correctly failed against the seeded violation."
    cleanup
    trap - EXIT
    exit 0
  fi
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if [[ "${1:-}" == "--self-test" ]]; then
  self_test
else
  if run_scan; then
    exit 0
  else
    exit 1
  fi
fi
