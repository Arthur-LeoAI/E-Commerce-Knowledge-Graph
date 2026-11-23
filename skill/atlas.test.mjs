// Tests for the skill helper: it must give the same answers as the site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadAtlas, markets, rulesFor, search, nodeInfo, calculate, benchmarks } from './atlas.mjs';

const atlas = loadAtlas();
const US = { platform: 'amazon', marketplace: 'us' };

test('markets come from platform rules', () => {
  assert.deepEqual(markets(atlas), [US]);
});

test('rules split into law and platform; state law included for the country', () => {
  const r = rulesFor(atlas, US, { today: '2026-11-23' });
  assert.ok(r.law.length > 0 && r.platform.length > 0);
  assert.ok(r.law.every((x) => x.kind === 'law' && x.jurisdiction.startsWith('us')));
  assert.ok(r.platform.every((x) => x.platform === 'amazon' && x.marketplace === 'us'));
  assert.ok(r.law.some((x) => x.jurisdiction === 'us-ca'));
  assert.equal(r.law.length + r.platform.length, atlas.rules.length);
});

test('past_review is flagged after next_review', () => {
  const later = rulesFor(atlas, US, { today: '2099-01-01' });
  assert.ok([...later.law, ...later.platform].every((x) => x.past_review));
});

test('another marketplace gets no Amazon US rules', () => {
  const r = rulesFor(atlas, { platform: 'amazon', marketplace: 'de' });
  assert.equal(r.platform.length, 0);
  assert.equal(r.law.length, 0);
});

test('search finds nodes in both languages', () => {
  assert.deepEqual(search(atlas, '落地成本').nodes.map((n) => n.id), ['landed_cost']);
  assert.deepEqual(search(atlas, 'Landed').nodes.map((n) => n.id), ['landed_cost']);
});

test('node info includes causes, effects and applicable rules', () => {
  const n = nodeInfo(atlas, 'tariff', US);
  assert.ok(n.causes.length + n.effects.length > 0);
  assert.deepEqual(n.rules.map((r) => r.id).sort(), ['law/us/hts-duty-rates', 'law/us/tariffs-2026']);
  assert.equal(nodeInfo(atlas, 'nope', US), null);
});

test('calculator: example values reproduce the running example and are marked as examples', () => {
  const c = calculate(atlas);
  assert.equal(c.all_example, true);
  assert.equal(c.results.landed_cost.total, 5.27);
  assert.equal(c.results.unit_profit.total, 4.82);
  assert.equal(c.results.monthly_profit.total, 1446);
  assert.equal(c.results.reorder_point.units, 840);
  assert.ok(c.disclaimer.en && c.disclaimer.zh);
});

test('calculator: user values replace examples and are marked', () => {
  const c = calculate(atlas, { price: 15.99 });
  assert.equal(c.inputs.price.is_example, false);
  assert.equal(c.inputs.fulfilment_fee.is_example, true);
  assert.equal(c.results.unit_profit.total, 1.42);
  assert.throws(() => calculate(atlas, { nope: 1 }), /Unknown input/);
});

test('benchmarks: none sourced yet, so nothing to compare against', () => {
  const b = benchmarks(atlas);
  assert.equal(b.benchmarks.length, atlas.benchmarks.length);
  if (!b.benchmarks.length) assert.match(b.note, /Do not state or invent/);
});
