// Calculators for the E-commerce Operations Atlas.
// Pure functions with no dependencies, so the same file runs in the browser (site)
// and in Node (tests, skill). Licensed under Apache-2.0 (see LICENSE).
//
// Conventions
// - Money is in USD unless the input name says otherwise (e.g. purchase_price_cny).
// - Each money line item is rounded to the cent, as on an invoice, and totals are
//   sums of the rounded lines. This keeps every shown line consistent with its total.
// - Rates are ratios (0.15 = 15%). Ratios in results are not rounded.
// - Every result carries its line items so the working can be shown.
// - These are teaching tools, not financial advice.

/** Round to the cent, half away from zero. */
export function cents(x) {
  const sign = x < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(x) + Number.EPSILON) * 100)) / 100;
}

function need(inputs, names, { positive = [] } = {}) {
  for (const n of names) {
    const v = inputs[n];
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new TypeError(`${n} must be a finite number`);
    if (v < 0) throw new RangeError(`${n} must not be negative`);
    if (positive.includes(n) && v === 0) throw new RangeError(`${n} must be greater than 0`);
  }
}

const sum = (lines) => cents(Object.values(lines).reduce((a, b) => a + b, 0));

/**
 * Landed cost per unit: purchase price (converted to USD) + first-mile freight
 * + duty (customs value x duty rate) + clearance fees + testing spread over the batch.
 * The customs value used here is the USD purchase price, a simplification for teaching.
 */
export function landedCost(i) {
  need(i, ['purchase_price_cny', 'fx_cny_per_usd', 'freight_per_unit', 'duty_rate', 'clearance_per_unit', 'testing_cost', 'batch_size'],
    { positive: ['fx_cny_per_usd', 'batch_size'] });
  const purchase = cents(i.purchase_price_cny / i.fx_cny_per_usd);
  const lines = {
    purchase,
    freight: cents(i.freight_per_unit),
    duty: cents(purchase * i.duty_rate),
    clearance: cents(i.clearance_per_unit),
    testing: cents(i.testing_cost / i.batch_size),
  };
  return { lines, total: sum(lines) };
}

/** Platform fees per unit: referral % x price + fulfilment fee + storage allocation. */
export function platformFees(i) {
  need(i, ['price', 'referral_rate', 'fulfilment_fee', 'storage_per_unit'], { positive: ['price'] });
  const lines = {
    referral: cents(i.price * i.referral_rate),
    fulfilment: cents(i.fulfilment_fee),
    storage: cents(i.storage_per_unit),
  };
  const total = sum(lines);
  return { lines, total, share_of_price: total / i.price };
}

/** Return loss per unit sold: return rate x average loss per returned unit. */
export function returnLoss(i) {
  need(i, ['return_rate', 'loss_per_return']);
  return cents(i.return_rate * i.loss_per_return);
}

/** Unit profit: price - landed cost - platform fees - ad cost per unit - return loss per unit. */
export function unitProfit(i) {
  need(i, ['price', 'ad_cost_per_unit'], { positive: ['price'] });
  const landed = landedCost(i).total;
  const fees = platformFees(i).total;
  const lines = {
    price: cents(i.price),
    landed_cost: -landed,
    platform_fees: -fees,
    ads: -cents(i.ad_cost_per_unit),
    returns: -returnLoss(i),
  };
  const total = sum(lines);
  return { lines, total, margin: total / i.price };
}

/**
 * Break-even ad cost: the unit profit before ads is the most you can spend on ads
 * per unit sold without losing money; as a share of price it is the break-even ACoS.
 */
export function breakEvenAdCost(i) {
  const before = unitProfit({ ...i, ad_cost_per_unit: 0 }).total;
  return { per_unit: before, acos: before / i.price };
}

/** Monthly profit = units x unit profit. Before fixed costs (salaries, rent, software ...). */
export function monthlyProfit(i) {
  need(i, ['units_per_month']);
  const per_unit = unitProfit(i).total;
  return { per_unit, units: i.units_per_month, total: cents(per_unit * i.units_per_month), before_fixed_costs: true };
}

/**
 * Reorder point = daily sales x (production + transit + receiving days) + safety stock,
 * with safety stock given as days of sales. Rounded up to whole units.
 */
export function reorderPoint(i) {
  need(i, ['daily_sales', 'production_days', 'transit_days', 'receiving_days', 'safety_days']);
  const lead_days = i.production_days + i.transit_days + i.receiving_days;
  const safety_stock = Math.ceil(i.daily_sales * i.safety_days - 1e-9);
  const lead_demand = Math.ceil(i.daily_sales * lead_days - 1e-9);
  return { lead_days, lead_demand, safety_stock, units: lead_demand + safety_stock };
}

/**
 * Cash needed for the first order, before any sale: per-unit purchase, freight, duty
 * and clearance for the whole batch, plus testing and an optional launch ad budget.
 * Amazon fees are charged later, out of sales, so they are not included.
 */
export function firstOrderCash(i) {
  need(i, ['batch_size', 'launch_ad_budget'], { positive: ['batch_size'] });
  const l = landedCost(i).lines;
  const lines = {
    purchase: cents(l.purchase * i.batch_size),
    freight: cents(l.freight * i.batch_size),
    duty: cents(l.duty * i.batch_size),
    clearance: cents(l.clearance * i.batch_size),
    testing: cents(i.testing_cost),
    launch_ads: cents(i.launch_ad_budget),
  };
  return { lines, total: sum(lines) };
}

/** Deterministic pseudo-random generator (mulberry32), so simulations are reproducible. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample from a triangular distribution (low, mode, high). */
function triangular(u, low, mode, high) {
  if (high === low) return low;
  const c = (mode - low) / (high - low);
  return u < c
    ? low + Math.sqrt(u * (high - low) * (mode - low))
    : high - Math.sqrt((1 - u) * (high - low) * (high - mode));
}

/**
 * Timeline. Time is always a range: each phase has low / typical / high days.
 * The total is the simple sum of lows, typicals and highs. With `simulations` > 0 it
 * also returns P50 / P90 from a Monte Carlo run (triangular distribution per phase,
 * phases independent), rounded up to whole days.
 */
export function timeline(phases, { simulations = 0, seed = 1 } = {}) {
  if (!Array.isArray(phases) || phases.length === 0) throw new TypeError('phases must be a non-empty list');
  for (const p of phases) {
    need(p, ['low', 'typical', 'high']);
    if (!(p.low <= p.typical && p.typical <= p.high)) throw new RangeError(`phase ${p.id ?? ''}: need low <= typical <= high`);
  }
  const total = {
    low: phases.reduce((a, p) => a + p.low, 0),
    typical: phases.reduce((a, p) => a + p.typical, 0),
    high: phases.reduce((a, p) => a + p.high, 0),
  };
  const result = { phases, total };
  if (simulations > 0) {
    const next = rng(seed);
    const runs = Array.from({ length: simulations }, () => phases.reduce((a, p) => a + triangular(next(), p.low, p.typical, p.high), 0));
    runs.sort((a, b) => a - b);
    const pct = (q) => Math.ceil(runs[Math.min(runs.length - 1, Math.floor(q * runs.length))] - 1e-9);
    result.monte_carlo = { simulations, p50: pct(0.5), p90: pct(0.9) };
  }
  return result;
}

/** Flatten example-case.yaml `inputs` ({ name: { value, ... } }) into { name: value }. */
export function inputsFromCase(exampleCase) {
  return Object.fromEntries(Object.entries(exampleCase.inputs).map(([k, v]) => [k, v.value]));
}
