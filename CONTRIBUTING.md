# Contributing

Thank you for helping. This project is for beginners, so accuracy matters more than volume. 中文说明见下方。

## Ways to help

- **Report a wrong or outdated rule**: open an Issue with the rule id (e.g. `law/us/de-minimis-suspension`), what is wrong, and a link to the source that shows the current state.
- **Fix a translation or an explanation**: a pull request is best; an Issue is fine too.
- **Add a source-backed benchmark**: see "Benchmarks" below.
- **Ask or discuss**: GitHub Issues for now.

## Rules for changes

1. **Every rule change needs a source.** Use official government or platform pages first. Reputable secondary sources (law firms, research institutes) may support them but should not replace them. Cite only pages you actually opened and that support the statement. Update `last_checked`, and set `next_review` (about 3 months ahead for things that change often, such as tariffs and fees; otherwise up to 6 months).
2. **Law and platform rules stay separate.**
   - `kind: law` is set by a government and applies on every platform; put it in `rules/law/<country>/` (states in `rules/law/<country>/<state>/`).
   - `kind: platform` is set by a marketplace and applies only to that marketplace; put it in `rules/platform/<platform>/<marketplace>/`.
3. **No invented numbers.** Example numbers must be labelled as examples. A benchmark range needs a source and the category it applies to; otherwise leave it out.
4. **Both languages.** Every user-facing text needs `en` and `zh`. If you can only write one, say so in the pull request and someone will add the other.
5. **No copied text.** Summarise in your own words; do not paste paragraphs from sources.
6. **No personal data, and no internal company material.** Only public information and the fictional running example.
7. **No product rankings or scraped marketplace data.** See the README for why.

Before opening a pull request:

```bash
npm ci
npm run validate
npm test
npm run build
```

### Benchmarks

Add one YAML file per metric in `benchmarks/`, following `schemas/benchmark.schema.json`: `metric`, `low` and/or `high`, `unit`, `category`, `sources`, `note` (en + zh), `last_checked`. The site and skill present it as a "commonly cited range", never as a guarantee.

## Sign-off (DCO)

Every commit must be signed off to certify the [Developer Certificate of Origin](https://developercertificate.org/): you wrote the change or have the right to submit it under the project's licence.

```bash
git commit -s -m "Fix de minimis postal date"
```

This adds a line like `Signed-off-by: Your Name <you@example.com>`. Contributions are accepted under the Apache License 2.0, the same licence as the project (licence section 5). The maintainer may later ask contributors to sign a Contributor Licence Agreement; this has not been decided yet.

---

# 参与贡献（中文）

感谢你的帮助。这个项目面向新手，所以准确比数量更重要。

## 可以怎样帮忙

- **报告错误或过时的规则**：开一个 Issue，写明规则编号（如 `law/us/de-minimis-suspension`）、哪里不对，并附上能说明现状的来源链接。
- **改进翻译或讲解**：最好提交 Pull Request，开 Issue 也可以。
- **补充有来源的参考区间**：见上文英文部分的"Benchmarks"。
- **提问或讨论**：目前请使用 GitHub Issues。

## 修改规则须知

1. **修改规则必须附来源。**
   - 优先使用政府和平台的官方页面。律所、研究机构等可靠的第二手资料只能作补充，不能代替官方来源。
   - 只引用你实际打开过、并且能支持该说法的页面。
   - 更新 `last_checked`，并设置 `next_review`：关税、费用等经常变化的内容约 3 个月后复查，其他最长 6 个月。
2. **法律和平台规则分开放。**
   - `kind: law` 由政府制定，在任何平台销售都适用，放在 `rules/law/<国家>/`，州一级的放在 `rules/law/<国家>/<州>/`。
   - `kind: platform` 由平台制定，只适用于那个站点，放在 `rules/platform/<平台>/<站点>/`。
3. **不编造数字。** 示例数字必须标明是示例。参考区间必须有来源，并写明适用的品类，否则就不要写。
4. **中英文都要有。** 如果你只能写一种语言，请在 Pull Request 里说明，会有人补上另一种。
5. **不复制原文。** 用自己的话概括，不要整段粘贴来源内容。
6. **不涉及个人数据，也不使用任何公司内部资料。** 只用公开信息和虚构的示例。
7. **不做选品排行，不使用抓取的平台数据。** 原因见 README。

提交 Pull Request 之前，请运行 `npm ci`、`npm run validate`、`npm test` 和 `npm run build`。

## 签名（DCO）

每个提交都要用 `git commit -s` 签名，表示你确认符合[开发者原创声明](https://developercertificate.org/)（DCO）：改动是你自己写的，或者你有权按本项目的许可证提交它。贡献内容按 Apache License 2.0 接收，与项目许可证相同（许可证第 5 条）。将来维护者可能会要求贡献者签署贡献者许可协议（CLA），目前尚未决定。
