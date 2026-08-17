import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as catalog from '../index.js'
const {
  installCmd,
  uninstallCmd,
  resolveUninstallItem,
  RESTART_HINT,
  launchVisiblePowerShell,
} = catalog

function fakeProfile(deps, extra) {
  const dir = mkdtempSync(join(tmpdir(), 'dsh-plugins-manage-'))
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

const FULL = 'Small-tailqwq/dsh-deep-whale'

test('uninstallCmd uses package name not github spec', () => {
  assert.equal(
    uninstallCmd('dsh-deep-whale'),
    'dsh plugin --profile web remove "dsh-deep-whale"',
  )
})

test('RESTART_HINT mentions 重启 or 退出', () => {
  assert.equal(typeof RESTART_HINT, 'string')
  assert.ok(RESTART_HINT.length > 0)
  assert.ok(/重启|退出/.test(RESTART_HINT))
})

test('installCmd still has #path: behavior', () => {
  assert.equal(
    installCmd(FULL, 'web', 'maid-atelier'),
    'dsh plugin --profile web add "github:Small-tailqwq/dsh-deep-whale#path:maid-atelier"',
  )
})

test('resolveUninstallItem returns null for empty or invalid target', () => {
  assert.equal(resolveUninstallItem(''), null)
  assert.equal(resolveUninstallItem(null), null)
  assert.equal(resolveUninstallItem(undefined), null)
  assert.equal(resolveUninstallItem('not-a-real-package-xyz-zzz'), null)
})

test('resolveUninstallItem matches alias-installed plugin by catalog short name', () => {
  // github:Nagi-ovo/dsh-ads is installed under the pnpm alias key
  // @dsh-external/dsh-ads; the store's uninstall button sends the catalog
  // short name "dsh-ads", which must resolve to the installed row so the
  // remove command uses the real dependency key.
  const dir = fakeProfile({ '@dsh-external/dsh-ads': 'github:Nagi-ovo/dsh-ads' })
  withHome(dir, () => {
    const hit = resolveUninstallItem('dsh-ads')
    assert.ok(hit)
    assert.equal(hit.name, '@dsh-external/dsh-ads')
    assert.equal(hit.full_name, 'Nagi-ovo/dsh-ads')
  })
})

test('resolveUninstallItem exact matches win over basename fallback', () => {
  const dir = fakeProfile({
    '@dsh-external/dsh-ads': 'github:Nagi-ovo/dsh-ads',
    'dsh-ads': 'file:../dsh-ads-local',
  })
  withHome(dir, () => {
    // The bare dependency key is itself a valid exact match.
    const byKey = resolveUninstallItem('dsh-ads')
    assert.ok(byKey)
    assert.equal(byKey.name, 'dsh-ads')
    // The scoped alias still resolves through the basename fallback.
    const byShort = resolveUninstallItem('dsh-ads')
    assert.ok(byShort)
  })
})

test('launchVisiblePowerShell is not exported / unused', () => {
  assert.equal(String(launchVisiblePowerShell), 'undefined')
})

test('silent runner exists and install path has no cmd start / -NoExit', () => {
  const src = readFileSync(fileURLToPath(new URL('../index.js', import.meta.url)), 'utf8')
  assert.ok(src.includes('runHiddenPowerShell'))
  assert.ok(src.includes('windowsHide: true'))
  assert.ok(src.includes('pluginEnv'))
  assert.ok(!src.includes('launchVisiblePowerShell'))
  assert.ok(!src.includes('-NoExit'))
  assert.ok(!src.includes('cmd.exe'))
  const launchIdx = src.indexOf('async function launchAdd')
  const nextFn = src.indexOf('async function installPlugin', launchIdx)
  const region = src.slice(launchIdx, nextFn > launchIdx ? nextFn : launchIdx + 2000)
  assert.ok(!region.includes('cmd.exe'))
  assert.ok(!region.includes('-NoExit'))
  assert.ok(!/['"]start['"]/.test(region))
})
