# E-commerce Operations Atlas

An open-source, beginner-first map of how e-commerce works: a knowledge graph of the whole business, market rules with sources, transparent calculators, and an AI skill. Free to use. The goal is to help someone with no experience understand the business and plan a first product realistically.

Owner: Arthur Li. Working language with the owner: Chinese. Repository content: English by default, with a full Chinese version.

---

## 1. Current state

`legacy/index.html` is a working single-file prototype (published as a private Claude artifact). **All content lives inside this one file** as JavaScript constants. It is the source material for the repository; do not edit it further, extract from it.

| Constant (Chinese) | Line approx. | English counterpart | Contents |
|---|---|---|---|
| `DOMAINS` | 329 | `DOMAINS_EN` | 9 business areas (key, code, colour token, name, description) |
| `NODES` | 340 | `NODES_EN` | 48 nodes: id, domain, name, `what`, `how[]`, metrics `m[]`, optional `us` rule text + `src[]` source ids, `data` (future data sources/methods) |
| `EDGES` | 398 | `EDGE_EN_LIST` (same order) | 106 directed influence edges `[from, to, label]` |
| `SOURCES` / `TOOLS` | 445 / 457 | `SOURCES_EN_O` / `TOOLS_EN` | 10 cited sources, 4 official lookup links |
| `PHASES` | 463 | `PHASES_EN` | 8 "start from zero" phases with linked node ids |
| `EX` | 475 | `EX_EN` | one worked example per node, all using the running case |
| `TOUR` | 525 | `TOUR_EN` | 9-stop beginner tour (stop 1 = product selection) |
| `GLOSS` | 546 | `GLOSS_EN` | ~45 glossary terms with one-line explanations |
| `UI` | 834 | (zh + en inside) | all interface strings |

Features in the prototype that the new site must keep:
- **Layered drill-down** (default): L1 = 8-step main flow + Data & Team as support; L2 = one domain's nodes ordered top-to-bottom, inputs from other domains on the left, outputs on the right; L3 = one node with direct causes (left), direct effects (right) and its "how" steps.
- **3D view** following the same three levels (canvas, no library).
- **Grouped view** (all 48 nodes at once) under an "Advanced" menu, with downstream/upstream chain highlighting and depth 1–3.
- **Beginner tour** with the running example, a unit-profit waterfall chart, and a finish page.
- **Node panel**: shows only "what it is" + "example" by default; everything else under "Show more".
- **Glossary tooltips** on hover/tap, case-insensitive in English.
- **Bilingual toggle**, English default, choice remembered.
- Light and dark themes; works at 400 px phone width.

## 2. Decisions already made (do not reopen without asking the owner)

1. **Scope of v1: Amazon US only.** One platform, one marketplace. The structure must allow adding more later.
2. **No opportunity screener / product ranking feature.** Reasons: scraping Amazon violates its terms; PA-API 5 is deprecated in favour of the Creators API, which is governed by the Associates agreements; SP-API data requires a seller account and cannot be freely redistributed; third-party data (e.g. Keepa) is paid and has its own terms; and a public ranking destroys the opportunity it shows. The product-selection *method* (scorecard) stays as educational content.
3. **Rules are split into two kinds:**
   - **Law** (`kind: law`): set by governments, applies to everyone selling into that jurisdiction regardless of platform. Has levels: US federal → US state; EU → member state.
   - **Platform rules** (`kind: platform`): set by a marketplace operator, apply only on that platform, and differ per marketplace site (Amazon US ≠ Amazon DE).
   - What a seller must follow = applicable laws + the platform rules of that specific marketplace. The site lets the user pick platform + marketplace and shows only the applicable combination. Nodes show which kind each rule is (e.g. "US law" vs "Amazon US").
4. **Calculators**: exact formulas where the maths is exact; **time is always a range** (low / typical / high), never a single number; every default value is labelled **Example** and the user replaces it with their own numbers.
5. **Benchmarks ("healthy ranges")**: include a range **only if it has a cited source**, plus the category it applies to. Present as "commonly cited range", never as a guarantee. Leave a metric empty rather than invent a number. Never tell users something is "risk-free"; only "outside the commonly cited range, check this".
6. **Bilingual**: every user-facing string and every content field has `en` and `zh`. English is the default.
7. **Licence**: the whole repository (code, content and data) is under **Apache License 2.0**, as set when the GitHub repository was created. One `LICENSE` file at the root plus a `NOTICE` file (project name, copyright holder, attribution request). Apache 2.0 is permissive: reusers must keep the licence and NOTICE and state changes, but there is no share-alike. Third-party sources are only cited and linked, never copied in bulk.
8. **Hosting**: static site on **GitHub Pages**, generated from the data files. Discussion via GitHub Discussions, corrections via Issues and Pull Requests. Repository: https://github.com/Arthur-LeoAI/E-Commerce-Knowledge-Graph (public).
9. **Open now, commercial use kept possible later.** Everything is open source today; possible commercial use is decided later by the owner. To keep that path open:
   - The owner (Arthur Li) holds the copyright of their own work; Apache 2.0 allows anyone, including the owner, to use it commercially.
   - Outside contributions are accepted under Apache 2.0 ("inbound = outbound", licence section 5) with a DCO sign-off (`Signed-off-by:` line). Whether to require a CLA instead (needed only if the owner ever wants to relicense contributors' work under terms other than Apache 2.0) is an **open decision for the owner, to be made before the first outside pull request is merged**.
   - The project name and logo are not licensed (licence section 6, stated in `NOTICE`).
   - Keep a clean boundary: data, models and site stay generic and reusable, so any later paid offering can be built as a separate layer on top without changing this repository's licence.
   - Never add dependencies or content under licences incompatible with Apache 2.0 or with commercial use (e.g. non-commercial CC licences, GPL code inside the shipped site); check each dependency's licence before adding it.

## 3. Non-negotiable principles

- Use current information from reputable sources (official government and platform pages first). No speculation.
- Every rule carries a source URL, publisher, the date it was checked, and a next-review date.
- Never invent numbers. Illustrative numbers are always labelled as examples.
- Never use any data or internal material from the owner's employer. Use only public information and the fictional running example.
- No personal customer data anywhere. Any future real data must be aggregated.
- The site and skill state clearly that this is not legal, tax or financial advice.

## 4. Target repository structure

```
ecommerce-atlas/
├── CLAUDE.md
├── README.md                 (en) + README.zh.md
├── LICENSE                   Apache License 2.0 (already in the GitHub repo)
├── NOTICE                    copyright + attribution notice required by Apache 2.0
├── CONTRIBUTING.md           how to propose changes; rule changes need a source; DCO sign-off
├── DISCLAIMER.md
├── data/
│   ├── domains.yaml
│   ├── nodes/                one file per node, e.g. landed_cost.yaml
│   ├── edges.yaml
│   ├── glossary.yaml
│   ├── tour.yaml
│   ├── phases.yaml
│   ├── tools.yaml            official lookup links
│   ├── ui.yaml               all interface strings
│   ├── pages.yaml            longer page texts (HTML): start intro, data roadmap, rules/sources/calculator intros, not-advice note
│   └── example-case.yaml     the running example's inputs (all labelled example)
├── scripts/                  validate.mjs (npm run validate); extract-legacy.mjs (one-time, done)
├── rules/
│   ├── law/
│   │   └── us/               federal rules; states in us/<state>/ when needed
│   └── platform/
│       └── amazon/
│           └── us/
├── benchmarks/               one file per metric; empty is acceptable
├── models/                   calculators as pure functions (TypeScript or plain JS) + tests
├── schemas/                  JSON Schema for every data type; CI validates all data
├── site/                     static site source: index.html (layout + CSS) and app.js (logic ported from the prototype).
│                             `npm run build` writes dist/ (gitignored): atlas-data.js is generated from data/ + rules/,
│                             calculators.js is copied from models/. `npm run serve` previews at localhost:8080.
│                             No external fonts or scripts (system font stack), so no visitor data goes to third parties.
├── skill/                    SKILL.md + any helper scripts
└── .github/workflows/        validate data, run tests, check for stale rules, deploy Pages
```

## 5. Data schemas (starting point; refine in `schemas/`)

**Node**
```yaml
id: landed_cost
domain: finance            # S P C L F M X $ D  -> use readable keys
name: { en: Landed cost, zh: 落地成本 }
what: { en: ..., zh: ... }
how: { en: [...], zh: [...] }
metrics: { en: [...], zh: [...] }
example: { en: ..., zh: ... }          # uses the running case
data_later: { en: ..., zh: ... }
rules: [law/us/tariffs-2026, platform/amazon/us/fba-fees-2026]
```

**Edge**: `from`, `to`, `label: {en, zh}`, optional `type` (`formula` | `influence`), so exact relations can be told apart from qualitative ones.

**Rule**
```yaml
id: law/us/de-minimis-suspension
kind: law                  # law | platform
jurisdiction: us           # law: us, us-ca, eu, de ...
platform: null             # platform rules: amazon
marketplace: null          # platform rules: us, de ...
topic: customs             # customs, tariff, sales-tax, product-safety, fees, account, listing, reviews ...
applies_to: all            # or a list of categories
summary: { en: ..., zh: ... }
effective_date: 2026-06-24
sources:
  - { title: ..., publisher: ..., url: ..., accessed: 2026-10-30 }
last_checked: 2026-10-30
next_review: 2027-01-30
status: active             # active | superseded | pending
```

**Benchmark**: `metric`, `low`, `high`, `unit`, `category`, `sources[]`, `note {en,zh}`, `last_checked`. Allowed to be absent.

## 6. Calculators (v1)

Pure functions, unit-tested, used by both the site and the skill. Inputs default to the running example and are labelled Example.

| Model | Formula / logic |
|---|---|
| Landed cost | purchase price (FX-converted) + first-mile freight + duty (value × rate) + clearance fees + (testing & certification ÷ batch size) |
| Platform fees | referral % × price + fulfilment fee + storage allocation (fee inputs come from `rules/platform/amazon/us`, always overridable) |
| Unit profit | price − landed cost − platform fees − ad cost per unit − return loss per unit |
| Break-even ad cost | unit profit before ads; also as % of price (break-even ACoS) |
| Monthly profit | units × unit profit (state clearly: before fixed costs) |
| Reorder point | daily sales × (production + transit + receiving days) + safety stock |
| First-order cash | purchase + freight + duty + fees + testing (+ optional launch ad budget) |
| Timeline | each phase as low / typical / high days; total shown as a range (simple sum of lows/highs, plus an optional Monte Carlo P50/P90) |

**Regression test with the running example** (collapsible silicone cup, all numbers illustrative): price $19.99; purchase ¥22 at 7.1 CNY/USD = $3.10; freight $0.80; duty 20% example rate = $0.62; clearance $0.15; testing $600 / 1,000 units = $0.60 → **landed cost $5.27**. Referral 15% = $3.00, FBA fee $4.00, storage $0.20 → **platform fees $7.20 (≈36%)**. Returns 3% × $10 = $0.30; ads $2.40 → **unit profit $4.82 (≈24%)**. Before ads **$7.22**; ads $8.00 → **−$0.78**. 300 units/month → **$1,446**. Daily sales 10, 25+35+10 days + 14 safety → **reorder point 840**. First order **$5,270**. Promo at $15.99 → unit profit **$1.42**. Tests must reproduce these.

Implemented in `models/calculators.js` (plain JS, no dependencies, runs in browser and Node); tests in `models/calculators.test.js` (`npm test`, also in CI). Inputs come from `data/example-case.yaml`. Conventions: each money line item is rounded to the cent and totals sum the rounded lines (this is what makes 300 × $4.82 = $1,446); safety stock is entered as days of sales; first-order cash excludes Amazon fees, which are charged later out of sales. Open: the example has single values for production / transit / receiving days; the timeline needs low / typical / high, so example ranges are still to be chosen by the owner (do not invent them). Fee rules in `rules/` are text only; the calculator takes fee inputs directly and the site links to the rule.

## 7. Market rules: `rules/` is the source of truth

All rule facts now live in `rules/` (24 files, researched 2026-10-30 from official pages first: 16 in `law/us/` incl. `law/us/ca/prop-65`, 8 in `platform/amazon/us/`). Each carries its sources, `last_checked` and `next_review`. Nodes link to them via `rules:`. Do not restate rule facts elsewhere; update the rule file and its dates instead.

Corrections found while sourcing (versus the prototype text):
- Duty rates are set at the **8-digit** HTSUS level; the 10-digit code adds a statistical suffix.
- The 2026 Amazon US fee update changed FBA and other fees but **not referral fee rates**. A 3.5% fuel and logistics surcharge on FBA fulfilment fees applies since 2026-04-17; holiday peak fees 2026-10-15 to 2027-01-14.
- Amazon's ODR, cancellation and late-shipment targets apply to seller-fulfilled orders, not FBA.
- CPSC eFiling: foreign-trade-zone entries from 2027-01-08 (others 2026-07-08).
- "Marketplace facilitator laws in every sales-tax state" is confirmed only by tax-industry sources; the rule says so.

Open items: which trademark offices Amazon Brand Registry accepts is only visible after login (`brand-registry.yaml` says this). The running example's $4.00 FBA fee is illustrative; the 2026 official table gives other amounts depending on size tier, weight and price.

## 8. AI skill (v1)

`skill/SKILL.md`, reading the same data files. It should:
- explain any node in the user's language, with the example;
- list the applicable rules for a chosen platform + marketplace, separated into law and platform rules, each with its source and last-checked date, and warn when a rule is past `next_review`;
- run the calculators on the user's numbers and show the working;
- compare results with benchmarks only where a sourced benchmark exists;
- always include the not-advice disclaimer.

Implemented: `skill/SKILL.md` (instructions) + `skill/atlas.mjs` (JSON helper: `search`, `node`, `rules`, `calc`, `benchmarks`, `markets`), tested by `skill/atlas.test.mjs` (in `npm test`). The helper imports `models/calculators.js`, so the skill and the site always compute the same numbers.

## 9. Order of work

1. Scaffold the repo, schemas and CI validation. Extract all content from `legacy/index.html` into data files (both languages). Add a check that every node, edge and glossary entry has `en` and `zh`.
2. Re-split the US rule texts into `rules/law/us/` and `rules/platform/amazon/us/`; add sources for the "need a source" items (research official pages first).
3. Build `models/` with tests that reproduce section 6.
4. Build the static site from the data (port the prototype's features), add the calculator page, and the platform + marketplace selector.
5. Write `skill/SKILL.md`.
6. README (en + zh), CONTRIBUTING, DISCLAIMER, NOTICE (licence is Apache 2.0, already present); GitHub Pages deploy workflow; a scheduled workflow that opens an Issue when a rule passes `next_review`.
Status: steps 1–6 are done (v1). Workflows: `validate.yml` (validate, test, build on push/PR), `pages.yml` (deploy `dist/` to GitHub Pages on push to main; needs Pages source set to "GitHub Actions" in the repo settings), `stale-rules.yml` (daily; opens or updates one Issue labelled `rule-review` listing rules past `next_review`; `npm run stale` locally).

Open decisions for the owner:
- Example timeline ranges (low / typical / high) for production, transit and receiving; the calculator leaves them blank until then.
- DCO only, or a CLA, before the first outside pull request is merged (section 2.9).
- Whether to enable GitHub Discussions (docs currently point to Issues).
- Review the two glossary entries marked `review: true` (last-mile, Unit Session Percentage).
