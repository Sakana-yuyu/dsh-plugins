import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isSafeOpenUrl } from '../index.js'

test('isSafeOpenUrl allows github repo and pages', () => {
  assert.equal(isSafeOpenUrl('https://github.com/Sakana-yuyu/dsh-plugins'), true)
  assert.equal(isSafeOpenUrl('https://github.com/foo/bar/issues'), true)
  assert.equal(isSafeOpenUrl('https://sakana-yuyu.github.io/dsh-plugins/'), true)
})

test('isSafeOpenUrl rejects non-https and other hosts', () => {
  assert.equal(isSafeOpenUrl('http://github.com/foo/bar'), false)
  assert.equal(isSafeOpenUrl('https://evil.example/github.com'), false)
  assert.equal(isSafeOpenUrl('javascript:alert(1)'), false)
  assert.equal(isSafeOpenUrl(''), false)
})
