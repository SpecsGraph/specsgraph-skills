#!/usr/bin/env node
// Regenerates scripts/tools.json, the snapshot of the SpecsGraph MCP tools that scripts/check-skills.mjs checks the
// skills against: per tool its name, whether it is read only, its argument names and the required ones.
//
// Usage: node scripts/gen-tools.mjs <path to the specsgraph monorepo>
//
// It imports the built tool registry (apps/mcp/dist/tools/registry.js), so build the mcp app in the monorepo
// first (pnpm --filter @specsgraph/mcp... build). The input schemas are zod objects; their keys are the arguments
// and a key whose schema is not optional is required. No dependency of its own.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = process.argv[2];
if (!root) {
  console.error('Usage: node scripts/gen-tools.mjs <path to the specsgraph monorepo>');
  process.exit(2);
}
const mcp = resolve(root, 'apps/mcp');
const registry = join(mcp, 'dist/tools/registry.js');
if (!existsSync(registry)) {
  console.error(`${registry} not found: build the mcp app first (pnpm --filter @specsgraph/mcp... build).`);
  process.exit(1);
}

// A source newer than its build means the snapshot could miss an argument; say so rather than guess.
const stale = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!entry.startsWith('__')) walk(path);
    } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
      const built = join(mcp, 'dist', path.slice(join(mcp, 'src').length).replace(/\.ts$/, '.js'));
      if (!existsSync(built) || statSync(built).mtimeMs < statSync(path).mtimeMs) stale.push(path);
    }
  }
})(join(mcp, 'src/tools'));
if (stale.length > 0) {
  console.warn(`Warning: ${stale.length} source file(s) newer than the build; rebuild if an input changed:`);
  for (const path of stale) console.warn(`  ${path}`);
}

const { TOOLS } = await import(pathToFileURL(registry).href);
const tools = TOOLS.map((tool) => {
  const shape = tool.input.shape;
  const inputs = Object.keys(shape);
  return {
    name: tool.name,
    readOnly: tool.group === 'read',
    inputs,
    required: inputs.filter((key) => !shape[key].isOptional()),
  };
});

let commit = 'unknown';
try {
  commit = execFileSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {}

// One tool per line keeps the diff of a changed argument to one line.
const body = tools.map((tool) => `    ${JSON.stringify(tool)}`).join(',\n');
const text = `{\n  "source": ${JSON.stringify(`specsgraph@${commit} apps/mcp/dist/tools/registry.js`)},\n  "tools": [\n${body}\n  ]\n}\n`;
const out = join(dirname(fileURLToPath(import.meta.url)), 'tools.json');
writeFileSync(out, text);
console.log(`Wrote ${tools.length} tools to ${out}.`);
