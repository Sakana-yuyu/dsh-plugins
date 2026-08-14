import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  cmpSemver,
  extractShaFromLock,
  selfPackageVersion,
  decideNewer,
} from '../index.js'

test('cmpSemver 0.2.8 > 0.2.7', () => {
  assert.equal(cmpSemver('0.2.8', '0.2.7'), 1)
  assert.equal(cmpSemver('0.2.8', '0.2.8'), 0)
  assert.equal(cmpSemver('0.2.7', '0.2.8'), -1)
})

test('cmpSemver 0.2.7 > 0.2.7-beta', () => {
  assert.equal(cmpSemver('0.2.7', '0.2.7-beta'), 1)
})

test('extractShaFromLock reads first github tarball sha', () => {
  const snippet = 'resolution: {tarball: https://codeload.github.com/Sakana-yuyu/dsh-plugins/tar.gz/61fc30485f71c87875fe865121f3445cf3eda3d5}'
  assert.equal(extractShaFromLock(snippet, 'Sakana-yuyu/dsh-plugins'), '61fc304')
})

test('selfPackageVersion returns package.json version', () => {
  const pkg = JSON.parse(readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'))
  assert.equal(selfPackageVersion(), pkg.version)
})

test('decideNewer version first, sha second; empty lastSelfSha is not current', () => {
  assert.equal(decideNewer({ localVer: '0.2.7', remoteVer: '0.2.8' }), true)
  assert.equal(decideNewer({ localVer: '0.2.8', remoteVer: '0.2.8', localSha: 'abc1234', remoteSha: 'abc1234' }), false)
  assert.equal(decideNewer({ localVer: '0.2.8', remoteVer: '0.2.8', localSha: 'abc1234', remoteSha: 'def5678' }), true)
  assert.equal(decideNewer({ localVer: '0.2.8', remoteVer: '', localSha: '', remoteSha: '' }), false)
  assert.equal(decideNewer({ localVer: '0.2.8', remoteVer: '0.2.8', localSha: '', remoteSha: 'abcdef0' }), false)
})
