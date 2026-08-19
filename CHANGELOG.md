# Changelog

## [0.1.0-rc.7] — 2026-08-19

- Peer ranges corrected for standalone installs (prerelease branch per the
  awesome-dsh-plugin guide; `@deepseek-ai/cordis` at `^4.0.0`).
- Zero-dependency `node:test` suite: package-contract meta tests and
  `@e`-ref marking-script behaviour tests (stubbed DOM); GitHub Actions CI.
- README: requirements & operational notes; SKILL: troubleshooting table.

## [0.1.0-rc.6] — 2026-08-18

- Initial release: six browser tools (`browser_open` / `browser_click` /
  `browser_type` / `browser_extract` / `browser_screenshot` / `browser_eval`)
  with `@e` element references and dual Playwright-headless / CDP backends.
