#!/usr/bin/env node
// Helper for the E-commerce Operations Atlas skill. Reads the same data files as the
// site (data/, rules/, benchmarks/) and runs the same calculators (models/), so answers
// match the site exactly. Output is JSON. Licensed under Apache-2.0 (see LICENSE).
//
//   node skill/atlas.mjs search <text>
//   node skill/atlas.mjs node <id>                      [--platform amazon --marketplace us]
//   node skill/atlas.mjs rules [--topic <topic>]        [--platform amazon --marketplace us]
//   node skill/atlas.mjs calc [name=value ...] [--phase production=20,25,35 ...]
//   node skill/atlas.mjs benchmarks [metric]
//   node skill/atlas.mjs markets
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import * as Calc from '../models/calculators.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => yaml.load(fs.readFileSync(f, 'utf8'), { schema: yaml.JSON_SCHEMA });
const walk = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : p.endsWith('.yaml') ? [p] : [];
  })
  : []);

export function loadAtlas(root = ROOT) {
  const nodes = walk(path.join(root, 'data', 'nodes')).map(read).sort((a, b) => a.order - b.order);
  return {
    domains: read(path.join(root, 'data', 'domains.yaml')),
    nodes,
    edges: read(path.join(root, 'data', 'edges.yaml')),
    glossary: read(path.join(root, 'data', 'glossary.yaml')),
    exampleCase: read(path.join(root, 'data', 'example-case.yaml')),
    disclaimer: read(path.join(root, 'data', 'pages.yaml')).not_advice,
    rules: walk(path.join(root, 'rules')).map(read).sort((a, b) => a.id.localeCompare(b.id)),
    benchmarks: walk(path.join(root, 'benchmarks')).map(read),
  };
}

export const todayISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Markets that have platform rules, e.g. [{ platform: 'amazon', marketplace: 'us' }]. */
export function markets(atlas) {
  const seen = new Map();
  for (const r of atlas.rules) if (r.kind === 'platform') seen.set(`${r.platform}/${r.marketplace}`, { platform: r.platform, marketplace: r.marketplace });
  return [...seen.values()];
}

/** Law of the destination country (incl. its states) + platform rules of that exact marketplace. */
export function applies(rule, { platform, marketplace }) {
  return rule.kind === 'law'
    ? rule.jurisdiction === marketplace || rule.jurisdiction.startsWith(`${marketplace}-`)
    : rule.platform === platform && rule.marketplace === marketplace;
}

const ruleView = (r, today) => ({
  id: r.id,
  kind: r.kind,
  jurisdiction: r.jurisdiction,
  platform: r.platform,
  marketplace: r.marketplace,
  topic: r.topic,
  status: r.status,
  summary: r.summary,
  effective_date: r.effective_date ?? null,
  last_checked: r.last_checked,
  next_review: r.next_review,
  past_review: r.next_review < today,
  sources: r.sources,
});

export function rulesFor(atlas, market, { topic, today = todayISO() } = {}) {
  const rs = atlas.rules.filter((r) => applies(r, market) && (!topic || r.topic === topic)).map((r) => ruleView(r, today));
  return { market, today, law: rs.filter((r) => r.kind === 'law'), platform: rs.filter((r) => r.kind === 'platform') };
}

export function search(atlas, text) {
  const q = text.toLowerCase();
  const hit = (...xs) => xs.some((x) => String(x ?? '').toLowerCase().includes(q));
  return {
    nodes: atlas.nodes.filter((n) => hit(n.id, n.name.en, n.name.zh)).map((n) => ({ id: n.id, name: n.name })),
    glossary: atlas.glossary.filter((g) => hit(g.term.en, g.term.zh, ...(g.aliases?.en ?? []), ...(g.aliases?.zh ?? []))),
  };
}

export function nodeInfo(atlas, id, market, { today = todayISO() } = {}) {
  const n = atlas.nodes.find((x) => x.id === id);
  if (!n) return null;
  const name = (nid) => atlas.nodes.find((x) => x.id === nid)?.name;
  const rules = n.rules.map((rid) => atlas.rules.find((r) => r.id === rid)).filter((r) => r && applies(r, market));
  return {
    ...n,
    domain_name: atlas.domains.find((d) => d.id === n.domain)?.name,
    causes: atlas.edges.filter((e) => e.to === id).map((e) => ({ from: e.from, name: name(e.from), label: e.label })),
    effects: atlas.edges.filter((e) => e.from === id).map((e) => ({ to: e.to, name: name(e.to), label: e.label })),
    rules: rules.map((r) => ruleView(r, today)),
    example_note: atlas.exampleCase.note,
  };
}

/**
 * Runs every calculator. `overrides` replaces example inputs; each input in the result
 * says whether it is still the example value. Timeline only runs for phases given in full.
 */
export function calculate(atlas, overrides = {}, phases = []) {
  const example = Calc.inputsFromCase(atlas.exampleCase);
  for (const k of Object.keys(overrides)) if (!(k in example)) throw new Error(`Unknown input "${k}". Known: ${Object.keys(example).join(', ')}`);
  const v = { ...example, ...overrides };
  const inputs = Object.fromEntries(Object.entries(atlas.exampleCase.inputs).map(([k, def]) =>
    [k, { value: v[k], unit: def.unit, label: def.label, is_example: !(k in overrides) }]));
  const results = {
    landed_cost: Calc.landedCost(v),
    platform_fees: Calc.platformFees(v),
    unit_profit: Calc.unitProfit(v),
    break_even_ad_cost: Calc.breakEvenAdCost(v),
    monthly_profit: Calc.monthlyProfit(v),
    reorder_point: Calc.reorderPoint(v),
    first_order_cash: Calc.firstOrderCash(v),
  };
  if (phases.length) results.timeline = Calc.timeline(phases, { simulations: 5000, seed: 1 });
  return {
    inputs,
    all_example: Object.keys(overrides).length === 0,
    results,
    conventions: 'Money lines are rounded to the cent and totals add the rounded lines. Monthly profit is before fixed costs. First-order cash excludes Amazon fees, which are taken out of sales later. Time is a range (low / typical / high), never one number.',
    example_note: atlas.exampleCase.note,
    disclaimer: atlas.disclaimer,
  };
}

/** Sourced benchmarks only. An empty list means: do not compare against any range. */
export function benchmarks(atlas, metric) {
  const list = atlas.benchmarks.filter((b) => !metric || b.metric === metric);
  return { benchmarks: list, note: list.length ? 'Commonly cited ranges with sources; not guarantees.' : 'No sourced benchmark exists for this metric. Do not state or invent a healthy range.' };
}

// --- CLI --------------------------------------------------------------------------------
function parseArgs(argv) {
  const flags = {}; const rest = []; const phases = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--phase') {
      const [id, nums] = (argv[++i] ?? '').split('=');
      const [low, typical, high] = (nums ?? '').split(',').map(Number);
      phases.push({ id, low, typical, high });
    } else if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
    else rest.push(a);
  }
  return { flags, rest, phases };
}

function main(argv) {
  const [cmd, ...args] = argv;
  const { flags, rest, phases } = parseArgs(args);
  const atlas = loadAtlas();
  const market = { platform: flags.platform ?? 'amazon', marketplace: flags.marketplace ?? 'us' };
  const known = markets(atlas);
  if (['node', 'rules'].includes(cmd) && !known.some((m) => m.platform === market.platform && m.marketplace === market.marketplace)) {
    return { error: `No rules for ${market.platform}/${market.marketplace} yet.`, available_markets: known };
  }
  switch (cmd) {
    case 'search': return search(atlas, rest.join(' '));
    case 'node': return nodeInfo(atlas, rest[0], market) ?? { error: `No node "${rest[0]}". Try: search <text>.` };
    case 'rules': return { ...rulesFor(atlas, market, { topic: flags.topic }), disclaimer: atlas.disclaimer };
    case 'calc': {
      const overrides = Object.fromEntries(rest.map((kv) => {
        const [k, val] = kv.split('=');
        const n = Number(val);
        if (!k || val === undefined || !Number.isFinite(n)) throw new Error(`Expected name=number, got "${kv}"`);
        return [k, n];
      }));
      return calculate(atlas, overrides, phases);
    }
    case 'benchmarks': return benchmarks(atlas, rest[0]);
    case 'markets': return { markets: known };
    default: return { usage: 'search <text> | node <id> | rules [--topic t] | calc [name=value ...] [--phase id=low,typical,high] | benchmarks [metric] | markets; add --platform amazon --marketplace us' };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(main(process.argv.slice(2)), null, 2));
  } catch (e) {
    console.log(JSON.stringify({ error: e.message }, null, 2));
    process.exitCode = 1;
  }
}
