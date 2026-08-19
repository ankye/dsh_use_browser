/**
 * Browser session manager: one shared page across the tool set, backed by
 * Playwright either as a managed headless Chromium (`mode: playwright`) or
 * connected to the user's own Chrome over CDP (`mode: cdp` — visible and
 * loads Chrome extensions, which headless cannot).
 * @module @deepseek-ai/dsh-tool-use-browser/session
 */
import type { BrowserContext, BrowserHandle, BrowserPage } from './types.ts';
/** Resolved browser configuration. */
export interface BrowserConfig {
    /** Which backend serves the session. */
    mode: string;
    /** CDP endpoint for `mode: cdp`. */
    cdpUrl: string;
    /** Headless for `mode: playwright`. */
    headless: boolean;
    /** Default operation timeout in ms. */
    timeoutMs: number;
}
/** One live browser session (shared across tool calls). */
export interface BrowserSession {
    browser?: BrowserHandle;
    context?: BrowserContext;
    page?: BrowserPage;
}
/** JS that marks visible interactive elements with `data-dsh-e` refs. */
export declare const MARK_REFS_JS = "(function(){\n  var els = document.querySelectorAll('button,a,input,textarea,select,[role=button],[role=link],[role=textbox],[role=tab]');\n  var seen = new Set(); var n = 0;\n  for (var i = 0; i < els.length; i++) {\n    var el = els[i];\n    if (seen.has(el)) continue; seen.add(el);\n    var r = el.getBoundingClientRect();\n    if (r.width === 0 && r.height === 0) continue;\n    el.setAttribute('data-dsh-e', String(++n));\n  }\n  var out = [];\n  var marked = document.querySelectorAll('[data-dsh-e]');\n  for (var j = 0; j < marked.length; j++) {\n    var m = marked[j];\n    var tag = m.tagName.toLowerCase();\n    var text = (m.textContent || '').trim().replace(/\\s+/g,' ').slice(0, 60);\n    out.push({\n      ref: '@' + m.getAttribute('data-dsh-e'),\n      tag: tag,\n      text: text || (tag === 'input' ? 'input' : tag),\n      name: m.getAttribute('name') || '',\n      placeholder: m.getAttribute('placeholder') || '',\n      type: m.getAttribute('type') || ''\n    });\n  }\n  return JSON.stringify(out);\n})()";
/** One interactive element reference returned to the model. */
export interface ElementRef {
    ref: string;
    tag: string;
    text: string;
    name: string;
    placeholder: string;
    type: string;
}
/**
 * Ensure a live page exists, launching (playwright) or connecting (cdp).
 * @param session - the shared session state.
 * @param config - the active browser configuration.
 * @returns the current page.
 */
export declare function ensurePage(session: BrowserSession, config: BrowserConfig): Promise<BrowserPage>;
/**
 * Navigate the current page and collect interactive `@e` references.
 * @param session - the shared session.
 * @param config - the active configuration.
 * @param url - the target URL.
 * @returns the page title, URL, and element references.
 */
export declare function openAndCollect(session: BrowserSession, config: BrowserConfig, url: string): Promise<{
    title: string;
    url: string;
    refs: ElementRef[];
}>;
/** Resolve an `@N` reference to its `data-dsh-e` selector. */
export declare function refSelector(ref: string): string;
//# sourceMappingURL=session.d.ts.map