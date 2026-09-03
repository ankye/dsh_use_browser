/**
 * Package-contract meta tests: the shape this repository must keep so the
 * awesome-dsh-plugin storefront and `dsh plugin add` can consume it. These
 * checks mirror what the storefront CI and a human reviewer look at: a
 * `dsh.bundle` manifest per package, official `@deepseek-ai/*` peers with a
 * prerelease branch that matches the 0.1.0-rc harness builds, and shipped
 * artifacts that exist. Zero dependencies — plain `node:test` + fs.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** General peer range for the maintained 0.1.2 prerelease line. */
const DSH_PEER_RANGE = '>=0.1.2-alpha.1 <0.2.0-0'

/** Settings service API consumed by this revision. */
const SETTINGS_PEER_RANGE = '>=0.1.2-alpha.5 <0.2.0-0'

/** @deepseek-ai/cordis is the vendored framework at 4.x, not a dsh rc release. */
const CORDIS_RANGE = '^4.0.0'

/** Every package directory under packages/. */
function packageDirs() {
  return readdirSync(join(ROOT, 'packages'))
    .filter(name => existsSync(join(ROOT, 'packages', name, 'package.json')))
    .map(name => join(ROOT, 'packages', name))
}

test('every package declares a dsh.bundle manifest with an existing patch file', () => {
  const dirs = packageDirs()
  assert.ok(dirs.length >= 1, 'expected at least one package under packages/')
  for (const dir of dirs) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const patch = pkg.dsh?.bundle?.patch
    assert.ok(typeof patch === 'string', `${pkg.name}: dsh.bundle.patch is required`)
    assert.ok(existsSync(join(dir, patch)), `${pkg.name}: cordis patch "${patch}" must exist`)
  }
})

test('@deepseek-ai peers use the documented prerelease branch (cordis at ^4.0.0)', () => {
  for (const dir of packageDirs()) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    const peers = pkg.peerDependencies ?? {}
    for (const [name, range] of Object.entries(peers)) {
      if (name === '@deepseek-ai/cordis') {
        assert.equal(range, CORDIS_RANGE, `${pkg.name}: cordis peer must be ${CORDIS_RANGE}`)
      } else if (name === '@deepseek-ai/dsh-settings') {
        assert.equal(range, SETTINGS_PEER_RANGE, `${pkg.name}: ${name} peer must support the Settings service API`)
      } else if (name.startsWith('@deepseek-ai/dsh-')) {
        assert.equal(range, DSH_PEER_RANGE, `${pkg.name}: ${name} peer must be the prerelease branch range`)
      }
    }
  }
})

test('shipped artifacts referenced by package.json exist', () => {
  for (const dir of packageDirs()) {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    for (const field of ['main', 'types']) {
      const value = pkg[field]
      if (typeof value === 'string') {
        assert.ok(existsSync(join(dir, value)), `${pkg.name}: ${field} "${value}" must exist`)
      }
    }
    for (const entry of Object.values(pkg.exports ?? {})) {
      if (typeof entry === 'object' && entry !== null && typeof entry.default === 'string') {
        assert.ok(existsSync(join(dir, entry.default)), `${pkg.name}: export "${entry.default}" must exist`)
      }
    }
  }
})

test('README documents all six model-facing tools', () => {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')
  for (const tool of [
    'browser_open', 'browser_click', 'browser_type',
    'browser_extract', 'browser_screenshot', 'browser_eval',
  ]) {
    assert.ok(readme.includes(tool), `README.md must mention ${tool}`)
  }
})
