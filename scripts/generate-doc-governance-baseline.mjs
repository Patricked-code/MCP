import { execFileSync } from 'node:child_process';
import { classifyMarkdownPath } from './doc-governance-lib.mjs';

const output = execFileSync('git', ['ls-files', '*.md'], {
  encoding: 'utf8',
  maxBuffer: 4 * 1024 * 1024
});

const paths = output
  .split(/\r?\n/)
  .map((path) => path.trim())
  .filter(Boolean)
  .sort();

const entries = paths.map((path) => ({ path, category: classifyMarkdownPath(path) }));
const unclassified = entries.filter((entry) => entry.category === null);

if (unclassified.length > 0) {
  console.error(`Markdown non classifiés: ${unclassified.map((entry) => entry.path).join(', ')}`);
  process.exit(1);
}

const categories = {};
for (const entry of entries) {
  categories[entry.category] = (categories[entry.category] || 0) + 1;
}

const baseline = {
  schemaVersion: 1,
  generatedBy: "git ls-files '*.md'",
  trackedCount: entries.length,
  categories,
  entries
};

process.stdout.write(`${JSON.stringify(baseline, null, 2)}\n`);
