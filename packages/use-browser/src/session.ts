/**
 * Browser session manager: one shared page across the tool set, backed by
 * Playwright either as a managed headless Chromium (`mode: playwright`) or
 * connected to the user's own Chrome over CDP (`mode: cdp` — visible and
 * loads Chrome extensions, which headless cannot).
 * @module @deepseek-ai/dsh-tool-use-browser/session
 */

import type { BrowserContext, BrowserHandle, BrowserPage, PlaywrightRuntime } from './types.ts'

/** Resolved browser configuration. */
export interface BrowserConfig {
  /** Which backend serves the session. */
  mode: string
  /** CDP endpoint for `mode: cdp`. */
  cdpUrl: string
  /** Headless for `mode: playwright`. */
  headless: boolean
  /** Default operation timeout in ms. */
  timeoutMs: number
}

/** One live browser session (shared across tool calls). */
export interface BrowserSession {
  browser?: BrowserHandle
  context?: BrowserContext
  page?: BrowserPage
}

/** JS that marks visible interactive elements with `data-dsh-e` refs. */
export const MARK_REFS_JS = `(function(){
  var els = document.querySelectorAll('button,a,input,textarea,select,[role=button],[role=link],[role=textbox],[role=tab]');
  var seen = new Set(); var n = 0;
  for (var i = 0; i < els.length; i++) {
    var el = els[i];
    if (seen.has(el)) continue; seen.add(el);
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    el.setAttribute('data-dsh-e', String(++n));
  }
  var out = [];
  var marked = document.querySelectorAll('[data-dsh-e]');
  for (var j = 0; j < marked.length; j++) {
    var m = marked[j];
    var tag = m.tagName.toLowerCase();
    var text = (m.textContent || '').trim().replace(/\\s+/g,' ').slice(0, 60);
    out.push({
      ref: '@' + m.getAttribute('data-dsh-e'),
      tag: tag,
      text: text || (tag === 'input' ? 'input' : tag),
      name: m.getAttribute('name') || '',
      placeholder: m.getAttribute('placeholder') || '',
      type: m.getAttribute('type') || ''
    });
  }
  return JSON.stringify(out);
})()`

/** One interactive element reference returned to the model. */
export interface ElementRef {
  ref: string
  tag: string
  text: string
  name: string
  placeholder: string
  type: string
}

/**
 * Ensure a live page exists, launching (playwright) or connecting (cdp).
 * @param session - the shared session state.
 * @param config - the active browser configuration.
 * @returns the current page.
 */
export async function ensurePage(session: BrowserSession, config: BrowserConfig): Promise<BrowserPage> {
  if (session.page !== undefined) return session.page
  const runtime = await import('playwright') as unknown as PlaywrightRuntime
  const { chromium } = runtime
  let browser: BrowserHandle
  let context: BrowserContext
  if (config.mode === 'cdp') {
    browser = await chromium.connectOverCDP(config.cdpUrl)
    const contexts = browser.contexts()
    context = contexts.length > 0 ? contexts[0]! : await browser.newContext()
  } else {
    browser = await chromium.launch({ headless: config.headless })
    context = await browser.newContext()
  }
  const pages = context.pages()
  const page = pages.length > 0 ? pages[0]! : await context.newPage()
  session.browser = browser
  session.context = context
  session.page = page
  return page
}

/**
 * Navigate the current page and collect interactive `@e` references.
 * @param session - the shared session.
 * @param config - the active configuration.
 * @param url - the target URL.
 * @returns the page title, URL, and element references.
 */
export async function openAndCollect(
  session: BrowserSession,
  config: BrowserConfig,
  url: string,
): Promise<{ title: string; url: string; refs: ElementRef[] }> {
  const page = await ensurePage(session, config)
  await page.goto(url, { timeout: config.timeoutMs })
  await page.waitForLoadState('domcontentloaded', { timeout: config.timeoutMs })
  // page.evaluate(string) evaluates the string as an expression and returns
  // its value — MARK_REFS_JS is an IIFE returning JSON, so parse it back.
  const raw = await page.evaluate<string>(MARK_REFS_JS)
  const refs = JSON.parse(raw) as ElementRef[]
  return { title: await page.title(), url: page.url(), refs }
}

/** Resolve an `@N` reference to its `data-dsh-e` selector. */
export function refSelector(ref: string): string {
  const match = /^@(\d+)$/.exec(ref.trim())
  if (match === null) throw new Error(`invalid element ref "${ref}": expected @N from browser_open`)
  return `[data-dsh-e="${match[1]}"]`
}
