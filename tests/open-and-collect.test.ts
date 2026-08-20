/**
 * Regression test for `openAndCollect`'s ref parsing. `page.evaluate(string)`
 * evaluates the string as an expression and returns its value — MARK_REFS_JS
 * is an IIFE that returns a JSON string, so the caller must parse it back
 * into an array. A prior version skipped the parse and returned the raw JSON
 * string as `refs`, which fails the tool's output schema
 * (`value.refs must be an array`) the moment a real page is opened.
 *
 * `ensurePage` returns `session.page` as-is when already set, so a stub page
 * exercises the full `openAndCollect` path without touching Playwright.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { openAndCollect } from '../packages/use-browser/src/session.ts'
import type { BrowserPage } from '../packages/use-browser/src/types.ts'

/** A stub page whose `evaluate` mirrors Playwright's string-expression semantics: it always returns a value, never a parsed structure. */
function stubPage(evaluateResult: unknown): BrowserPage {
  return {
    goto: async () => {},
    waitForLoadState: async () => {},
    evaluate: async () => evaluateResult,
    title: async () => 'Example Domain',
    url: () => 'https://example.com',
    click: async () => {},
    fill: async () => {},
    screenshot: async () => {},
  } as unknown as BrowserPage
}

test('openAndCollect parses the JSON string page.evaluate returns into an array', async () => {
  const page = stubPage('[{"ref":"@1","tag":"a","text":"Learn more","name":"","placeholder":"","type":""}]')
  const session = { page }
  const config = { mode: 'playwright' as const, headless: true, timeoutMs: 30000, cdpUrl: '' }
  const result = await openAndCollect(session, config, 'https://example.com')
  assert.ok(Array.isArray(result.refs), 'refs must be an array (the output schema requires it)')
  assert.equal(result.refs.length, 1)
  assert.equal(result.refs[0]!.ref, '@1')
  assert.equal(result.title, 'Example Domain')
  assert.equal(result.url, 'https://example.com')
})

test('openAndCollect returns an empty array for a page with no interactive elements', async () => {
  const page = stubPage('[]')
  const session = { page }
  const config = { mode: 'playwright' as const, headless: true, timeoutMs: 30000, cdpUrl: '' }
  const result = await openAndCollect(session, config, 'https://example.com')
  assert.deepEqual(result.refs, [])
})
