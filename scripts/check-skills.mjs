#!/usr/bin/env node
// Checks that the skills, the command, the hook script and the README name only real SpecsGraph MCP tools and give
// them only arguments they take, against the snapshot in scripts/tools.json (regenerate it with gen-tools.mjs).
// The server rejects an unknown argument, so a wrong name in a skill is a broken instruction.
//
// Usage: node scripts/check-skills.mjs            check the repository
//        node scripts/check-skills.mjs --self-test prove the checks catch known mistakes
//
// Rules:
// 1. A tool-shaped name (a tool prefix such as spec_ or proposal_, then a word) must be a tool in tools.json.
// 2. "`tool` with `a`, `b` ..." and "`tool` (`a`, `b`)": each backticked argument up to the end of the clause
//    (. ; : or the next tool) must be an input of that tool. `arg: value` counts as arg; text in parentheses after
//    "with" is skipped, and backticked values that are not identifiers (WS-n, kind/Name) are ignored.
// 3. Denylist: arguments that were wrong before and must not come back (proposalId on spec_apply).
// Plain Node, no dependencies.

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');
const { tools } = JSON.parse(readFileSync(join(repo, 'scripts/tools.json'), 'utf8'));
const byName = new Map(tools.map((tool) => [tool.name, tool]));
const prefixes = [...new Set(tools.map((tool) => tool.name.split('_')[0]))];
const toolShaped = new RegExp(`\\b(?:${prefixes.join('|')})_[A-Za-z]+\\b`, 'g');
const identifier = /^[a-z][A-Za-z]*$/;

/** Arguments a tool must never be paired with, whatever the phrasing. */
const DENY = [{ tool: 'spec_apply', arg: 'proposalId', why: 'spec_apply stages into the open proposal itself' }];

function sentences(text) {
  return text.split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z`*(])|\n(?=\s*(?:[-*|]|\d+\.)\s)/);
}

/** Backticked arguments in the clause after each tool mention of a sentence. */
function pairs(sentence) {
  const found = [];
  const mentions = [...sentence.matchAll(/`([a-z]+_[A-Za-z]+)`/g)];
  for (let i = 0; i < mentions.length; i++) {
    const tool = mentions[i][1];
    const start = mentions[i].index + mentions[i][0].length;
    const end = i + 1 < mentions.length ? mentions[i + 1].index : sentence.length;
    let clause = sentence.slice(start, end);
    if (/^ \(/.test(clause)) {
      clause = clause.slice(2, clause.indexOf(')') === -1 ? undefined : clause.indexOf(')'));
    } else if (/^ with\b/.test(clause)) {
      clause = clause.replace(/\([^)]*\)/g, '').split(/[.;:](?:\s|$)/)[0];
    } else continue;
    for (const [, raw] of clause.matchAll(/`([^`]+)`/g)) {
      const arg = raw.split(':')[0].trim();
      if (identifier.test(arg)) found.push({ tool, arg });
    }
  }
  return found;
}

function check(text, where) {
  const problems = [];
  const lines = text.split('\n');
  lines.forEach((line, n) => {
    for (const [name] of line.matchAll(toolShaped)) {
      if (!byName.has(name)) problems.push(`${where}:${n + 1}: unknown tool ${name}`);
    }
  });
  for (const sentence of sentences(text)) {
    const line = text.slice(0, text.indexOf(sentence)).split('\n').length;
    for (const { tool, arg } of pairs(sentence)) {
      const def = byName.get(tool);
      if (def && !def.inputs.includes(arg)) {
        problems.push(`${where}:${line}: ${tool} takes no argument ${arg} (takes ${def.inputs.join(', ')})`);
      }
    }
    for (const { tool, arg, why } of DENY) {
      if (sentence.includes(`\`${tool}\``) && sentence.includes(`\`${arg}\``)) {
        problems.push(`${where}:${line}: ${arg} next to ${tool}: ${why}`);
      }
    }
  }
  return problems;
}

function files() {
  const list = ['README.md', 'commands/setup.md', 'scripts/session-context.sh'];
  for (const dir of readdirSync(join(repo, 'skills'))) list.push(`skills/${dir}/SKILL.md`);
  for (const file of readdirSync(join(repo, 'commands'))) {
    if (!list.includes(`commands/${file}`)) list.push(`commands/${file}`);
  }
  return list.filter((file) => existsSync(join(repo, file)));
}

function selfTest() {
  const cases = [
    ['`spec_apply` with the workstream, `proposalId`, and the document.', /proposalId/],
    ['Keep the id. `spec_apply` stages it; also send `proposalId`.', /proposalId next to spec_apply/],
    ['Call `proposal_approve` next.', /unknown tool proposal_approve/],
    ['Then run spec_publish from the hook.', /unknown tool spec_publish/],
    ['`thread_open` with `artefactId`, `anchor` and `threadKind`.', /thread_open takes no argument threadKind/],
    ['`proposal_get` (`proposal: WS-3`, `revisionId`).', /proposal_get takes no argument revisionId/],
  ];
  const clean = [
    '`spec_apply` with the `workstream` and `yaml`: the document with the `revision` you read.',
    '`thread_open` with the `workstream`, `artefactId`, `body`, and optionally `anchor` (a JSON pointer, such as `/steps/0`) or `memberId`.',
    '`spec_get` (`scope: main`, `selectors` such as `kind/Name`).',
  ];
  let failed = 0;
  for (const [text, expected] of cases) {
    const problems = check(text, 'case');
    if (!problems.some((p) => expected.test(p))) {
      failed++;
      console.error(`not caught: ${text}\n  got: ${problems.join('; ') || 'nothing'}`);
    }
  }
  for (const text of clean) {
    const problems = check(text, 'clean');
    if (problems.length > 0) {
      failed++;
      console.error(`false alarm: ${text}\n  got: ${problems.join('; ')}`);
    }
  }
  console.log(failed === 0 ? `Self-test ok: ${cases.length + clean.length} cases.` : `Self-test failed: ${failed}.`);
  return failed === 0;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest() ? 0 : 1);
}

const problems = files().flatMap((file) => check(readFileSync(join(repo, file), 'utf8'), relative(repo, join(repo, file))));
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  console.error(`${problems.length} problem(s) against scripts/tools.json (${tools.length} tools).`);
  process.exit(1);
}
console.log(`Skills, command, hook and README match scripts/tools.json (${tools.length} tools, ${files().length} files).`);
