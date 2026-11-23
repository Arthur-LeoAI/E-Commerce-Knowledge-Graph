# E-commerce Operations Atlas

**English** · [中文](README.zh.md)

A free, open-source, beginner-first map of how e-commerce works. It is meant for someone with no experience who wants to understand the business and plan a first product realistically.

- **Knowledge graph**: 48 points across 9 business areas (strategy, product, compliance, logistics, storefront, marketing, sales, finance, data & team) and 106 cause-and-effect links between them. Every point has a plain explanation and a worked example.
- **Market rules with sources**: 24 rules for selling on Amazon US, split into **laws** (US federal and state) and **platform rules** (Amazon US). Every rule lists its sources, the date it was checked and the date it is due for review.
- **Transparent calculators**: landed cost, platform fees, unit profit, break-even ad cost, monthly profit, reorder point, first-order cash and timeline. Each one shows its working.
- **AI skill**: lets an AI assistant explain the same content, list the rules and run the calculators on your numbers.
- **Bilingual**: everything is in English and Chinese.

> This project is for learning. It is **not legal, tax or financial advice**. Rules change; check the sources and ask a professional before you act. See [DISCLAIMER.md](DISCLAIMER.md).

## The website

The site is generated from the data files and published with GitHub Pages. It has seven views:

| View | What it does |
|---|---|
| Beginner tour | Follows a fictional product (a collapsible silicone cup) through all 8 steps, ending with a unit-profit chart |
| Map | Drill down level by level: main flow → one area → one point. Also a 3D view and a grouped view of all 48 points, with knock-on effects up to 3 steps |
| Start from zero | Eight stages in order, each with its output, its most common mistake and the related points |
| Calculator | Every input starts with the example and is labelled as such. Replace it with your own numbers; each result shows how it was worked out |
| Market rules | Pick where you sell; see the laws and the platform rules that apply, with sources and review dates |
| Data roadmap | How the map could later connect to real data, and which analysis can be exact and which needs validation |
| Sources | Every source cited by the rules |

Run it locally:

```bash
npm ci
npm run serve        # builds dist/ and serves it at http://localhost:8080
```

## What is deliberately not here

- **No product rankings or "best products to sell" lists.** Scraping Amazon breaks its terms. Amazon's data APIs cannot be freely redistributed, and third-party data has its own paid terms. A public ranking would also destroy the very opportunity it shows. The atlas teaches the product-selection *method* instead.
- **No invented numbers.** Example numbers are always labelled as examples. A "healthy range" is shown only when a source backs it, so `benchmarks/` is empty for now.
- **No personal data.** Nothing here collects or stores customer information. The site makes no requests to third parties: no external fonts, scripts or trackers.

## Repository layout

```
data/          knowledge graph: domains, nodes/ (one file per point), edges, glossary,
               tour, phases, pages, UI strings, the running example
rules/         law/us/ (incl. law/us/ca/), platform/amazon/us/; one YAML file per rule
benchmarks/    sourced "commonly cited ranges" (empty until a source exists)
models/        calculators.js (pure functions, no dependencies) + tests
schemas/       JSON Schema for every data type
site/          index.html + app.js; built into dist/ by scripts/build-site.mjs
skill/         SKILL.md + atlas.mjs (JSON helper) + tests
scripts/       validate, build, serve, stale-rule check
legacy/        the original single-file prototype (kept for reference)
```

## Development

```bash
npm ci
npm run validate     # schemas, cross-references, English + Chinese completeness
npm test             # calculator and skill tests
npm run build        # writes dist/
npm run stale        # lists rules past their next_review date
```

CI runs validate, tests and build on every push and pull request. A daily workflow opens an Issue when a rule passes its review date. Pushing to `main` deploys the site.

### Data rules in short

- Every user-facing text has `en` and `zh`. The validator fails if one is missing.
- A rule is `kind: law` (set by a government; applies on every platform) or `kind: platform` (set by a marketplace; applies to one marketplace only). It needs `sources`, `last_checked` and `next_review`.
- Calculators round each money line to the cent, and totals add the rounded lines. Time is always a range (shortest / typical / longest).

## Using the AI skill

See [skill/SKILL.md](skill/SKILL.md). After `npm ci` the helper can be run directly:

```bash
node skill/atlas.mjs rules --topic fees
node skill/atlas.mjs calc price=24.99 fulfilment_fee=4.6
```

## Contributing

Corrections are very welcome, especially to rules. Please read [CONTRIBUTING.md](CONTRIBUTING.md): every rule change needs a source, and every commit needs a DCO sign-off.

## Licence

Code, content and data are licensed under the [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution. The project name and logo are not covered by the licence. Third-party sources are cited and linked, not reproduced.
