import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizePath,
  githubSpec,
  parseGithubSpec,
  toUpdateSpec,
  isPlaceholderPkg,
  expand,
  installCmd,
  applyPathOverride,
  PLACEHOLDER_WARN,
} from '../index.js'

const FULL = 'Small-tailqwq/dsh-deep-whale'

test('installCmd without path', () => {
  assert.equal(
    installCmd(FULL),
    'dsh plugin --profile web add "github:Small-tailqwq/dsh-deep-whale"',
  )
})

test('installCmd with path maid-atelier', () => {
  assert.equal(
    installCmd(FULL, 'web', 'maid-atelier'),
    'dsh plugin --profile web add "github:Small-tailqwq/dsh-deep-whale#path:maid-atelier"',
  )
})

test('githubSpec omits empty path and rejects ../evil', () => {
  assert.equal(githubSpec(FULL, ''), 'github:Small-tailqwq/dsh-deep-whale')
  assert.equal(githubSpec(FULL), 'github:Small-tailqwq/dsh-deep-whale')
  assert.equal(githubSpec(FULL, '../evil'), 'github:Small-tailqwq/dsh-deep-whale')
})

test('parseGithubSpec keeps #path:maid-atelier; #main is NOT a path', () => {
  const withPath = parseGithubSpec('github:Small-tailqwq/dsh-deep-whale#path:maid-atelier')
  assert.equal(withPath.path, 'maid-atelier')
  assert.equal(withPath.full_name, FULL)
  assert.equal(withPath.spec, 'github:Small-tailqwq/dsh-deep-whale#path:maid-atelier')
  const main = parseGithubSpec('github:Small-tailqwq/dsh-deep-whale#main')
  assert.equal(main.path, '')
  assert.equal(main.spec, 'github:Small-tailqwq/dsh-deep-whale')
})

test('parseGithubSpec strips .git', () => {
  const parsed = parseGithubSpec('github:Small-tailqwq/dsh-deep-whale.git')
  assert.equal(parsed.full_name, 'Small-tailqwq/dsh-deep-whale')
  const withPath = parseGithubSpec('github:Small-tailqwq/dsh-deep-whale.git#path:maid-atelier')
  assert.equal(withPath.full_name, 'Small-tailqwq/dsh-deep-whale')
  assert.equal(withPath.path, 'maid-atelier')
})

test('toUpdateSpec preserves #path: from spec object', () => {
  assert.equal(
    toUpdateSpec({ spec: 'github:Small-tailqwq/dsh-deep-whale#path:maid-atelier' }),
    'github:Small-tailqwq/dsh-deep-whale#path:maid-atelier',
  )
})

test('expand reads compact key p and full path; omits empty', () => {
  const compact = expand({ n: 'dsh-deep-whale', f: FULL, c: 'ui', p: 'maid-atelier' })
  assert.equal(compact.path, 'maid-atelier')
  const full = expand({ name: 'dsh-deep-whale', full_name: FULL, category: 'ui', path: 'maid-atelier' })
  assert.equal(full.path, 'maid-atelier')
  const empty = expand({ n: 'dsh-deep-whale', f: FULL, c: 'ui' })
  assert.ok(!empty.path)
  const emptyP = expand({ n: 'dsh-deep-whale', f: FULL, c: 'ui', p: '' })
  assert.ok(!emptyP.path)
})

test('sanitizePath rejects ..', () => {
  assert.equal(sanitizePath('..'), '')
  assert.equal(sanitizePath('../evil'), '')
  assert.equal(sanitizePath('foo/../bar'), '')
  assert.equal(sanitizePath('maid-atelier'), 'maid-atelier')
})

test('applyPathOverride fills missing path only', () => {
  const ov = { [FULL]: 'maid-atelier' }
  const filled = applyPathOverride({ full_name: FULL }, ov)
  assert.equal(filled.path, 'maid-atelier')
  const kept = applyPathOverride({ full_name: FULL, path: 'already' }, ov)
  assert.equal(kept.path, 'already')
  const none = applyPathOverride({ full_name: 'other/repo' }, ov)
  assert.equal(none.path, undefined)
})

test('isPlaceholderPkg({_pnpmPlaceholder:true}) is true', () => {
  assert.equal(isPlaceholderPkg({ _pnpmPlaceholder: true }), true)
  assert.equal(isPlaceholderPkg({}), false)
  assert.equal(isPlaceholderPkg(null), false)
})

test('PLACEHOLDER_WARN is exported', () => {
  assert.equal(typeof PLACEHOLDER_WARN, 'string')
  assert.ok(PLACEHOLDER_WARN.length > 0)
})
