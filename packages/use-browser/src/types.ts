/**
 * Minimal typed surface for the Playwright runtime used by this package.
 * `playwright` is a runtime dependency of the deployment (declared in the
 * published package.json), not of the harness monorepo build — the source
 * typechecks against these structural types and the real module is
 * dynamically imported at runtime.
 * @module @deepseek-ai/dsh-tool-use-browser/types
 */

/** The page surface the tools use. */
export interface BrowserPage {
  goto(url: string, opts?: { timeout?: number }): Promise<unknown>
  waitForLoadState(state?: string, opts?: { timeout?: number }): Promise<unknown>
  evaluate<T = unknown>(fn: string | ((...args: never[]) => T), ...args: unknown[]): Promise<T>
  screenshot(opts?: { path?: string; fullPage?: boolean }): Promise<Buffer>
  click(selector: string, opts?: { timeout?: number }): Promise<void>
  fill(selector: string, text: string): Promise<void>
  close(): Promise<void>
  url(): string
  title(): Promise<string>
}

/** The context surface (one browser context). */
export interface BrowserContext {
  pages(): BrowserPage[]
  newPage(): Promise<BrowserPage>
  close(): Promise<void>
}

/** The browser surface (launched or connected). */
export interface BrowserHandle {
  contexts(): BrowserContext[]
  newContext(opts?: Record<string, unknown>): Promise<BrowserContext>
  close(): Promise<void>
}

/** The chromium namespace of the playwright module. */
export interface PlaywrightChromium {
  launch(opts?: { headless?: boolean }): Promise<BrowserHandle>
  connectOverCDP(url: string): Promise<BrowserHandle>
}

/** The playwright module shape this package imports dynamically. */
export interface PlaywrightRuntime {
  chromium: PlaywrightChromium
}
