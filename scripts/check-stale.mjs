// Lists rules whose next_review date has passed (or falls within --days N from today).
// Prints a Markdown report; with --json prints JSON. Exit code is always 0: this is a
// reminder, not a failure. Used by .github/workflows/stale-rules.yml.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const days = Number(args[args.indexOf('--days') + 1]) || 0;
const asJson = args.includes('--json');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
  const p = path.join(dir, d.name);
  return d.isDirectory() ? walk(p) : p.endsWith('.yaml') ? [p] : [];
});
const iso = (d) => d.toISOString().slice(0, 10);
const today = iso(new Date());
const limit = iso(new Date(Date.now() + days * 86400000));

const due = walk(path.join(ROOT, 'rules'))
  .map((f) => ({ file: path.relative(ROOT, f).split(path.sep).join('/'), ...yaml.load(fs.readFileSync(f, 'utf8'), { schema: yaml.JSON_SCHEMA }) }))
  .filter((r) => r.next_review <= limit)
  .sort((a, b) => a.next_review.localeCompare(b.next_review))
  .map((r) => ({ id: r.id, file: r.file, kind: r.kind, last_checked: r.last_checked, next_review: r.next_review, overdue: r.next_review < today, sources: r.sources.map((s) => s.url) }));

if (asJson) {
  console.log(JSON.stringify({ today, due }, null, 2));
} else if (!due.length) {
  console.log(`No rules due for review (checked ${today}${days ? `, looking ${days} days ahead` : ''}).`);
} else {
  console.log(`Rules due for review as of ${today}:\n`);
  console.log('| Rule | Kind | Last checked | Next review |\n|---|---|---|---|');
  for (const r of due) console.log(`| [\`${r.id}\`](../blob/main/${r.file}) | ${r.kind} | ${r.last_checked} | ${r.next_review}${r.overdue ? ' (overdue)' : ''} |`);
  console.log('\nFor each rule: open its sources, check whether anything changed, update the summary if needed, then set `last_checked` to today and move `next_review` forward. Sources must stay official pages first.');
}
