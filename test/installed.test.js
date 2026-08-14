import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectInstalledGithub, installCmd, toUpdateSpec } from '../index.js'

function fakeProfile(deps, extra) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-plugins-inst-'))
  const web = join(dir, 'profiles', 'web')
  mkdirSync(web, { recursive: true })
  const pkg = { name: 'web-profile', dependencies: deps, ...(extra || {}) }
  writeFileSync(join(web, 'package.json'), JSON.stringify(pkg, null, 2))
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

test('collects github dep', () => {
  const dir = fakeProfile({ 'dsh-deep-whale': 'github:Small-tailqwq/dsh-deep-whale#path:maid-atelier' })
  withHome(dir, () => {
    const rows = collectInstalledGithub()
    assert.ok(rows.some(x => x.full_name === 'Small-tailqwq/dsh-deep-whale' && x.source === 'github'))
  })
})

const SKIN = '@' + 'linxin666' + '/dsh-skins'
const OFF = '@deepseek-ai/dsh-base'

test('collects scoped package with dsh in name', () => {
  const deps = {}
  deps[SKIN] = '^1.2.0'
  withHome(fakeProfile(deps), () => {
    const hit = collectInstalledGithub().find(x => x.name === SKIN)
    assert.ok(hit)
    assert.equal(hit.source, 'npm')
    assert.equal(hit.full_name, '')
  })
})

test('skips official host packages', () => {
  const deps = {}
  deps[OFF] = '^1.0.0'
  deps['dsh-skins'] = '^1.0.0'
  withHome(fakeProfile(deps), () => {
    const rows = collectInstalledGithub()
    assert.ok(!rows.some(x => x.name === OFF))
    assert.ok(rows.some(x => x.name === 'dsh-skins'))
  })
})

test('collects file and link specs', () => {
  withHome(fakeProfile({ 'local-skin': 'file:../skins/foo', 'linked-ui': 'link:../ui' }), () => {
    const rows = collectInstalledGithub()
    assert.ok(rows.some(x => x.name === 'local-skin' && x.source === 'file'))
    assert.ok(rows.some(x => x.name === 'linked-ui' && x.source === 'link'))
  })
})

test('collects profile bundles', () => {
  withHome(fakeProfile({}, { dsh: { profile: { bundles: ['extra-dsh-bundle'] } } }), () => {
    const rows = collectInstalledGithub()
    assert.ok(rows.some(x => x.name === 'extra-dsh-bundle' && x.source === 'bundle'))
  })
})

test('installCmd uses package name when provided', () => {
  const pkg = '@' + 'linxin666' + '/dsh-web-ui-all'
  assert.equal(installCmd('zhu1090093659/dsh-web-ui', 'web', '', pkg), 'dsh plugin --profile web add "' + pkg + '"')
})

test('installCmd still emits github spec by default', () => {
  assert.equal(
    installCmd('Small-tailqwq/dsh-deep-whale', 'web', 'maid-atelier'),
    'dsh plugin --profile web add "github:Small-tailqwq/dsh-deep-whale#path:maid-atelier"',
  )
})

test('toUpdateSpec keeps github path', () => {
  assert.equal(
    toUpdateSpec({ spec: 'github:Small-tailqwq/dsh-deep-whale#path:maid-atelier' }),
    'github:Small-tailqwq/dsh-deep-whale#path:maid-atelier',
  )
})

test('toUpdateSpec uses package name and skips file specs', () => {
  assert.equal(toUpdateSpec({ name: SKIN, source: 'npm', spec: '^1.0.0' }), SKIN)
  assert.equal(toUpdateSpec({ name: 'local', source: 'file', spec: 'file:../x' }), '')
})
