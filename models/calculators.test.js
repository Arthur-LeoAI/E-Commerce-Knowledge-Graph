// Regression tests: the running example in CLAUDE.md section 6 must be reproduced exactly.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import {
  cents, landedCost, platformFees, returnLoss, unitProfit, breakEvenAdCost,
  monthlyProfit, reorderPoint, firstOrderCash, timeline, inputsFromCase,
} from './calculators.js';

const file = path.resolve(import.meta.dirname, '..', 'data', 'example-case.yaml');
const ex = inputsFromCase(yaml.load(fs.readFileSync(file, 'utf8')));
const pct = (r) => Math.round(r * 100);

test('cents rounds half away from zero', () => {
  assert.equal(cents(2.9985), 3.0);
  assert.equal(cents(-0.7768), -0.78);
  assert.equal(cents(0.005), 0.01);
});

test('landed cost: $3.10 + $0.80 + $0.62 + $0.15 + $0.60 = $5.27', () => {
  const r = landedCost(ex);
  assert.deepEqual(r.lines, { purchase: 3.10, freight: 0.80, duty: 0.62, clearance: 0.15, testing: 0.60 });
  assert.equal(r.total, 5.27);
});

test('platform fees: $3.00 + $4.00 + $0.20 = $7.20 (about 36%)', () => {
  const r = platformFees(ex);
  assert.deepEqual(r.lines, { referral: 3.00, fulfilment: 4.00, storage: 0.20 });
  assert.equal(r.total, 7.20);
  assert.equal(pct(r.share_of_price), 36);
});

test('return loss: 3% x $10 = $0.30', () => {
  assert.equal(returnLoss(ex), 0.30);
});

test('unit profit: $4.82 (about 24%)', () => {
  const r = unitProfit(ex);
  assert.equal(r.total, 4.82);
  assert.equal(pct(r.margin), 24);
});

test('break-even ad cost: $7.22 before ads; $8.00 ads gives -$0.78', () => {
  assert.equal(breakEvenAdCost(ex).per_unit, 7.22);
  assert.equal(unitProfit({ ...ex, ad_cost_per_unit: 8 }).total, -0.78);
});

test('monthly profit: 300 x $4.82 = $1,446, before fixed costs', () => {
  const r = monthlyProfit(ex);
  assert.equal(r.total, 1446);
  assert.equal(r.before_fixed_costs, true);
});

test('reorder point: 10 x (25 + 35 + 10) + 10 x 14 = 840', () => {
  const r = reorderPoint(ex);
  assert.equal(r.lead_days, 70);
  assert.equal(r.safety_stock, 140);
  assert.equal(r.units, 840);
});

test('first-order cash: $5,270', () => {
  assert.equal(firstOrderCash(ex).total, 5270);
  assert.equal(firstOrderCash({ ...ex, launch_ad_budget: 1000 }).total, 6270);
});

test('promotion at $15.99: unit profit $1.42', () => {
  assert.equal(unitProfit({ ...ex, price: 15.99 }).total, 1.42);
});

test('timeline sums ranges and never collapses to one number', () => {
  // Synthetic test values, not part of the running example.
  const phases = [
    { id: 'a', low: 10, typical: 20, high: 40 },
    { id: 'b', low: 5, typical: 5, high: 5 },
  ];
  const r = timeline(phases, { simulations: 5000, seed: 42 });
  assert.deepEqual(r.total, { low: 15, typical: 25, high: 45 });
  const { p50, p90 } = r.monte_carlo;
  assert.ok(p50 >= 15 && p50 <= 45 && p90 >= p50 && p90 <= 45, `p50=${p50} p90=${p90}`);
  assert.deepEqual(timeline(phases, { simulations: 5000, seed: 42 }).monte_carlo, r.monte_carlo, 'same seed, same result');
});

test('inputs are checked', () => {
  assert.throws(() => landedCost({ ...ex, fx_cny_per_usd: 0 }), RangeError);
  assert.throws(() => platformFees({ ...ex, price: -1 }), RangeError);
  assert.throws(() => unitProfit({ ...ex, ad_cost_per_unit: undefined }), TypeError);
  assert.throws(() => timeline([{ low: 10, typical: 5, high: 20 }]), RangeError);
});
