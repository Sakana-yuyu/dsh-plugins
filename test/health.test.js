import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  inspectPluginHealth,
  contactAuthor,
  issuesUrl,
} from '../index.js'

const FULL = 'LaplaceYoung/dsh-qq2006'

function tempDir() {
  return mkdtempSync(join(tmpdir(), 'dsh-plugins-health-'))
}

test('issuesUrl and contactAuthor point at GitHub issues', () => {
  assert.equal(issuesUrl(FULL), 'https://github.com/LaplaceYoung/dsh-qq2006/issues')
  assert.ok(contactAuthor(FULL).includes('https://github.com/LaplaceYoung/dsh-qq2006/issues'))
  assert.equal(issuesUrl('not-a-repo'), '')
})

test('inspectPluginHealth flags a missing package.json', () => {
  const dir = tempDir()
  try {
    const health = inspectPluginHealth(dir, FULL)
    assert.equal(health.ok, false)
    assert.ok(health.warning.includes('package.json'))
    assert.ok(health.warning.includes('请联系作者'))
    assert.equal(health.issues_url, 'https://github.com/LaplaceYoung/dsh-qq2006/issues')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('inspectPluginHealth flags missing dsh.bundle and missing main entry', () => {
  const dir = tempDir()
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: '@dsh-external/dsh-qq2006',
      main: 'lib/index.js',
    }))
    const health = inspectPluginHealth(dir, FULL)
    assert.equal(health.ok, false)
    assert.ok(health.problems.some(p => p.includes('lib/index.js')))
    assert.ok(health.problems.some(p => p.includes('dsh.bundle') || p.includes('dsh.client')))
    assert.ok(health.warning.includes('请联系作者提交 Issue'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('inspectPluginHealth accepts a catalog-shaped bundle', () => {
  const dir = tempDir()
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'dsh-plugins-catalog',
      main: 'index.js',
      dsh: {
        bundle: { patch: './cordis.patch.yml' },
        client: { inject: ['@deepseek-ai/dsh-client-runtime'] },
      },
    }))
    writeFileSync(join(dir, 'index.js'), 'export const name = "ok"\n')
    writeFileSync(join(dir, 'cordis.patch.yml'), 'plugins: []\n')
    const health = inspectPluginHealth(dir, 'Sakana-yuyu/dsh-plugins')
    assert.equal(health.ok, true)
    assert.equal(health.warning, '')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('inspectPluginHealth flags a declared but missing patch file', () => {
  const dir = tempDir()
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({
      name: 'broken-bundle',
      main: 'index.js',
      dsh: { bundle: { patch: './cordis.patch.yml' } },
    }))
    writeFileSync(join(dir, 'index.js'), 'export const name = "x"\n')
    const health = inspectPluginHealth(dir, 'someone/broken-bundle')
    assert.equal(health.ok, false)
    assert.ok(health.problems.some(p => p.includes('cordis.patch.yml')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
