/**
 * Codex-style local browser automation for the harness agent: open / extract /
 * screenshot / click / type / eval against a Playwright page, either a managed
 * headless Chromium or the user's own Chrome connected over CDP (visible, and
 * able to load Chrome extensions that headless cannot).
 *
 * The tool entry points are backend-agnostic: a `browser` settings namespace
 * selects the backend; one shared session serves all calls. Screenshots land
 * on disk so the model can pair them with the vision plugin (`analyze_image`).
 * @module @deepseek-ai/dsh-tool-use-browser
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { defineTool, TOOL_ABORTED, type ToolRunContext } from '@deepseek-ai/dsh-tools'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import type {} from '@deepseek-ai/dsh-settings'
import {
  ensurePage, openAndCollect, refSelector,
  type BrowserConfig, type BrowserSession, type ElementRef,
} from './session.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'tool-use-browser'

/** Services this plugin consumes (all host-plane; it publishes nothing). */
export const inject = ['tools', 'systemPrompt']

/** Settings namespace carrying the browser backend selection. */
export const BROWSER_SETTINGS_NAMESPACE = 'browser'

/** Runtime configuration schema for the browser plugin. */
export const Config: z<BrowserConfig> = z.object({
  mode: z.string().default('playwright'),
  cdpUrl: z.string().default('http://localhost:9222'),
  headless: z.boolean().default(true),
  timeoutMs: z.number().step(1).min(1000).default(30000),
})

/** Screenshot output directory (sandbox-rooted temp area). */
const SHOT_DIR = '/tmp'

/** Build the registry-stable abort error. */
function abortedError(): HarnessError {
  const error = new HarnessError('tool call aborted', TOOL_ABORTED)
  error.name = 'AbortError'
  return error
}

/** The `browser_open` tool's result. */
interface OpenResult {
  title: string
  url: string
  refs: ElementRef[]
}

/** The `browser_extract` tool's result. */
interface ExtractResult {
  text: string
}

/** The `browser_screenshot` tool's result. */
interface ShotResult {
  path: string
}

/** The `browser_click` / `browser_type` tool's result. */
interface InteractResult {
  action: string
  ref: string
}

/** The `browser_eval` tool's result. */
interface EvalResult {
  result: string
}

/**
 * Mount the browser tool set and settings section.
 * @param ctx - plugin context.
 * @param config - the composed row config (schema-defaulted by Cordis).
 */
export function apply(ctx: Context, config: BrowserConfig): void {
  let current: () => BrowserConfig = () => config
  ctx.inject(['settings'], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, BROWSER_SETTINGS_NAMESPACE, Config, config, {
      setSource: (source) => { current = source },
      onChange: () => {},
    })
  })
  const session: BrowserSession = {}

  ctx.systemPrompt.section({
    name: 'tool:use-browser',
    order: 122,
    text: 'To operate a browser: call browser_open(url) to see the page and its interactive @e refs, '
      + 'then browser_click / browser_type on a ref, browser_extract for text, browser_screenshot to save a PNG '
      + '(then analyze_image on the path to see it), and browser_eval for page JS. '
      + 'The backend is selected by Settings → browser (playwright headless, or cdp to your own Chrome).',
  })

  ctx.tools.register(defineTool({
    name: 'browser_open',
    description: 'Open a URL in the browser (Playwright headless or your CDP Chrome per settings) and return the page '
      + 'title, URL, and a list of interactive elements as @e refs (e.g. @1, @2) for browser_click / browser_type.',
    parameters: {
      url: { type: 'string', required: true, description: 'The URL to open (http/https).' },
      timeoutMs: { type: 'number', description: 'Navigation timeout in ms; defaults to the configured value.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', required: true },
          url: { type: 'string', required: true },
          refs: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                ref: { type: 'string', required: true },
                tag: { type: 'string', required: true },
                text: { type: 'string', required: true },
                name: { type: 'string', required: true },
                placeholder: { type: 'string', required: true },
                type: { type: 'string', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{
        type: 'text',
        text: `Opened ${value.url} — "${value.title}" with ${value.refs.length} interactive element(s).\n`
          + value.refs.map(r => `${r.ref}\t${r.tag}\t${r.text || `[${r.tag}${r.placeholder ? ' placeholder=' + r.placeholder : ''}]`}`).join('\n'),
      }],
    },
    async execute(args: { url: string; timeoutMs?: number }, _exec: ToolRunContext) {
      const cfg = withTimeout(current(), args.timeoutMs)
      const result = await openAndCollect(session, cfg, args.url)
      return result as unknown as OpenResult
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_extract',
    description: 'Extract text from the current page (body text, or a selector\'s text) for reading content.',
    parameters: {
      selector: { type: 'string', description: 'CSS selector; defaults to the whole page body.' },
      maxChars: { type: 'number', description: 'Maximum characters to return (default 8000).' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args: { selector?: string; maxChars?: number }, exec: ToolRunContext) {
      if (exec.signal.aborted) throw abortedError()
      const cfg = current()
      const page = await ensurePage(session, cfg)
      const max = args.maxChars ?? 8000
      const text = await page.evaluate<string>(
        `(function(){var root=${args.selector ? `document.querySelector(${JSON.stringify(args.selector)})` : 'document.body'};if(!root)return '';var t=(root.innerText||root.textContent||'').trim();return t.slice(0,${max});})()`,
      ) as unknown as string
      return { text } as ExtractResult
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_screenshot',
    description: 'Save a screenshot of the current page to a PNG path. The model cannot see images — call analyze_image on the returned path to inspect it.',
    parameters: {
      path: { type: 'string', description: 'Output PNG path; defaults to a temp path.' },
      fullPage: { type: 'boolean', description: 'Capture the full scrollable page instead of the viewport.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          path: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `Screenshot saved: ${value.path}` }],
    },
    async execute(args: { path?: string; fullPage?: boolean }, _exec: ToolRunContext) {
      const cfg = current()
      const page = await ensurePage(session, cfg)
      const path = args.path ?? `${SHOT_DIR}/dsh-browser-${Date.now()}.png`
      await page.screenshot({ path, ...args.fullPage === true ? { fullPage: true } : {} })
      return { path } as ShotResult
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_click',
    description: 'Click an interactive element by its @e ref from browser_open (e.g. @3).',
    parameters: {
      ref: { type: 'string', required: true, description: 'The @e ref to click.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', required: true },
          ref: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `Clicked ${value.ref}` }],
    },
    async execute(args: { ref: string }, _exec: ToolRunContext) {
      const cfg = current()
      const page = await ensurePage(session, cfg)
      await page.click(refSelector(args.ref), { timeout: cfg.timeoutMs })
      return { action: 'click', ref: args.ref } as InteractResult
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_type',
    description: 'Type text into an input by its @e ref from browser_open (e.g. @5). Replaces existing content.',
    parameters: {
      ref: { type: 'string', required: true, description: 'The @e ref of the input.' },
      text: { type: 'string', required: true, description: 'Text to type.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: { type: 'string', required: true },
          ref: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: `Typed into ${value.ref}` }],
    },
    async execute(args: { ref: string; text: string }, _exec: ToolRunContext) {
      const cfg = current()
      const page = await ensurePage(session, cfg)
      await page.fill(refSelector(args.ref), args.text)
      return { action: 'type', ref: args.ref } as InteractResult
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_eval',
    description: 'Run a JavaScript expression in the current page and return its JSON value. For scraping or page automation beyond the other tools.',
    parameters: {
      expression: { type: 'string', required: true, description: 'A JS expression; the page evaluates it and returns the value.' },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          result: { type: 'string', required: true },
        },
      },
      render: (_args, value) => [{ type: 'text', text: value.result }],
    },
    async execute(args: { expression: string }, _exec: ToolRunContext) {
      const cfg = current()
      const page = await ensurePage(session, cfg)
      const raw = await page.evaluate<unknown>(args.expression) as unknown
      let serialized: string
      try {
        serialized = JSON.stringify(raw)
        if (serialized === undefined) serialized = String(raw)
      } catch {
        serialized = String(raw)
      }
      return { result: serialized } as EvalResult
    },
  }))
}

/** Merge a per-call timeout override into the active configuration. */
function withTimeout(config: BrowserConfig, timeoutMs: number | undefined): BrowserConfig {
  return timeoutMs === undefined ? config : { ...config, timeoutMs }
}
