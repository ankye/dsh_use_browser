# dsh_use_browser

English | [中文](README.zh.md)

Codex-style **local browser automation** for DeepSeek Harness: open pages, interact by `@e` references, extract content, screenshot, and run page JS — with two backends: managed **headless Playwright** (fast, invisible) or **CDP connected to your own Chrome** (visible, and loads Chrome extensions that headless cannot).

## Capabilities

| Tool | Purpose |
|---|---|
| `browser_open` | Open a URL → page summary + interactive `@e` refs |
| `browser_click` / `browser_type` | Interact by `@e` ref |
| `browser_extract` | Page text (body or selector) |
| `browser_screenshot` | Save a PNG → pair with `analyze_image` (the vision plugin) to "see" the page |
| `browser_eval` | Run JavaScript in the page |

## Requirements & notes

- Runtime: Node 22+; `playwright ~1.61.0` is the only runtime dependency and
  is resolved from the deploying harness (peer of the deployment, not bundled).
- One session shares a single browser page: `browser_open` navigates the
  current page; later calls act on that page.
- Screenshots land in `/tmp/dsh-browser-*.png` — pair with `analyze_image`
  (the vision plugin) to "see" the page, since the model context stays text.
- Headless mode cannot load Chrome extensions; use `mode: cdp` for extensions
  or for visible, watchable automation.

## Install into an official DeepSeek Harness (no repo modification)

The package declares `dsh.bundle`, so `dsh plugin add` mounts it automatically:

```sh
dsh plugin --profile web add file:/path/to/dsh_use_browser/packages/use-browser
# or, once published
dsh plugin --profile web add @deepseek-ai/dsh-tool-use-browser
```

> `[WARN] Issues with peer dependencies` is expected — peers come from the deployment. Restart the harness; the six `browser_*` tools then appear in every preset.

## Configuration (Settings → browser)

| Field | Default | Meaning |
|---|---|---|
| `mode` | `playwright` | `playwright` = headless Chromium; `cdp` = connect to your Chrome |
| `cdpUrl` | `http://localhost:9222` | CDP endpoint for `mode: cdp` |
| `headless` | `true` | Headless for `mode: playwright` |
| `timeoutMs` | `30000` | Default operation timeout |

Start a Chrome with extensions for CDP mode:

```sh
open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=/tmp/dsh-chrome
```

## Requirements

- `playwright` (installed with the plugin) + a browser binary: `npx playwright install chromium` (or rely on an existing `~/Library/Caches/ms-playwright` cache; the pinned `~1.61.0` matches chromium-1228).
- CDP mode additionally needs your own Chrome running with `--remote-debugging-port`.

## Development

- Backend-agnostic: one session manager serves both modes; the tools never change.
- Screenshots land in `/tmp/dsh-browser-*.png` and pair with the vision plugin's `analyze_image`.
- Workflow guidance ships as [`SKILL.md`](SKILL.md).

## License

MIT
