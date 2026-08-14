import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import * as catalog from '../index.js'
const {
  installCmd,
  uninstallCmd,
  resolveUninstallItem,
  RESTART_HINT,
  launchVisiblePowerShell,
} = catalog

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
