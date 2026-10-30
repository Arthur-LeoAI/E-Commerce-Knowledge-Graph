// One-time extraction of all content from legacy/index.html into data/*.yaml.
// The data files are the source of truth once they exist: this script refuses to
// overwrite them unless run with --force, so later edits are never lost by accident.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import yaml from 'js-yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const force = process.argv.includes('--force');

if (fs.existsSync(path.join(DATA, 'nodes')) && !force) {
  console.error('data/nodes already exists. Re-run with --force to overwrite (edits in data/ will be lost).');
  process.exit(1);
}

// --- read the prototype's constants -------------------------------------------------
const html = fs.readFileSync(path.join(ROOT, 'legacy', 'index.html'), 'utf8');
const start = html.indexOf('const AS_OF');
const end = html.indexOf('</script>', start);
const names = ['AS_OF', 'DOMAINS', 'NODES', 'EDGES', 'SOURCES', 'TOOLS', 'PHASES', 'EX', 'TOUR', 'GLOSS',
  'DOMAINS_EN', 'NODES_EN', 'EDGE_EN_LIST', 'EX_EN', 'TOUR_EN', 'GLOSS_EN', 'PHASES_EN', 'SOURCES_EN_O', 'TOOLS_EN', 'UI'];
const L = vm.runInNewContext(`${html.slice(start, end)}\n;({${names.join(',')}})`, {});

// --- mappings -------------------------------------------------------------------------
// Prototype domain letters -> readable keys. Order = main flow S..$ then support D.
const DOMAIN_KEY = { S: 'strategy', P: 'product', C: 'compliance', L: 'logistics', F: 'storefront',
  M: 'marketing', X: 'sales', $: 'finance', D: 'data_team' };

// Glossary: the zh and en lists are keyed differently. Pair them here.
// zh-only key -> en key of the same concept.
const GLOSS_PAIR = { '落地成本': 'landed cost', '头程': 'first-mile', '补货点': 'reorder point',
  '安全库存': 'safety stock', '转化率': 'conversion rate', '跟卖': 'hijackers' };
// zh keys that are aliases of another entry (same definition in the prototype).
const GLOSS_ZH_ALIAS = { '品牌备案': 'Brand Registry' };
// Entries that existed in one language only. The missing side is a translation of the
// existing side, added during extraction; flagged with `review: true` for the owner.
const GLOSS_ADDED = {
  '尾程': { en_term: 'last-mile', en: 'The leg from a warehouse in the destination country to the customer.' },
  'Unit Session Percentage': { zh_term: 'Unit Session Percentage', zh: 'Amazon 对转化率的叫法：订购件数 ÷ 访问次数。' },
};

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const bi = (en, zh) => ({ en, zh });

// --- build ----------------------------------------------------------------------------
const domains = L.DOMAINS.map((d, i) => ({
  id: DOMAIN_KEY[d.k],
  letter: d.k,
  code: d.code,
  colour: d.c,
  role: d.k === 'D' ? 'support' : 'main',
  order: i + 1,
  name: bi(L.DOMAINS_EN[d.k].name, d.name),
  desc: bi(L.DOMAINS_EN[d.k].desc, d.desc),
}));

const nodes = L.NODES.map((n, i) => {
  const e = L.NODES_EN[n.id];
  const node = {
    id: n.id,
    domain: DOMAIN_KEY[n.d],
    order: i + 1,
    name: bi(e.n, n.n),
    what: bi(e.what, n.what),
    how: bi(e.how, n.how),
    metrics: bi(e.m, n.m),
    example: bi(L.EX_EN[n.id], L.EX[n.id]),
    data_later: bi(e.data, n.data),
    rules: [],
  };
  // Market-rule text from the prototype. Step 2 of the work plan moves it into rules/.
  if (n.us || e.us) node.legacy_rule_note = { ...bi(e.us, n.us), sources: n.src || [] };
  return node;
});

const edges = L.EDGES.map(([from, to, zh], i) => ({ from, to, label: bi(L.EDGE_EN_LIST[i], zh) }));

const phases = L.PHASES.map((p, i) => ({
  order: i + 1,
  title: bi(L.PHASES_EN[i].t, p.t),
  output: bi(L.PHASES_EN[i].out, p.out),
  warning: bi(L.PHASES_EN[i].warn, p.warn),
  nodes: p.ids,
}));

const tour = L.TOUR.map((t, i) => {
  const e = L.TOUR_EN[i];
  const stop = { order: i + 1, domain: DOMAIN_KEY[t.d] };
  if (t.node) stop.node = t.node;
  // Stops without a title use the domain name in the prototype.
  if (t.title || e.title) stop.title = bi(e.title, t.title);
  stop.one_line = bi(e.one, t.one);
  stop.body_html = bi(e.ex, t.ex); // HTML; "__WATERFALL__" marks the unit-profit chart
  return stop;
});

const glossary = [];
const zhUsed = new Set();
for (const [enKey, enDef] of Object.entries(L.GLOSS_EN)) {
  const zhKey = Object.keys(GLOSS_PAIR).find((k) => GLOSS_PAIR[k] === enKey) ?? (enKey in L.GLOSS ? enKey : null);
  const entry = { id: slug(enKey) };
  if (zhKey) {
    zhUsed.add(zhKey);
    entry.term = bi(enKey, zhKey);
    entry.def = bi(enDef, L.GLOSS[zhKey]);
  } else {
    const a = GLOSS_ADDED[enKey];
    if (!a) throw new Error(`No zh glossary entry for "${enKey}"`);
    entry.term = bi(enKey, a.zh_term);
    entry.def = bi(enDef, a.zh);
    entry.review = true;
  }
  const zhAliases = Object.keys(GLOSS_ZH_ALIAS).filter((k) => GLOSS_ZH_ALIAS[k] === enKey);
  if (zhAliases.length) { entry.aliases = { zh: zhAliases }; zhAliases.forEach((k) => zhUsed.add(k)); }
  glossary.push(entry);
}
for (const [zhKey, zhDef] of Object.entries(L.GLOSS)) {
  if (zhUsed.has(zhKey)) continue;
  const a = GLOSS_ADDED[zhKey];
  if (!a) throw new Error(`No en glossary entry for "${zhKey}"`);
  glossary.push({ id: slug(a.en_term), term: bi(a.en_term, zhKey), def: bi(a.en, zhDef), review: true });
}

const sources = L.SOURCES.map((s, i) => ({
  id: s.id,
  title: s.t,
  publisher: bi(L.SOURCES_EN_O[i], s.o),
  url: s.u,
  accessed: L.AS_OF,
}));

const tools = L.TOOLS.map((t, i) => ({ name: bi(L.TOOLS_EN[i], t.t), url: t.u }));

const ui = Object.fromEntries(Object.keys(L.UI.en).map((k) => [k, bi(L.UI.en[k], L.UI.zh[k])]));

// --- write ----------------------------------------------------------------------------
const header = '# Extracted from legacy/index.html. Licensed under Apache-2.0 (see LICENSE).\n';
const write = (rel, obj) => {
  const file = path.join(DATA, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, header + yaml.dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' }));
};

fs.rmSync(path.join(DATA, 'nodes'), { recursive: true, force: true });
write('domains.yaml', domains);
nodes.forEach((n) => write(`nodes/${n.id}.yaml`, n));
write('edges.yaml', edges);
write('phases.yaml', phases);
write('tour.yaml', tour);
write('glossary.yaml', glossary);
write('sources.yaml', sources);
write('tools.yaml', tools);
write('ui.yaml', ui);

console.log(`domains ${domains.length}, nodes ${nodes.length}, edges ${edges.length}, phases ${phases.length}, ` +
  `tour ${tour.length}, glossary ${glossary.length}, sources ${sources.length}, tools ${tools.length}, ui ${Object.keys(ui).length}`);
