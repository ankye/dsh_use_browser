/**
 * Behaviour tests for the @e-ref marking script. The script is a self-contained
 * IIFE string injected into pages; here it runs against a stubbed `document`
 * to verify the visible-element filter, ref numbering, and text cleaning.
 * Zero dependencies — node:test + --experimental-strip-types.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MARK_REFS_JS } from '../packages/use-browser/src/session.ts'

/** Minimal element lookalike with a settable bounding rect. */
function fakeEl(tagName, { text = '', w = 10, h = 10, placeholder = '' } = {}) {
  const attrs = new Map()
  return {
    attrs,
    tagName,
    textContent: text,
    name: '',
    placeholder,
    type: tagName === 'INPUT' ? 'text' : '',
    getBoundingClientRect: () => ({ width: w, height: h }),
    setAttribute: (k, v) => attrs.set(k, v),
    getAttribute: (k) => {
      if (k === 'placeholder') return placeholder
      if (k === 'name') return ''
      if (k === 'type') return tagName === 'INPUT' ? 'text' : ''
      return attrs.get(k) ?? ''
    },
  }
}

/** Run the marking script against a fake element list. */
function mark(els) {
  // The real browser resolves `[data-dsh-e]` to only the marked elements;
  // mirror that by filtering on the attribute map.
  const fakeDocument = {
    querySelectorAll: (sel) =>
      sel.includes('[data-dsh-e]') ? els.filter(e => e.attrs.has('data-dsh-e')) : els,
  }
  const previous = globalThis.document
  globalThis.document = fakeDocument
  try {
    // The script is an IIFE expression; page.evaluate returns the expression
    // value, so wrap it in `return` for the local Function executor.
    return JSON.parse(new Function(`return (${MARK_REFS_JS})`)())
  } finally {
    globalThis.document = previous
  }
}

test('the marking script is syntactically valid JavaScript', () => {
  assert.doesNotThrow(() => new Function(MARK_REFS_JS))
})

test('marks visible interactive elements with sequential @e refs', () => {
  const out = mark([
    fakeEl('BUTTON', { text: '  Go  ' }),
    fakeEl('A', { text: 'Docs' }),
  ])
  assert.equal(out.length, 2)
  assert.deepEqual(
    out.map(e => [e.ref, e.tag, e.text]),
    [['@1', 'button', 'Go'], ['@2', 'a', 'Docs']],
  )
})

test('skips zero-size elements (hidden or not yet laid out)', () => {
  const out = mark([
    fakeEl('BUTTON', { text: 'Visible', w: 50, h: 20 }),
    fakeEl('INPUT', { text: '', w: 0, h: 0, placeholder: 'hidden input' }),
  ])
  assert.equal(out.length, 1)
  assert.equal(out[0].ref, '@1')
  assert.equal(out[0].tag, 'button')
})

test('exposes placeholder text for inputs', () => {
  const out = mark([fakeEl('INPUT', { w: 100, h: 30, placeholder: 'Search' })])
  assert.equal(out[0].placeholder, 'Search')
})
