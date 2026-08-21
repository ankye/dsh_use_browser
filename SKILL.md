---
name: use-browser
description: "Codex 风格的本地浏览器自动化（配合 @deepseek-ai/dsh-tool-use-browser 插件）：打开页面并用 @e 引用操作元素（点击/填表）、提取文本、截图（配合 analyze_image 看图）、页面内执行 JS。后端可选 Playwright 无头或 CDP 连接自己的 Chrome。Triggers: browser, web automation, browse web, navigate, click, fill form, type, screenshot page, scrape, playwright, headless browser, cdp, web agent, 浏览器, 网页操作, 打开网页"
---
# Use Browser

通用浏览器操作技能（配合 `@deepseek-ai/dsh-tool-use-browser` 插件使用）。

## 工具

| 工具 | 作用 |
|---|---|
| `browser_open` | 打开 URL，返回页面摘要 + 可交互元素 `@e` 引用列表 |
| `browser_click` / `browser_type` | 按 `@e` 引用点击 / 填表（如 `@3`） |
| `browser_extract` | 提取页面文本（body 或指定选择器） |
| `browser_screenshot` | 截图落盘 PNG → 用 `analyze_image` 看图（模型本身不能看图） |
| `browser_eval` | 页面内执行 JS 表达式 |

## 标准工作流

```
1. browser_open("https://目标")
   看返回的 refs：@1 @2 @3 ...（按钮/链接/输入框）
2. 需要交互 → browser_click("@N") / browser_type("@N", "文本")
3. 需要读内容 → browser_extract(可选 selector)
4. 需要「看」页面 → browser_screenshot() → analyze_image(返回的 path)
5. 需要自动化/抓取 → browser_eval("表达式")
```

## 后端选择（设置 → browser）

| 设置 | 值 | 说明 |
|---|---|---|
| `browser.mode` | `playwright`（默认） | 无头 Chromium：快、不可见，适合常规浏览/抓取 |
| `browser.mode` | `cdp` | 连你自己的 Chrome：**操作可见 + 可加载 Chrome 扩展**（无头做不到），适合需要扩展、需要人盯着看的场景 |
| `browser.cdpUrl` | `http://localhost:9222` | cdp 模式的端点 |

### 启动带扩展的 Chrome（cdp 模式）

```bash
open -na "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=/tmp/dsh-chrome
# 在打开的 Chrome 里登录/加载扩展，然后 browser_open 会连接它
```

## 故障排查

| 现象 | 处理 |
|---|---|
| `browser_open` 连不上（cdp） | 确认 Chrome 以 `--remote-debugging-port=9222` 启动、`browser.cdpUrl` 一致、`--user-data-dir` 用独立目录（不能是默认 profile） |
| 需要扩展但页面没加载 | 无头模式不支持扩展；必须 `browser.mode: cdp` 连自己的 Chrome |
| 截图后 analyze_image 报权限 | 首次使用需在 系统设置 → 隐私与安全性 → 屏幕录制 授权终端 |
| 页面元素没出现在 refs 里 | 元素不可见或未渲染（脚本只标记可见元素）；先 `browser_eval("scrollTo(0, document.body.scrollHeight)")` 再重新 open |

## 注意

- 一个会话共享同一个浏览器页面；`browser_open` 会导航当前页面。
- 截图产物在 `/tmp/dsh-browser-*.png`，交给 `analyze_image`（识图插件）即可「看到」页面。
- 无头模式不支持浏览器扩展；需要扩展的场景务必用 cdp 模式。
