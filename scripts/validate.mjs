// Validates every data file against its JSON Schema, then checks cross-references
// and that every user-facing text exists in both English and Chinese.
// Exit code 1 on any error; warnings (e.g. rules past next_review) do not fail.
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const ROOT = path.resolve(import.meta.dirname, '..');
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');
const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${rel(file)}: ${msg}`);

// --- schemas --------------------------------------------------------------------------
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const schemaDir = path.join(ROOT, 'schemas');
for (const f of fs.readdirSync(schemaDir).filter((f) => f.endsWith('.schema.json'))) {
  ajv.addSchema(JSON.parse(fs.readFileSync(path.join(schemaDir, f), 'utf8')), f);
}
const check = (schema, value, file, where = '') => {
  const validate = ajv.getSchema(`${schema}.schema.json`);
  if (!validate(value)) {
    for (const e of validate.errors) err(file, `${where}${e.instancePath || '/'} ${e.message}`);
  }
};

// --- loading --------------------------------------------------------------------------
const load = (file) => {
  try {
    // JSON_SCHEMA keeps dates as strings, matching the "date" format in the schemas.
    return yaml.load(fs.readFileSync(file, 'utf8'), { schema: yaml.JSON_SCHEMA });
  } catch (e) {
    err(file, `cannot parse YAML: ${e.message}`);
    return undefined;
  }
};
const walk = (dir) => (fs.existsSync(dir)
  ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : p.endsWith('.yaml') ? [p] : [];
  })
  : []);
const data = (name) => path.join(ROOT, 'data', name);
const loadList = (name, schema) => {
  const file = data(name);
  const list = load(file);
  if (!Array.isArray(list)) { err(file, 'expected a list'); return []; }
  list.forEach((item, i) => check(schema, item, file, `[${i}]`));
  return list;
};

const domains = loadList('domains.yaml', 'domain');
const edges = loadList('edges.yaml', 'edge');
const phases = loadList('phases.yaml', 'phase');
const tour = loadList('tour.yaml', 'tour');
const glossary = loadList('glossary.yaml', 'glossary');
const sources = loadList('sources.yaml', 'source');
loadList('tools.yaml', 'tool');
const ui = load(data('ui.yaml'));
check('ui', ui, data('ui.yaml'));

const nodes = walk(data('nodes')).map((file) => {
  const node = load(file);
  check('node', node, file);
  if (node && path.basename(file, '.yaml') !== node.id) err(file, `file name must equal id "${node.id}"`);
  return { file, node };
}).filter((x) => x.node);

const rules = walk(path.join(ROOT, 'rules')).map((file) => {
  const rule = load(file);
  check('rule', rule, file);
  const expected = rel(file).replace(/^rules\//, '').replace(/\.yaml$/, '');
  if (rule && rule.id !== expected) err(file, `id must equal its path "${expected}"`);
  if (rule && !rule.id.startsWith(`${rule.kind}/`)) err(file, `id must start with "${rule.kind}/"`);
  return { file, rule };
}).filter((x) => x.rule);

walk(path.join(ROOT, 'benchmarks')).forEach((file) => check('benchmark', load(file), file));

// --- uniqueness and cross-references --------------------------------------------------
const unique = (items, key, file, what) => {
  const seen = new Set();
  for (const it of items) {
    const k = key(it);
    if (seen.has(k)) err(file, `duplicate ${what} "${k}"`);
    seen.add(k);
  }
  return seen;
};
const domainIds = unique(domains, (d) => d.id, data('domains.yaml'), 'domain id');
const nodeIds = unique(nodes, (x) => x.node.id, data('nodes'), 'node id');
const sourceIds = unique(sources, (s) => s.id, data('sources.yaml'), 'source id');
const ruleIds = new Set(rules.map((x) => x.rule.id));
unique(edges, (e) => `${e.from} -> ${e.to}`, data('edges.yaml'), 'edge');
unique(glossary, (g) => g.id, data('glossary.yaml'), 'glossary id');
unique(glossary.flatMap((g) => [g.term.en.toLowerCase(), ...(g.aliases?.en ?? []).map((a) => a.toLowerCase())]),
  (t) => t, data('glossary.yaml'), 'English term');
unique(glossary.flatMap((g) => [g.term.zh, ...(g.aliases?.zh ?? [])]), (t) => t, data('glossary.yaml'), 'Chinese term');

for (const { file, node } of nodes) {
  if (!domainIds.has(node.domain)) err(file, `unknown domain "${node.domain}"`);
  for (const r of node.rules ?? []) if (!ruleIds.has(r)) err(file, `unknown rule "${r}"`);
  for (const s of node.legacy_rule_note?.sources ?? []) if (!sourceIds.has(s)) err(file, `unknown source id ${s}`);
}
edges.forEach((e, i) => {
  for (const end of [e.from, e.to]) if (!nodeIds.has(end)) err(data('edges.yaml'), `[${i}] unknown node "${end}"`);
  if (e.from === e.to) err(data('edges.yaml'), `[${i}] edge points to itself`);
});
phases.forEach((p, i) => p.nodes.forEach((n) => { if (!nodeIds.has(n)) err(data('phases.yaml'), `[${i}] unknown node "${n}"`); }));
tour.forEach((t, i) => {
  if (!domainIds.has(t.domain)) err(data('tour.yaml'), `[${i}] unknown domain "${t.domain}"`);
  if (t.node && !nodeIds.has(t.node)) err(data('tour.yaml'), `[${i}] unknown node "${t.node}"`);
});

// --- bilingual completeness -----------------------------------------------------------
// Schemas already require en + zh on known fields; this walk catches any object anywhere
// that has one language but not the other, and lists whose two languages differ in length.
const bilingual = (value, file, where) => {
  if (Array.isArray(value)) { value.forEach((v, i) => bilingual(v, file, `${where}[${i}]`)); return; }
  if (!value || typeof value !== 'object') return;
  const hasEn = 'en' in value;
  const hasZh = 'zh' in value;
  if (hasEn !== hasZh) err(file, `${where || '/'} has ${hasEn ? 'en' : 'zh'} but not ${hasEn ? 'zh' : 'en'}`);
  if (hasEn && hasZh) {
    const blank = (v) => v === '' || v === null || (Array.isArray(v) && v.length === 0);
    if (blank(value.en) !== blank(value.zh)) err(file, `${where || '/'} is empty in one language only`);
    if (Array.isArray(value.en) && Array.isArray(value.zh) && value.en.length !== value.zh.length) {
      err(file, `${where || '/'} has ${value.en.length} en items but ${value.zh.length} zh items`);
    }
  }
  for (const [k, v] of Object.entries(value)) {
    if (k !== 'aliases') bilingual(v, file, `${where}/${k}`); // aliases are per language by design
  }
};
for (const name of ['domains.yaml', 'edges.yaml', 'phases.yaml', 'tour.yaml', 'glossary.yaml', 'sources.yaml', 'tools.yaml', 'ui.yaml']) {
  bilingual(load(data(name)), data(name), '');
}
nodes.forEach(({ file, node }) => bilingual(node, file, ''));
rules.forEach(({ file, rule }) => bilingual(rule, file, ''));

// --- freshness (warning only) ---------------------------------------------------------
const today = new Date().toISOString().slice(0, 10);
for (const { file, rule } of rules) {
  if (rule.next_review && rule.next_review < today) warnings.push(`${rel(file)}: past next_review (${rule.next_review})`);
}

// --- report ---------------------------------------------------------------------------
const review = glossary.filter((g) => g.review).length;
const pendingNotes = nodes.filter((x) => x.node.legacy_rule_note).length;
console.log(`Checked: ${domains.length} domains, ${nodes.length} nodes, ${edges.length} edges, ${phases.length} phases, ` +
  `${tour.length} tour stops, ${glossary.length} glossary entries, ${sources.length} sources, ${Object.keys(ui ?? {}).length} UI strings, ${rules.length} rules.`);
if (review) console.log(`Note: ${review} glossary entries are marked review: true (one language translated during extraction).`);
if (pendingNotes) console.log(`Note: ${pendingNotes} nodes still carry legacy_rule_note (to move into rules/ in step 2).`);
warnings.forEach((w) => console.log(`WARNING ${w}`));
if (errors.length) {
  errors.forEach((e) => console.error(`ERROR ${e}`));
  console.error(`\n${errors.length} error(s).`);
  process.exit(1);
}
console.log('All data valid.');
