import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readDisabledPluginIds,
  writeDisabledPluginIds,
  setPluginEnabled,
  pluginEntryId,
} from '../index.js'

function fakeProfile(patchContent) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-plugins-toggle-'))
  const web = join(dir, 'profiles', 'web')
  mkdirSync(web, { recursive: true })
  if (patchContent !== undefined) {
    writeFileSync(join(web, 'cordis.patch.yml'), patchContent)
  }
  return dir
}

function withHome(dir, fn) {
  const prev = process.env.DSH_HOME
  process.env.DSH_HOME = dir
  try { return fn() } finally {
    process.env.DSH_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  }
}

const DEFAULT_HEADER = `# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; \`!!js\` expressions allowed).
`

test('readDisabledPluginIds returns empty set on missing/empty file', () => {
  withHome(fakeProfile(), () => {
    assert.equal(readDisabledPluginIds('web').size, 0)
  })
  withHome(fakeProfile(DEFAULT_HEADER + '[]\n'), () => {
    assert.equal(readDisabledPluginIds('web').size, 0)
  })
})

test('write then read round-trips disabled ids preserving header and other blocks', () => {
  const dir = fakeProfile(DEFAULT_HEADER + '[]\n')
  withHome(dir, () => {
    writeDisabledPluginIds(new Set(['dsh-ads']), 'web')
    assert.deepEqual([...readDisabledPluginIds('web')], ['dsh-ads'])
    const text = readFileSync(join(dir, 'profiles', 'web', 'cordis.patch.yml'), 'utf8')
    assert.ok(text.includes('- id: dsh-ads'))
    assert.ok(text.includes('  disabled: true'))
    assert.ok(text.startsWith('# Your patch layer'))
    // enable again removes the block
    writeDisabledPluginIds(new Set(), 'web')
    assert.equal(readDisabledPluginIds('web').size, 0)
    const after = readFileSync(join(dir, 'profiles', 'web', 'cordis.patch.yml'), 'utf8')
    assert.ok(!after.includes('dsh-ads'))
  })
})

test('write preserves unrelated user patch blocks', () => {
  const dir = fakeProfile(
    DEFAULT_HEADER
      + '- id: some-plugin\n  config:\n    key: value\n'
      + '- insert:\n    - id: extra\n      name: extra\n',
  )
  withHome(dir, () => {
    writeDisabledPluginIds(new Set(['dsh-ads']), 'web')
    const text = readFileSync(join(dir, 'profiles', 'web', 'cordis.patch.yml'), 'utf8')
    assert.ok(text.includes('- id: some-plugin'))
    assert.ok(text.includes('key: value'))
    assert.ok(text.includes('- insert:'))
    assert.ok(text.includes('id: extra'))
    assert.ok(text.includes('- id: dsh-ads'))
  })
})

test('pluginEntryId parses insert id from a bundle patch file', () => {
  const dir = fakeProfile('[]\n')
  const nm = join(dir, 'profiles', 'web', 'node_modules', 'dsh-plugins-catalog')
  mkdirSync(nm, { recursive: true })
  writeFileSync(join(nm, 'package.json'), JSON.stringify({
    name: 'dsh-plugins-catalog',
    dsh: { bundle: { patch: './cordis.patch.yml' } },
  }))
  writeFileSync(join(nm, 'cordis.patch.yml'), '- insert:\n    - id: dsh-plugins-catalog\n      name: dsh-plugins-catalog\n')
  withHome(dir, () => {
    assert.equal(pluginEntryId(join(dir, 'profiles', 'web'), 'dsh-plugins-catalog'), 'dsh-plugins-catalog')
  })
})

test('setPluginEnabled blocks disabling the catalog itself', () => {
  withHome(fakeProfile('[]\n'), () => {
    const r = setPluginEnabled('Sakana-yuyu/dsh-plugins', false, 'web')
    assert.equal(r.ok, false)
  })
})
