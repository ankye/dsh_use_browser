# dsh_use_browser

[English](README.md) | 中文

面向 DeepSeek Harness 的 **codex 风格本地浏览器操作**插件：打开页面、按 `@e` 引用交互、提取内容、截图、执行页面 JS——**双后端**：托管**无头 Playwright**（快、不可见）或 **CDP 连接你自己的 Chrome**（可见，且能加载无头模式做不到的 Chrome 扩展）。

## 兼容性

本修订要求 DeepSeek Harness core 为 `0.1.2-alpha.5` 或以上的 `0.1.x` 版本；它使用该 core 版本引入的 Settings 服务 API。

## 能力

| 工具 | 作用 |
|---|---|
| `browser_open` | 打开 URL → 页面摘要 + 可交互 `@e` 引用 |
| `browser_click` / `browser_type` | 按 `@e` 引用点击 / 填表 |
| `browser_extract` | 页面文本（body 或指定选择器） |
| `browser_screenshot` | 截图落盘 PNG → 配合识图插件 `analyze_image` 「看到」页面 |
| `browser_eval` | 页面内执行 JS |

## 安装到官方 DeepSeek Harness（不改仓库）

包声明了 `dsh.bundle`，`dsh plugin add` 自动挂载：

```sh
dsh plugin --profile web add file:/path/to/dsh_use_browser/packages/use-browser
# 或发布 npm 后
dsh plugin --profile web add @deepseek-ai/dsh-tool-use-browser
```

> 安装时的 `[WARN] Issues with peer dependencies` 属正常（peer 由部署提供）。重启 harness 后，6 个 `browser_*` 工具出现在所有 preset。

## 配置（设置 → browser）

| 字段 | 默认 | 含义 |
|---|---|---|
| `mode` | `playwright` | `playwright` = 无头 Chromium；`cdp` = 连接你的 Chrome |
| `cdpUrl` | `http://localhost:9222` | cdp 模式端点 |
| `headless` | `true` | playwright 模式是否无头 |
| `timeoutMs` | `30000` | 默认操作超时 |

cdp 模式启动带扩展的 Chrome：

```sh
open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=/tmp/dsh-chrome
```

## 前置条件

- `playwright`（随插件安装）+ 浏览器二进制：`npx playwright install chromium`（或复用已有 `~/Library/Caches/ms-playwright` 缓存；锁定 `~1.61.0` 对应 chromium-1228）。
- cdp 模式还需要你自己的 Chrome 带 `--remote-debugging-port` 运行。

## 开发说明

- 后端无关：一个会话管理器服务两种模式，工具契约不变。
- 截图落在 `/tmp/dsh-browser-*.png`，与识图插件的 `analyze_image` 联动。
- 使用工作流见 [`SKILL.md`](SKILL.md)。

## License

MIT
