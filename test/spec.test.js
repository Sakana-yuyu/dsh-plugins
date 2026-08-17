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
  isLinkInstall,
  row,
  findCatalogHit,
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

test('expand compact im link keeps install link', () => {
  const compact = expand({
    n: 'awesome-dsh-plugins',
    f: 'AdamPlatin123/awesome-dsh-plugins',
    c: 'awesome',
    im: 'link',
  })
  assert.equal(compact.install, 'link')
  assert.equal(isLinkInstall(compact), true)
})

test('row omits install command for link catalogs', () => {
  const r = row({
    name: 'awesome-dsh-plugins',
    full_name: 'AdamPlatin123/awesome-dsh-plugins',
    category: 'awesome',
    category_zh: '目录与精选',
    install: 'link',
    html_url: 'https://github.com/AdamPlatin123/awesome-dsh-plugins',
  })
  assert.equal(r.install_method, 'link')
  assert.equal(r.install, '')
  assert.equal(r.spec, '')
})

test('row treats radar awesome lists as link even without install field', () => {
  const r = row({
    name: 'awesome-dsh-plugins',
    full_name: 'AdamPlatin123/awesome-dsh-plugins',
    category: 'awesome',
    html_url: 'https://github.com/AdamPlatin123/awesome-dsh-plugins',
  })
  assert.equal(r.install_method, 'link')
  assert.equal(r.install, '')
})

const TABBIT = { name: 'dsh-plugin', full_name: 'Tabbit-Browser/dsh-plugin' }
const ADS = { name: 'dsh-ads', full_name: 'Nagi-ovo/dsh-ads' }

test('findCatalogHit does not map awesome-dsh-plugins onto Tabbit via substring', () => {
  // "awesome-dsh-plugins" contains the substring "dsh-plugin", which used to
  // steal Tabbit-Browser/dsh-plugin's catalog card and break uninstall.
  const hit = findCatalogHit([TABBIT, ADS], {
    name: 'awesome-dsh-plugins',
    full_name: 'AdamPlatin123/awesome-dsh-plugins',
  })
  assert.equal(hit, null)
})

test('findCatalogHit matches exact full_name even when package name differs', () => {
  const hit = findCatalogHit([TABBIT], {
    name: 'tabbit-browser',
    full_name: 'Tabbit-Browser/dsh-plugin',
  })
  assert.ok(hit)
  assert.equal(hit.full_name, TABBIT.full_name)
})

test('findCatalogHit matches scoped alias to unique repo basename', () => {
  const hit = findCatalogHit([TABBIT, ADS], {
    name: '@dsh-external/dsh-ads',
    full_name: '',
  })
  assert.ok(hit)
  assert.equal(hit.full_name, ADS.full_name)
})

test('toUpdateSpec skips pnpm placeholder packages', () => {
  assert.equal(toUpdateSpec({
    name: 'awesome-dsh-plugins',
    full_name: 'AdamPlatin123/awesome-dsh-plugins',
    spec: 'github:AdamPlatin123/awesome-dsh-plugins',
    source: 'github',
    placeholder: true,
  }), '')
})
