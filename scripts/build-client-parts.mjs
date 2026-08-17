#!/usr/bin/env node
/**
 * Regenerate client-parts/*.js from client-src.js.
 *
 * The loader (index.js loadClientUi) serves every numbered part in order and
 * the browser concatenates them inside the module factory. The contract:
 *   parts.join('') === client-src factory body, with the first line's 4-space
 *   indent stripped (the header/footer wrapper lives in client.js).
 * Parts split at line boundaries, each part sized around CHUNK_TARGET bytes
 * (the last part holds the remainder).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'client-src.js')
const PARTS_DIR = join(ROOT, 'client-parts')
const CHUNK_TARGET = 8400

const src = readFileSync(SRC, 'utf8')
const bodyStart = src.indexOf('    var module = { exports: {} };')
if (bodyStart < 0) throw new Error('client-src.js: factory body start marker not found')
const bodyEndMarker = '    return module.exports;'
const bodyEnd = src.lastIndexOf(bodyEndMarker)
if (bodyEnd < 0) throw new Error('client-src.js: factory body end marker not found')
// Body includes the trailing return line; first line indent is stripped.
let body = src.slice(bodyStart, bodyEnd + bodyEndMarker.length)
if (body.startsWith('    ')) body = body.slice(4)

// Split at line boundaries, targeting CHUNK_TARGET bytes per part.
const lines = body.split('\n')
const parts = []
let current = ''
for (const line of lines) {
  const candidate = current === '' ? line : current + '\n' + line
  if (current !== '' && candidate.length > CHUNK_TARGET) {
    parts.push(current + '\n')
    current = line
  } else {
    current = candidate
  }
}
if (current !== '') parts.push(current)

const joined = parts.join('')
if (joined !== body) {
  throw new Error('split mismatch: parts do not reconstruct the factory body')
}
// Remove stale numbered parts, then write the new ones.
for (const name of readdirSync(PARTS_DIR)) {
  if (/^\d+\.js$/.test(name)) {
    writeFileSync(join(PARTS_DIR, name), '')
  }
}
for (let i = 0; i < parts.length; i++) {
  writeFileSync(join(PARTS_DIR, String(i + 1).padStart(2, '0') + '.js'), parts[i])
}
console.log(`wrote ${parts.length} parts (${joined.length} bytes total)`)
