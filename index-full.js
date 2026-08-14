import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'dsh-plugins-catalog'
export const inject = ['tools', 'webServer']

const CATALOG_BASE = 'https://sakana-yuyu.github.io/dsh-plugins'
const SELF_FULL = 'Sakana-yuyu/dsh-plugins'
const PREFS_NAME = 'dsh-plugins-prefs.json'
const DEFAULT_PREFS = {
  showSidebar: true,
  coverSize: 'large',
  autoUpdateSelf: true,
  autoUpdateOthers: false,
  lastCheck: 0,
  lastSelfSha: '',
}
const CATS = {
  official: { zh: '官方核心', en: 'Official core' },
  ui: { zh: 'UI 与皮肤', en: 'UI & skins' },
  vision: { zh: '视觉', en: 'Vision' },
  tui: { zh: '终端 TUI', en: 'Terminal TUI' },
  desktop: { zh: '桌面客户端', en: 'Desktop' },
  browser: { zh: '浏览器', en: 'Browser' },
  workflow: { zh: '工作流与多智能体', en: 'Workflow & agents' },
  tools: { zh: '工具与技能', en: 'Tools & skills' },
  search: { zh: '搜索与研究', en: 'Search & research' },
  dev: { zh: '开发与代码', en: 'Dev & code' },
  awesome: { zh: '目录与精选', en: 'Awesome lists' },
  other: { zh: '其他', en: 'Other' },
}

const PLACEHOLDER_WARN = '该插件仓库的包不在根目录，需要子目录信息，请向目录维护者补充 path 字段'
const BUILTIN_PATHS = {
  'Small-tailqwq/dsh-deep-whale': 'maid-atelier',
}

function sanitizePath(raw) {
  const s = String(raw || '').trim().replace(/^\/+|\/+$/g, '')
  if (!s || s.includes('..') || !/^[A-Za-z0-9_./-]+$/.test(s)) return ''
  return s
}

function githubSpec(fullName, path) {
  const full = String(fullName || '').trim()
  const sub = sanitizePath(path)
  return sub ? ('github:' + full + '#path:' + sub) : ('github:' + full)
}

function parseGithubSpec(spec) {
  let s = String(spec || '').trim()
  if (s.startsWith('github:')) s = s.slice(7)
  const q = s.indexOf('?')
  if (q >= 0) s = s.slice(0, q)
  let frag = ''
  const hash = s.indexOf('#')
  let rest = s
  if (hash >= 0) {
    rest = s.slice(0, hash)
    frag = s.slice(hash + 1)
  }
  rest = rest.replace(/\.git$/, '')
  let path = ''
  if (frag) {
    const parts = frag.split('&')
    for (const part of parts) {
      if (part.startsWith('path:')) {
        path = sanitizePath(decodeURIComponent(part.slice(5)))
        break
      }
    }
  }
  return { full_name: rest, path, spec: githubSpec(rest, path) }
}

function toUpdateSpec(item) {
  if (!item) return ''
  if (typeof item === 'string') {
    const raw = item.trim()
    if (!raw) return ''
    if (raw.startsWith('file:') || raw.startsWith('link:') || raw.startsWith('workspace:')) return ''
    if (raw.startsWith('github:')) return parseGithubSpec(raw).spec
    if (raw.includes('#path:') || validFullName(raw.split('#')[0])) {
      return parseGithubSpec(raw.startsWith('github:') ? raw : ('github:' + raw)).spec
    }
    return isNpmName(raw) ? raw : ''
  }
  const source = item.source || classifySpec(item.spec)
  if (source === 'file' || source === 'link' || source === 'nested') return ''
  if (source === 'github' || (item.spec && String(item.spec).startsWith('github:'))) {
    return parseGithubSpec(item.spec || githubSpec(item.full_name, item.path)).spec
  }
  if (item.full_name && validFullName(item.full_name) && source !== 'n'+'pm' && source !== 'bundle') {
    return githubSpec(item.full_name, item.path)
  }
  return String(item.name || '').trim()
}

function isPlaceholderPkg(pkg) {
  return !!(pkg && typeof pkg === 'object' && pkg._pnpmPlaceholder)
}

function issuesUrl(fullName) {
  if (!validFullName(fullName)) return ''
  return 'https://github.com/' + fullName + '/issues'
}

function contactAuthor(fullName) {
  const url = issuesUrl(fullName)
  return url ? ('请联系作者提交 Issue：' + url) : '请联系插件作者。'
}

function resolvePkgEntry(pkg) {
  const exp = pkg && pkg.exports && pkg.exports['.']
  if (typeof exp === 'string') return exp
  if (exp && typeof exp === 'object') {
    return exp.default || exp.import || exp.require || ''
  }
  return (pkg && pkg.main) || ''
}

/**
 * Inspect an installed package directory for a loadable DSH plugin.
 * Missing bundle/client metadata or a missing main entry means Host will
 * not mount it; the warning tells the user to contact the repo author.
 */
function inspectPluginHealth(pkgDir, fullName) {
  const issues_url = issuesUrl(fullName)
  const contact = contactAuthor(fullName)
  const problems = []
  let placeholder = false
  const pkgFile = join(pkgDir, 'package.json')
  if (!existsSync(pkgFile)) {
    problems.push('安装目录里没有 package.json')
  } else {
    let pkg
    try {
      pkg = JSON.parse(readFileSync(pkgFile, 'utf8'))
    } catch {
      pkg = null
    }
    if (!pkg || typeof pkg !== 'object') {
      problems.push('package.json 无法解析')
    } else if (isPlaceholderPkg(pkg)) {
      placeholder = true
      problems.push(PLACEHOLDER_WARN)
    } else {
      const entry = resolvePkgEntry(pkg)
      if (entry && !existsSync(join(pkgDir, entry))) {
        problems.push('缺少入口文件 ' + entry + '（仓库可能只提交了源码、没有构建产物）')
      }
      const dsh = pkg.dsh
      const patch = dsh && dsh.bundle && dsh.bundle.patch
      const client = dsh && dsh.client
      if (!patch && !client) {
        problems.push('未声明 dsh.bundle 或 dsh.client，Host 不会加载此插件')
      }
      if (patch && !existsSync(join(pkgDir, patch))) {
        problems.push('声明了 dsh.bundle 但缺少 patch 文件 ' + patch)
      }
    }
  }
  const ok = problems.length === 0
  return {
    ok,
    placeholder,
    problems,
    warning: ok ? '' : (problems.join('；') + '。' + contact),
    contact,
    issues_url,
  }
}

function expand(p) {
  const path = sanitizePath(p && (p.p || p.path))
  if (p && p.full_name && p.name && p.category) {
    if (path) return { ...p, path }
    if (p.path) {
      const next = { ...p }
      delete next.path
      return next
    }
    return p
  }
  const cat = (p && (p.c || p.category)) || 'other'
  const labels = CATS[cat] || CATS.other
  const full = (p && (p.f || p.full_name)) || ''
  const out = {
    rank: p.r || p.rank,
    name: p.n || p.name,
    full_name: full,
    html_url: p.u || p.html_url || ('https://github.com/' + full),
    description_zh: p.z || p.description_zh,
    description_en: p.e || p.description_en,
    description: p.z || p.e || p.description,
    stars: p.s || p.stars || 0,
    language: p.l || p.language,
    official: !!(p.o || p.official),
    category: cat,
    category_zh: p.category_zh || labels.zh,
    category_en: p.category_en || labels.en,
    clone_url: p.clone_url || ('https://github.com/' + full + '.git'),
    install: p.im || p.install || 'github',
    npm_name: p.npm || p.npm_name || '',
  }
  if (path) out.path = path
  return out
}

function applyPathOverride(item, overrides) {
  if (!item || item.path) return item
  const ov = sanitizePath(overrides && overrides[item.full_name])
  if (!ov) return item
  return { ...item, path: ov }
}

function rowPkg(p) {
  if (!p) return ''
  const name = String((p.npm_name || p.npm || '')).trim()
  if (!name) return ''
  const m = p.install || p.im || p.install_method || ''
  return m === 'npm' ? name : ''
}

function installCmd(fullName, profile, path, pkgName) {
  const pkg = String(pkgName || '').trim()
  const spec = pkg || githubSpec(fullName, path)
  return 'dsh plugin --profile ' + (profile || 'web') + ' add "' + spec + '"'
}


const RESTART_HINT = '请完全退出 dsh-desktop 再打开，插件才会生效。'

function uninstallCmd(pkgName, profile) {
  return 'dsh plugin --profile ' + (profile || 'web') + ' remove "' + String(pkgName || '').trim() + '"'
}

function resolveUninstallItem(target) {
  const t = String(target || '').trim()
  if (!t) return null
  const installed = collectInstalledGithub()
  let hit = installed.find(x => x.name === t)
  if (hit) return hit
  const raw = t.startsWith('github:') ? t : (t.includes('/') ? ('github:' + t) : '')
  if (raw) {
    const parsed = parseGithubSpec(raw)
    hit = installed.find(x => x.spec === parsed.spec || x.spec === t)
    if (hit) return hit
    if (parsed.path) {
      hit = installed.find(x => x.full_name === parsed.full_name && x.path === parsed.path)
      if (hit) return hit
    }
    hit = installed.find(x => x.full_name === parsed.full_name)
    if (hit) return hit
  }
  return null
}

function pluginEnv() {
  const env = { ...process.env }
  if (!env.DSH_HOME) env.DSH_HOME = resolveDshHome()
  return env
}

let cache = null
async function loadCatalog() {
  if (cache) return cache
  const parts = await Promise.all(Array.from({ length: 26 }, (_, i) =>
    fetch(CATALOG_BASE + '/s' + (i + 1) + '.json').then(r => r.ok ? r.json() : []).catch(() => [])
  ))
  let items = parts.flat().map(expand)
  if (items.length < 20) {
    const seed = await fetch(CATALOG_BASE + '/catalog.json').then(r => r.ok ? r.json() : []).catch(() => [])
    items = seed.map(expand)
  }
  const remotePaths = await fetch(CATALOG_BASE + '/path-overrides.json').then(r => r.ok ? r.json() : {}).catch(() => ({}))
  const overrides = { ...BUILTIN_PATHS, ...(remotePaths && typeof remotePaths === 'object' ? remotePaths : {}) }
  items = items.map(item => applyPathOverride(item, overrides))
  cache = items
  return items
}

function filterItems(items, query, category, officialOnly) {
  const q = (query || '').trim().toLowerCase()
  return items.filter(p => {
    if (officialOnly && !p.official) return false
    if (category && category !== 'all' && p.category !== category) return false
    if (!q) return true
    const blob = [p.name, p.full_name, p.description, p.description_zh, p.description_en].join(' ').toLowerCase()
    return blob.includes(q)
  })
}

function row(p) {
  const out = {
    rank: p.rank,
    name: p.name,
    full_name: p.full_name,
    stars: p.stars,
    official: p.official,
    category: p.category_zh || p.category,
    install: installCmd(p.full_name, 'web', p.path, rowPkg(p)),
    spec: rowPkg(p) || githubSpec(p.full_name, p.path),
    clone: p.clone_url,
    url: p.html_url,
    description: p.description_zh || p.description || p.description_en,
  }
  if (p.path) out.path = p.path
  const pkg = rowPkg(p)
  if (pkg) {
    out.install_method = 'n'+'pm'
    out.npm_name = pkg
  } else {
    out.install_method = 'github'
    out.npm_name = ''
  }
  return out
}

function apiRow(p) {
  const r = row(p)
  const full = r.full_name || ''
  const slash = full.indexOf('/')
  const out = {
    rank: r.rank,
    name: r.name,
    full_name: full,
    author: slash > 0 ? full.slice(0, slash) : '',
    stars: r.stars,
    official: r.official,
    category: p.category,
    category_zh: p.category_zh || r.category,
    description: r.description,
    description_zh: p.description_zh || '',
    description_en: p.description_en || '',
    install: r.install,
    spec: r.spec,
    url: r.url,
  }
  if (p.path || r.path) out.path = p.path || r.path
  out.install_method = r.install_method || 'github'
  out.npm_name = r.npm_name || ''
  return out
}

function validFullName(full) {
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full)
}

function safeProfile(value) {
  return String(value || 'web').replace(/[^A-Za-z0-9_-]/g, '') || 'web'
}

function userHome() {
  return process.env.USERPROFILE || process.env.HOME || ''
}

function resolveDshHome() {
  if (process.env.DSH_HOME) return process.env.DSH_HOME
  const home = userHome()
  if (home) {
    const desk = join(home, 'DeepSeek Harness', 'dsh-home')
    if (existsSync(desk)) return desk
    const dot = join(home, '.dsh')
    if (existsSync(dot)) return dot
  }
  return process.cwd()
}

function prefsPath() {
  return join(resolveDshHome(), PREFS_NAME)
}

function loadPrefs() {
  const out = { ...DEFAULT_PREFS }
  try {
    const raw = readFileSync(prefsPath(), 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      if (typeof parsed.showSidebar === 'boolean') out.showSidebar = parsed.showSidebar
      if (parsed.coverSize === 'medium' || parsed.coverSize === 'large') out.coverSize = parsed.coverSize
      if (typeof parsed.autoUpdateSelf === 'boolean') out.autoUpdateSelf = parsed.autoUpdateSelf
      if (typeof parsed.autoUpdateOthers === 'boolean') out.autoUpdateOthers = parsed.autoUpdateOthers
      if (typeof parsed.lastCheck === 'number') out.lastCheck = parsed.lastCheck
      if (typeof parsed.lastSelfSha === 'string') out.lastSelfSha = parsed.lastSelfSha
    }
  } catch {}
  return out
}

function savePrefs(prefs) {
  const next = { ...DEFAULT_PREFS, ...prefs }
  writeFileSync(prefsPath(), JSON.stringify(next, null, 2))
  return next
}

function mergePrefs(body) {
  const cur = loadPrefs()
  if (!body || typeof body !== 'object') return savePrefs(cur)
  if (typeof body.showSidebar === 'boolean') cur.showSidebar = body.showSidebar
  if (body.coverSize === 'medium' || body.coverSize === 'large') cur.coverSize = body.coverSize
  if (typeof body.autoUpdateSelf === 'boolean') cur.autoUpdateSelf = body.autoUpdateSelf
  if (typeof body.autoUpdateOthers === 'boolean') cur.autoUpdateOthers = body.autoUpdateOthers
  if (typeof body.lastCheck === 'number') cur.lastCheck = body.lastCheck
  if (typeof body.lastSelfSha === 'string') cur.lastSelfSha = body.lastSelfSha
  return savePrefs(cur)
}

function webPackageCandidates() {
  const homes = []
  if (process.env.DSH_HOME) homes.push(process.env.DSH_HOME)
  const home = userHome()
  if (home) {
    homes.push(join(home, 'DeepSeek Harness', 'dsh-home'))
    homes.push(join(home, '.dsh'))
  }
  homes.push(resolveDshHome())
  homes.push(process.cwd())
  const paths = []
  const seen = new Set()
  for (const h of homes) {
    const p = join(h, 'profiles', 'web', 'package.json')
    if (!seen.has(p)) { seen.add(p); paths.push(p) }
  }
  if (!seen.has('profiles/web/package.json')) paths.push('profiles/web/package.json')
  return paths
}

function classifySpec(spec) {
  const s = String(spec || '').trim()
  if (s.startsWith('github:')) return 'github'
  if (s.startsWith('file:')) return 'file'
  if (s.startsWith('link:')) return 'link'
  if (s.startsWith('workspace:')) return 'file'
  if (/\.tgz(\b|$)/i.test(s)) return 'file'
  if (s) return 'npm'
  return ''
}

function isOfficialHost(name) {
  return String(name || '').startsWith('@deepseek-ai/')
}

function isLocalishSpec(spec) {
  const s = String(spec || '').trim()
  return s.startsWith('github:') || s.startsWith('file:') || s.startsWith('link:') || s.startsWith('workspace:') || /\.tgz(\b|$)/i.test(s)
}

function isNpmName(name) {
  const n = String(name || '').trim()
  if (!n || n.startsWith('github:') || n.startsWith('file:') || n.startsWith('link:')) return false
  if (n.startsWith('@')) return /^@[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(n)
  return /^[A-Za-z0-9._-]+$/.test(n)
}

function readNmPkg(root, name) {
  try {
    const file = join(root, 'node_modules', name, 'package.json')
    if (!existsSync(file)) return null
    const pkg = JSON.parse(readFileSync(file, 'utf8'))
    return pkg && typeof pkg === 'object' ? pkg : null
  } catch {
    return null
  }
}

function hasDshField(pkg) {
  return !!(pkg && pkg.dsh && typeof pkg.dsh === 'object')
}

function findCatalogHit(catalog, row) {
  if (!Array.isArray(catalog) || !row) return null
  const full = String(row.full_name || '')
  const name = String(row.name || '')
  const unscoped = name.includes('/') ? name.slice(name.lastIndexOf('/') + 1) : name
  let hit = full ? catalog.find(x => x && x.full_name === full) : null
  if (hit) return hit
  hit = name ? catalog.find(x => x && x.name === name) : null
  if (hit) return hit
  if (!name && !full) return null
  return catalog.find(x => {
    if (!x) return false
    const xf = String(x.full_name || '')
    const xn = String(x.name || '')
    if (name && xf && (xf === name || xf.endsWith('/' + unscoped) || xf.includes(name) || name.includes(xf))) return true
    if (full && xn && (xn === full || full.includes(xn) || xn.includes(full))) return true
    if (name && xn && (xn === unscoped || name.endsWith('/' + xn))) return true
    return false
  }) || null
}

function shouldKeepDep(name, spec, nmPkg, catalog) {
  if (isOfficialHost(name)) return false
  if (isLocalishSpec(spec)) return true
  if (hasDshField(nmPkg)) return true
  if (/dsh/i.test(name)) return true
  if (findCatalogHit(catalog, { name, full_name: '' })) return true
  return false
}

function listTopLevelNodeModules(nmRoot) {
  const names = []
  if (!existsSync(nmRoot)) return names
  let entries
  try { entries = readdirSync(nmRoot) } catch { return names }
  for (const ent of entries) {
    if (!ent || ent.startsWith('.')) continue
    if (ent.startsWith('@')) {
      let kids
      try { kids = readdirSync(join(nmRoot, ent)) } catch { continue }
      for (const kid of kids) {
        if (!kid || kid.startsWith('.')) continue
        names.push(ent + '/' + kid)
      }
    } else names.push(ent)
  }
  return names
}

function findParentDep(directNames, root, childName) {
  for (const parent of directNames) {
    const pkg = readNmPkg(root, parent)
    if (!pkg) continue
    for (const bag of [pkg.dependencies, pkg.devDependencies, pkg.optionalDependencies]) {
      if (bag && typeof bag === 'object' && Object.prototype.hasOwnProperty.call(bag, childName)) return parent
    }
  }
  return ''
}

function makeInstalledRow(root, name, spec, source, extra) {
  let full_name = ''
  let path = ''
  const s = String(spec || '')
  if (s.startsWith('github:')) {
    const parsed = parseGithubSpec(s)
    if (validFullName(parsed.full_name)) full_name = parsed.full_name
    path = parsed.path || ''
  }
  const health = inspectPluginHealth(join(root, 'node_modules', name), full_name)
  return {
    full_name, path, spec: s || name, name, source,
    placeholder: health.placeholder, warning: health.warning,
    usable: health.ok, issues_url: health.issues_url,
    removable: extra && extra.removable === false ? false : true,
    parent: (extra && extra.parent) || '',
  }
}

function collectInstalledPlugins(catalog) {
  const cat = Array.isArray(catalog) ? catalog : (cache || [])
  const out = []
  const seen = new Set()
  function remember(row) {
    const key = row.name || row.spec || (row.full_name + '#' + (row.path || ''))
    if (!key || seen.has(key)) return
    seen.add(key)
    out.push(row)
  }
  for (const p of webPackageCandidates()) {
    let pkg
    try {
      if (!existsSync(p)) continue
      pkg = JSON.parse(readFileSync(p, 'utf8'))
    } catch { continue }
    if (!pkg || typeof pkg !== 'object') continue
    const root = dirname(p)
    const directNames = []
    for (const bag of [pkg.dependencies, pkg.devDependencies]) {
      if (!bag || typeof bag !== 'object') continue
      for (const [depName, spec] of Object.entries(bag)) {
        if (isOfficialHost(depName)) continue
        const s = String(spec || '')
        const nmPkg = readNmPkg(root, depName)
        if (!shouldKeepDep(depName, s, nmPkg, cat)) continue
        remember(makeInstalledRow(root, depName, s, classifySpec(s) || 'n'+'pm', { removable: true }))
        directNames.push(depName)
      }
    }
    const bundles = pkg.dsh && pkg.dsh.profile && Array.isArray(pkg.dsh.profile.bundles) ? pkg.dsh.profile.bundles : []
    for (const raw of bundles) {
      const depName = String(raw || '').trim()
      if (!depName || isOfficialHost(depName) || seen.has(depName)) continue
      const nmPkg = readNmPkg(root, depName)
      if (!shouldKeepDep(depName, depName, nmPkg, cat) && !hasDshField(nmPkg) && !/dsh/i.test(depName)) continue
      remember(makeInstalledRow(root, depName, depName, 'bundle', { removable: directNames.includes(depName) }))
    }
    const nmRoot = join(root, 'node_modules')
    for (const depName of listTopLevelNodeModules(nmRoot)) {
      if (isOfficialHost(depName) || seen.has(depName)) continue
      const nmPkg = readNmPkg(root, depName)
      if (!hasDshField(nmPkg)) continue
      const parent = findParentDep(directNames, root, depName)
      remember(makeInstalledRow(root, depName, (nmPkg && nmPkg.name) || depName, 'nested', { removable: false, parent }))
    }
    if (out.length) return out
  }
  return out
}

const collectInstalledGithub = collectInstalledPlugins

function allUpdateFulls() {
  const items = collectInstalledGithub()
  const specs = items.map(toUpdateSpec).filter(Boolean)
  if (!items.some(x => x.full_name === SELF_FULL)) specs.push(githubSpec(SELF_FULL, ''))
  return specs
}

function cmpSemver(a, b) {
  function parse(v) {
    v = String(v || "").trim().replace(/^v/i, "")
    const m = v.match(/^(\d+(?:\.\d+)*)(.*)$/)
    if (!m) return { nums: [0], pre: v }
    const nums = m[1].split(".").map(n => parseInt(n, 10) || 0)
    const pre = m[2] || ""
    return { nums, pre }
  }
  const A = parse(a)
  const B = parse(b)
  const n = Math.max(A.nums.length, B.nums.length)
  for (let i = 0; i < n; i++) {
    const x = A.nums[i] || 0
    const y = B.nums[i] || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  if (!A.pre && B.pre) return 1
  if (A.pre && !B.pre) return -1
  if (A.pre > B.pre) return 1
  if (A.pre < B.pre) return -1
  return 0
}

function extractShaFromLock(text, fullName) {
  const full = String(fullName || "").trim()
  if (!full || text == null) return ""
  const escaped = full.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const re = new RegExp("codeload\\.github\\.com/" + escaped + "/tar\\.gz/([0-9a-fA-F]+)", "i")
  const m = String(text).match(re)
  if (!m) return ""
  return m[1].slice(0, 7)
}

function selfPackageVersion() {
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const pkg = JSON.parse(readFileSync(join(here, "package.json"), "utf8"))
    return String((pkg && pkg.version) || "")
  } catch {
    return ""
  }
}

function webProfileRoots() {
  const roots = []
  const seen = new Set()
  for (const p of webPackageCandidates()) {
    const root = dirname(p)
    if (seen.has(root)) continue
    seen.add(root)
    roots.push(root)
  }
  return roots
}

function readInstalledMeta(item) {
  let version = ""
  let sha = ""
  const name = item && item.name
  const full = (item && item.full_name) || ""
  for (const root of webProfileRoots()) {
    if (name) {
      try {
        const nm = join(root, "node_modules", name, "package.json")
        if (existsSync(nm)) {
          const np = JSON.parse(readFileSync(nm, "utf8"))
          if (np && !isPlaceholderPkg(np)) {
            if (np.version) version = String(np.version)
            if (np.gitHead) sha = String(np.gitHead).slice(0, 7)
          }
        }
      } catch {}
    }
    if (!sha && full) {
      try {
        const names = readdirSync(root)
        for (const n of names) {
          if (!/\.(yaml|yml|json)$/i.test(n)) continue
          if (n.toLowerCase().indexOf("lock") < 0) continue
          const extracted = extractShaFromLock(readFileSync(join(root, n), "utf8"), full)
          if (extracted) { sha = extracted; break }
        }
      } catch {}
    }
    if (version || sha) break
  }
  return { version, sha }
}

function decideNewer(input) {
  const localVer = String((input && input.localVer) || "")
  const remoteVer = String((input && input.remoteVer) || "")
  const localSha = String((input && input.localSha) || "")
  const remoteSha = String((input && input.remoteSha) || "")
  if (localVer && remoteVer && cmpSemver(remoteVer, localVer) > 0) return true
  const sameOrMissing = !localVer || !remoteVer || cmpSemver(remoteVer, localVer) === 0
  if (localSha && remoteSha && localSha !== remoteSha && sameOrMissing) return true
  return false
}

function decideStatus(input) {
  if (input && input.newer) return "newer"
  const remoteVer = String((input && input.remoteVer) || "")
  const remoteSha = String((input && input.remoteSha) || "")
  if (!remoteVer && !remoteSha) return "error"
  const localVer = String((input && input.localVer) || "")
  const localSha = String((input && input.localSha) || "")
  if ((localVer && remoteVer) || (localSha && remoteSha)) return "latest"
  return "unknown"
}

async function fetchRemotePackage(fullName, subPath) {
  const full = String(fullName || "").trim()
  if (!validFullName(full)) return { version: "" }
  const prefix = sanitizePath(subPath)
  const mid = prefix ? (prefix + "/") : ""
  for (const ref of ["HEAD", "main"]) {
    const url = "https://raw.githubusercontent.com/" + full + "/" + ref + "/" + mid + "package.json"
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 8000)
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "dsh-plugins-catalog" },
        signal: ac.signal,
      })
      if (!r.ok) continue
      const data = await r.json()
      if (data && data.version) return { version: String(data.version) }
    } catch {
    } finally {
      clearTimeout(timer)
    }
  }
  return { version: "" }
}

async function fetchRemoteNpm(name) {
  const n = String(name || "").trim()
  if (!n || !isNpmName(n)) return { version: "" }
  const url = "https://registry.npmjs.org/" + encodeURIComponent(n) + "/latest"
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), 8000)
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "dsh-plugins-catalog" },
      signal: ac.signal,
    })
    if (!r.ok) return { version: "" }
    const data = await r.json()
    const ver = (data && (data.version || (data["dist-tags"] && data["dist-tags"].latest))) || ""
    return { version: ver ? String(ver) : "" }
  } catch {
    return { version: "" }
  } finally {
    clearTimeout(timer)
  }
}

async function fetchRemoteSha(fullName) {
  const full = String(fullName || "").trim()
  if (!validFullName(full)) return ""
  for (const ref of ["HEAD", "main"]) {
    const ac = new AbortController()
    const timer = setTimeout(() => ac.abort(), 8000)
    try {
      const r = await fetch("https://api.github.com/repos/" + full + "/commits/" + ref, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "dsh-plugins-catalog",
        },
        signal: ac.signal,
      })
      if (!r.ok) continue
      const data = await r.json()
      const sha = String((data && data.sha) || "")
      if (sha) return sha.slice(0, 7)
    } catch {
    } finally {
      clearTimeout(timer)
    }
  }
  return ""
}

async function poolMap(items, limit, fn) {
  const out = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  const n = Math.max(1, Math.min(limit || 4, items.length || 1))
  await Promise.all(Array.from({ length: n }, () => worker()))
  return out
}

async function checkOne(item) {
  const full = (item && item.full_name) || ""
  const isSelf = full === SELF_FULL
  const local = readInstalledMeta(item)
  const localVer = isSelf ? (selfPackageVersion() || local.version || "") : (local.version || "")
  const localSha = local.sha || ""
  let remoteVer = ""
  if (validFullName(full)) {
    const remotePkg = await fetchRemotePackage(full, item && item.path)
    remoteVer = (remotePkg && remotePkg.version) || ""
  } else if (item && item.name && item.source !== "file" && item.source !== "link" && item.source !== "nested") {
    const remotePkg = await fetchRemoteNpm(item.name)
    remoteVer = (remotePkg && remotePkg.version) || ""
  }
  const verNewer = !!(localVer && remoteVer && cmpSemver(remoteVer, localVer) > 0)
  let remoteSha = ""
  if (validFullName(full) && (isSelf || !verNewer)) remoteSha = await fetchRemoteSha(full)
  const newer = decideNewer({ localVer, remoteVer, localSha, remoteSha })
  const status = decideStatus({ localVer, remoteVer, localSha, remoteSha, newer })
  return {
    ...item,
    version: localVer,
    current: localVer,
    latest: remoteVer,
    currentSha: localSha,
    latestSha: remoteSha,
    newer,
    status,
    self: isSelf,
  }
}

async function checkUpdates(persist) {
  const prefs = loadPrefs()
  let catalog = []
  try { catalog = await loadCatalog() } catch { catalog = [] }
  const installed = collectInstalledGithub(catalog)
  const items = installed.slice()
  if (!items.some(x => x.full_name === SELF_FULL || x.name === "dsh-plugins-catalog")) {
    items.push({
      full_name: SELF_FULL,
      path: "",
      spec: githubSpec(SELF_FULL, ""),
      name: "dsh-plugins-catalog",
      placeholder: false,
      warning: "",
    })
  }
  const results = await poolMap(items, 4, checkOne)
  const enriched = results.map(row => {
    const hit = findCatalogHit(catalog, row)
    return { ...row, catalog: hit ? apiRow(hit) : (row.catalog || null) }
  })
  const selfRow = enriched.find(x => x.full_name === SELF_FULL) || enriched[0] || {
    full_name: SELF_FULL,
    current: selfPackageVersion(),
    latest: "",
    currentSha: "",
    latestSha: "",
    newer: false,
    status: "error",
  }
  const checkedAt = Date.now()
  if (persist) {
    prefs.lastCheck = checkedAt
    savePrefs(prefs)
  }
  const newerCount = enriched.filter(x => x.newer).length
  return {
    ok: true,
    self: {
      full_name: SELF_FULL,
      current: selfRow.current || "",
      latest: selfRow.latest || "",
      currentSha: selfRow.currentSha || "",
      latestSha: selfRow.latestSha || "",
      newer: !!selfRow.newer,
      status: selfRow.status || "unknown",
    },
    installed: enriched,
    newerCount,
    warnings: enriched.filter(x => x.warning).map(x => (x.full_name || x.name || "?") + ": " + x.warning),
    checkedAt,
    restartHint: RESTART_HINT,
  }
}

let nodeCp = null
let nodeFs = null
async function loadNodeMods() {
  if (!nodeCp) nodeCp = await import('node:child_process')
  if (!nodeFs) nodeFs = await import('node:fs')
  return { spawn: nodeCp.spawn, spawnSync: nodeCp.spawnSync, existsSync: nodeFs.existsSync }
}

function commandExistsSync(spawnSync, name) {
  const checker = process.platform === 'win32' ? 'where' : 'which'
  try {
    const r = spawnSync(checker, [name], { encoding: 'utf8', windowsHide: true, timeout: 5000 })
    return r.status === 0 && String(r.stdout || '').trim().length > 0
  } catch {
    return false
  }
}

function findPowerShellHost(spawnSync, existsSync) {
  if (commandExistsSync(spawnSync, 'pwsh') || existsSync('C:\\Program Files\\PowerShell\\7\\pwsh.exe')) return 'pwsh'
  if (commandExistsSync(spawnSync, 'powershell') || commandExistsSync(spawnSync, 'powershell.exe') ||
      existsSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe')) {
    return 'powershell.exe'
  }
  return process.platform === 'win32' ? 'powershell.exe' : ''
}

function psHomeDetect() {
  return [
    "if (-not $env:DSH_HOME) {",
    "  $desk = Join-Path $env:USERPROFILE 'DeepSeek Harness\\dsh-home';",
    "  $dot = Join-Path $env:USERPROFILE '.dsh';",
    "  if (Test-Path -LiteralPath $desk) { $env:DSH_HOME = $desk }",
    "  elseif (Test-Path -LiteralPath $dot) { $env:DSH_HOME = $dot }",
    "}",
    "Write-Host ('DSH_HOME=' + $env:DSH_HOME)",
  ]
}

function specFromItem(item) {
  if (!item) return ''
  return toUpdateSpec(item)
}

function psVerb(itemOrName, profile, verb) {
  const extra = verb === 'remove' ? String(itemOrName || '').trim() : specFromItem(itemOrName)
  return [
    "if (Get-Command dsh -ErrorAction SilentlyContinue) {",
    "  dsh plugin --profile " + profile + " " + verb + " \"" + extra + "\"",
    "} elseif (Get-Command npx -ErrorAction SilentlyContinue) {",
    "  npx --yes @deepseek-ai/dsh plugin --profile " + profile + " " + verb + " \"" + extra + "\"",
    "} else {",
    "  Write-Host '找不到 dsh 或 npx，请先安装 Node.js 或把 dsh 加到 PATH'",
    "}",
  ]
}

function psAddOne(item, profile) {
  return psVerb(item, profile, 'add')
}

function buildPsScript(item, profile) {
  return psHomeDetect().concat(psVerb(item, profile, 'add'), ["Write-Host '完成。请完全退出 dsh-desktop 再打开。'"]).join('; ')
}

function buildPsUpdateAll(items, profile) {
  const specs = (items || []).map(specFromItem).filter(s => {
    const parsed = parseGithubSpec(s)
    return validFullName(parsed.full_name)
  })
  const list = specs.map(s => "'" + String(s).replace(/'/g, '') + "'").join(',')
  return psHomeDetect().concat([
    "$repos = @(" + list + ")",
    "foreach ($f in $repos) {",
    "  Write-Host ('更新 ' + $f)",
    "  if (Get-Command dsh -ErrorAction SilentlyContinue) {",
    "    dsh plugin --profile " + profile + " add $f",
    "  } elseif (Get-Command npx -ErrorAction SilentlyContinue) {",
    "    npx --yes @deepseek-ai/dsh plugin --profile " + profile + " add $f",
    "  } else {",
    "    Write-Host '找不到 dsh 或 npx，请先安装 Node.js 或把 dsh 加到 PATH'; break",
    "  }",
    "}",
    "Write-Host '完成。请完全退出 dsh-desktop 再打开。'",
  ]).join('; ')
}

async function runHiddenPowerShell(script) {
  const { spawn, spawnSync, existsSync } = await loadNodeMods()
  const shell = findPowerShellHost(spawnSync, existsSync) || 'powershell.exe'
  return new Promise((resolve) => {
    const child = spawn(shell, [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-WindowStyle',
      'Hidden',
      '-Command',
      script,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: pluginEnv(),
    })
    let stdout = ''
    let stderr = ''
    if (child.stdout) child.stdout.on('data', (d) => { stdout += d })
    if (child.stderr) child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (err) => resolve({ code: 127, stdout, stderr: String(err) }))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function spawnNamed(bin, args) {
  const { spawn } = await loadNodeMods()
  return new Promise((resolve) => {
    const child = spawn(bin, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: pluginEnv(),
    })
    let stdout = ''
    let stderr = ''
    if (child.stdout) child.stdout.on('data', (d) => { stdout += d })
    if (child.stderr) child.stderr.on('data', (d) => { stderr += d })
    child.on('error', (err) => resolve({ code: 127, stdout, stderr: String(err) }))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
  })
}

async function runSilentNamed(extra, profile, verb) {
  const args = ['plugin', '--profile', profile, verb, extra]
  const win = process.platform === 'win32'
  const dshBin = win ? 'dsh.cmd' : 'dsh'
  const npxBin = win ? 'npx.cmd' : 'npx'
  let result = await spawnNamed(dshBin, args)
  if (result.code !== 0) {
    const npx = await spawnNamed(npxBin, ['--yes', '@deepseek-ai/dsh'].concat(args))
    result = {
      code: npx.code,
      stdout: (result.stdout || '') + (npx.stdout || ''),
      stderr: (result.stderr || '') + (npx.stderr || ''),
    }
  }
  return result
}

async function runPluginVerb(itemOrName, profile, verb) {
  if (process.platform === 'win32') {
    const { spawnSync, existsSync } = await loadNodeMods()
    if (findPowerShellHost(spawnSync, existsSync)) {
      const script = psHomeDetect().concat(psVerb(itemOrName, profile, verb)).join('; ')
      return runHiddenPowerShell(script)
    }
  }
  const extra = verb === 'remove' ? String(itemOrName || '').trim() : specFromItem(itemOrName)
  return runSilentNamed(extra, profile, verb)
}

async function installViaNpxOrDsh(item, profile) {
  return runPluginVerb(item, profile, 'add')
}

function addCommandForSpec(spec, profile) {
  const s = String(spec || '').trim()
  if (s.startsWith('github:') || validFullName(s.split('#')[0])) {
    const x = parseGithubSpec(s.startsWith('github:') ? s : ('github:' + s))
    return installCmd(x.full_name, profile, x.path)
  }
  return installCmd('', profile, '', s)
}

async function launchAdd(items, profile, title) {
  const parsed = (items || []).map(specFromItem).filter(Boolean)
  const command = parsed.map(s => addCommandForSpec(s, profile)).join(' && ')
  const isUpdate = title === '更新插件'
  let ok = true
  let stdout = ''
  let stderr = ''
  for (const item of parsed) {
    const result = await runPluginVerb(item, profile, 'add')
    stdout += result.stdout || ''
    stderr += result.stderr || ''
    if (result.code !== 0) ok = false
  }
  const errorTail = (stderr || stdout || '').slice(-500) || 'failed'
  let usable = ok
  let message = ok ? ((isUpdate ? '已更新。' : '已安装。') + RESTART_HINT) : errorTail
  const healthRows = []
  if (ok) {
    const installed = collectInstalledGithub()
    for (const item of parsed) {
      const raw = String(item || '')
      const gh = (raw.startsWith('github:') || validFullName(raw.split('#')[0])) ? parseGithubSpec(raw.startsWith('github:') ? raw : ('github:' + raw)) : null
      const row = installed.find(x => (gh && x.full_name === gh.full_name) || x.name === raw || x.spec === raw)
      if (row && row.warning) healthRows.push(row)
    }
    if (healthRows.length) {
      usable = false
      message = healthRows.map(x => x.warning).join('\n')
    }
  }
  return {
    ok,
    usable,
    launched: false,
    needsRestart: ok && usable,
    message,
    command,
    targets: parsed.map(x => typeof x === 'string' ? x : (x && x.spec) || ''),
    health: healthRows,
    stdout: stdout.slice(-4000),
    stderr: stderr.slice(-4000),
  }
}

async function installPlugin(full, profile, path, pkgName) {
  const pkg = String(pkgName || '').trim()
  if (pkg) return launchAdd([pkg], profile, '安装插件')
  return launchAdd([githubSpec(full, path)], profile, '安装插件')
}

function resolveUpdateFulls(target) {
  const t = String(target || '').trim()
  if (t === 'self') return [githubSpec(SELF_FULL, '')]
  if (t === 'all') return allUpdateFulls()
  if (t.startsWith('file:') || t.startsWith('link:') || t.startsWith('workspace:')) return null
  if (t.startsWith('github:') || t.includes('#path:') || validFullName(t.split('#')[0])) {
    const parsed = parseGithubSpec(t.startsWith('github:') ? t : ('github:' + t))
    if (!validFullName(parsed.full_name)) return null
    return [parsed.spec]
  }
  const installed = collectInstalledGithub()
  const hit = installed.find(x => x.name === t || x.spec === t)
  if (hit) {
    if (hit.removable === false) return null
    const spec = toUpdateSpec(hit)
    return spec ? [spec] : null
  }
  if (isNpmName(t)) return [t]
  return null
}

async function rememberSelfSha(sha) {
  if (!sha) return
  try {
    const prefs = loadPrefs()
    prefs.lastSelfSha = String(sha)
    savePrefs(prefs)
  } catch {}
}

async function runUpdate(target, profile) {
  const fulls = resolveUpdateFulls(target)
  if (!fulls || !fulls.length) {
    return { ok: false, message: "target must be self, all, or owner/repo", targets: [] }
  }
  const result = await launchAdd(fulls, safeProfile(profile), "更新插件")
  if (result && result.ok) {
    const updatedSelf = fulls.some(s => parseGithubSpec(s).full_name === SELF_FULL)
    if (updatedSelf) {
      try {
        const sha = await fetchRemoteSha(SELF_FULL)
        if (sha) await rememberSelfSha(sha)
      } catch {}
    }
  }
  return result
}

async function uninstallPlugin(target, profile) {
  const item = resolveUninstallItem(target)
  if (!item) return { ok: false, needsRestart: false, message: '未找到已安装的插件' }
  if (item.full_name === SELF_FULL) {
    return { ok: false, needsRestart: false, message: '不能从商店卸载插件库本身，卸了就进不了插件库。' }
  }
  profile = safeProfile(profile)
  const command = uninstallCmd(item.name, profile)
  const result = await runPluginVerb(item.name, profile, 'remove')
  const ok = result.code === 0
  const errorTail = (result.stderr || result.stdout || '').slice(-500) || 'failed'
  return {
    ok,
    launched: false,
    needsRestart: true,
    message: ok ? ('已卸载 ' + item.full_name + '。' + RESTART_HINT) : errorTail,
    command,
    removed: item,
    stdout: (result.stdout || '').slice(-4000),
    stderr: (result.stderr || '').slice(-4000),
  }
}

const DETAIL_TTL_MS = 10 * 60 * 1000
const detailCache = new Map()

function extractImgs(md, full) {
  const out = []
  const add = (u) => {
    if (!u) return
    u = String(u).trim().replace(/^<|>$/g, '').split(/\s+/)[0].replace(/["']/g, '')
    if (!u || u.startsWith('#') || /^data:/i.test(u)) return
    const low = u.toLowerCase()
    if (/shields\.io|badge|github\.com\/actions|camo\.githubusercontent/.test(low)) return
    if (!/^https?:\/\//i.test(u)) {
      u = 'https://raw.githubusercontent.com/' + full + '/HEAD/' + u.replace(/^\.?\//, '')
    }
    if (!out.includes(u)) out.push(u)
  }
  String(md || '').replace(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_, u) => { add(u); return '' })
  String(md || '').replace(/<img[^>]+src=["']([^"']+)["']/gi, (_, u) => { add(u); return '' })
  return out
}

async function fetchText(url, timeoutMs) {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs || 8000)
  try {
    const r = await fetch(url, { signal: ac.signal })
    if (!r.ok) return ''
    return await r.text()
  } catch {
    return ''
  } finally {
    clearTimeout(timer)
  }
}

function clipText(s, n) {
  s = String(s || '')
  if (s.length <= n) return s
  return s.slice(0, n)
}

async function loadDetail(full) {
  const hit = detailCache.get(full)
  if (hit && (Date.now() - hit.at) < DETAIL_TTL_MS) return hit.data
  const base = 'https://raw.githubusercontent.com/' + full + '/HEAD/'
  const readmeEn = await fetchText(base + 'README.md', 8000)
  let readmeZh = await fetchText(base + 'README.zh-CN.md', 8000)
  if (!readmeZh) readmeZh = await fetchText(base + 'README.zh.md', 8000)
  const images = []
  for (const u of extractImgs(readmeZh, full).concat(extractImgs(readmeEn, full))) {
    if (!images.includes(u)) images.push(u)
  }
  const og = 'https://opengraph.githubassets.com/1/' + full
  if (!images.length) images.push(og)
  const data = {
    ok: true,
    full_name: full,
    images: images.slice(0, 16),
    readme_zh: clipText(readmeZh, 20000),
    readme_en: clipText(readmeEn, 20000),
    og,
  }
  detailCache.set(full, { at: Date.now(), data })
  return data
}

async function registerWithDefineTool(ctx) {
  const { defineTool } = await import('@deepseek-ai/dsh-tools')
  ctx.tools.register(defineTool({
    name: 'dsh_catalog_search',
    description: 'Search the Sakana-yuyu/dsh-plugins catalog of DeepSeek Harness plugins ranked by GitHub stars.',
    parameters: {
      query: { type: 'string', description: 'Search text: plugin name, author, or description' },
      category: { type: 'string', description: 'official, ui, vision, tui, desktop, browser, workflow, tools, search, dev, awesome, other, all' },
      official_only: { type: 'boolean', description: 'If true, only official deepseek-ai plugins' },
      limit: { type: 'number', description: 'Max results, default 8' },
    },
    output: { schema: { type: 'object' } },
    async execute(args) {
      const items = await loadCatalog()
      const found = filterItems(items, args.query, args.category, args.official_only)
      const limit = Math.min(Math.max(Number(args.limit) || 8, 1), 30)
      return { total: found.length, catalog: CATALOG_BASE + '/', results: found.slice(0, limit).map(row) }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'dsh_catalog_install',
    description: 'Install a catalog plugin by running dsh plugin --profile <profile> add github:owner/repo. Confirm full_name with the user first.',
    parameters: {
      full_name: { type: 'string', required: true, description: 'GitHub owner/repo, e.g. liustack/modlens' },
      profile: { type: 'string', description: 'DSH profile name, default web' },
      run: { type: 'boolean', description: 'If true, actually run dsh plugin add. Default true.' },
    },
    output: { schema: { type: 'object' } },
    async execute(args) {
      const full = String(args.full_name || '').trim()
      if (!validFullName(full)) {
        return { ok: false, error: 'full_name must look like owner/repo' }
      }
      const profile = safeProfile(args.profile)
      let previewPath = ''
      try {
        const items = await loadCatalog()
        const hit = items.find(x => x.full_name === full) || findCatalogHit(items, { full_name: full, name: specIn })
        if (hit && hit.path) previewPath = hit.path
      } catch {}
      const cmd = installCmd(full, profile, previewPath)
      const clone = 'git clone https://github.com/' + full + '.git'
      if (args.run === false) {
        return { ok: true, ran: false, command: cmd, clone, path: previewPath || undefined }
      }
      const result = await installPlugin(full, profile, previewPath)
      return {
        ok: result.ok,
        ran: true,
        launched: !!result.launched,
        command: cmd,
        clone,
        needsRestart: result.needsRestart,
        message: result.message,
        stdout: (result.stdout || '').slice(-4000),
        stderr: (result.stderr || '').slice(-4000),
      }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'dsh_catalog_update',
    description: 'Update this catalog plugin (self), all installed github: plugins (all), or one owner/repo by re-adding the git source.',
    parameters: {
      target: { type: 'string', required: true, description: 'self, all, or owner/repo' },
      profile: { type: 'string', description: 'DSH profile name, default web' },
      run: { type: 'boolean', description: 'If true, actually run. Default true.' },
    },
    output: { schema: { type: 'object' } },
    async execute(args) {
      const target = String(args.target || '').trim()
      const fulls = resolveUpdateFulls(target)
      if (!fulls) {
        return { ok: false, error: 'target must be self, all, or owner/repo' }
      }
      const profile = safeProfile(args.profile)
      const command = fulls.map(f => installCmd(f, profile)).join(' && ')
      if (args.run === false) {
        return { ok: true, ran: false, target, command, targets: fulls }
      }
      const result = await runUpdate(target, profile)
      return {
        ok: result.ok,
        ran: true,
        launched: !!result.launched,
        target,
        command,
        targets: result.targets || fulls,
        needsRestart: result.needsRestart,
        message: result.message,
        stdout: (result.stdout || '').slice(-4000),
        stderr: (result.stderr || '').slice(-4000),
      }
    },
  }))
  ctx.tools.register(defineTool({
    name: 'dsh_catalog_uninstall',
    description: 'Uninstall a catalog plugin by running dsh plugin --profile <profile> remove <package-name>. Confirm the target with the user first. Cannot uninstall the catalog itself (Sakana-yuyu/dsh-plugins).',
    parameters: {
      target: { type: 'string', description: 'Package name, owner/repo, or github:owner/repo[#path:subdir]' },
      full_name: { type: 'string', description: 'GitHub owner/repo, e.g. Small-tailqwq/dsh-deep-whale' },
      name: { type: 'string', description: 'Package / dependency key, e.g. dsh-deep-whale' },
      profile: { type: 'string', description: 'DSH profile name, default web' },
      run: { type: 'boolean', description: 'If true, actually run dsh plugin remove. Default true.' },
    },
    output: { schema: { type: 'object' } },
    async execute(args) {
      const target = String((args && (args.target || args.full_name || args.name)) || '').trim()
      if (!target) {
        return { ok: false, error: 'target, full_name, or name is required' }
      }
      const profile = safeProfile(args && args.profile)
      const item = resolveUninstallItem(target)
      const command = item ? uninstallCmd(item.name, profile) : uninstallCmd(target, profile)
      if (args && args.run === false) {
        return { ok: true, ran: false, command, target, item: item || undefined }
      }
      const result = await uninstallPlugin(target, profile)
      return {
        ok: result.ok,
        ran: true,
        launched: false,
        command: result.command || command,
        target,
        removed: result.removed,
        needsRestart: result.needsRestart,
        message: result.message,
        stdout: (result.stdout || '').slice(-4000),
        stderr: (result.stderr || '').slice(-4000),
      }
    },
  }))
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let n = 0
    req.on('data', (c) => {
      n += c.length
      if (n > 1000000) {
        req.destroy()
        reject(new Error('body too large'))
        return
      }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}


function isSafeOpenUrl(url) {
  try {
    const u = new URL(String(url || ''))
    if (u.protocol !== 'https:') return false
    const host = u.hostname.toLowerCase()
    if (host === 'github.com' || host.endsWith('.github.com')) return true
    if (host === 'github.io' || host.endsWith('.github.io')) return true
    return false
  } catch {
    return false
  }
}

async function openExternalUrl(url) {
  if (!isSafeOpenUrl(url)) return { ok: false, message: 'url not allowed' }
  const { spawn } = await loadNodeMods()
  const plat = process.platform
  let bin
  let args
  if (plat === 'win32') {
    bin = 'explorer.exe'
    args = [url]
  } else if (plat === 'darwin') {
    bin = 'open'
    args = [url]
  } else {
    bin = 'xdg-open'
    args = [url]
  }
  return new Promise((resolve) => {
    let done = false
    const finish = (result) => {
      if (done) return
      done = true
      resolve(result)
    }
    try {
      const child = spawn(bin, args, { stdio: 'ignore', detached: true, windowsHide: true })
      if (child && child.unref) child.unref()
      child.on('error', (err) => finish({ ok: false, message: String(err && err.message || err) }))
      child.on('spawn', () => finish({ ok: true, url }))
      setTimeout(() => finish({ ok: true, url }), 800)
    } catch (err) {
      finish({ ok: false, message: String(err && err.message || err) })
    }
  })
}


function loadClientUi() {
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'client-parts')
  const names = readdirSync(dir).filter((n) => /^\d+\.js$/.test(n)).sort()
  return names.map((n) => readFileSync(join(dir, n), 'utf8')).join('')
}

async function handleHttp(req, res) {
  let path = '/'
  let search = ''
  try {
    const u = new URL(req.url || '/', 'http://127.0.0.1')
    path = u.pathname
    search = u.search
  } catch {
    path = '/'
  }
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  const method = (req.method || 'GET').toUpperCase()


  if (method === 'GET' && path === '/api/dsh-plugins/ui.js') {
    try {
      const body = loadClientUi()
      res.writeHead(200, {
        'content-type': 'application/javascript; charset=utf-8',
        'cache-control': 'no-store',
        'content-length': Buffer.byteLength(body),
      })
      res.end(body)
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'GET' && path === '/api/dsh-plugins/catalog') {
    try {
      const items = await loadCatalog()
      const installedRows = collectInstalledGithub(items)
      const installedSet = new Set(installedRows.map(x => x.full_name).filter(Boolean))
      const installedNames = new Set(installedRows.map(x => x.name).filter(Boolean))
      const plugins = items.slice(0, 400).map(p => {
        const r = apiRow(p)
        r.installed = installedSet.has(r.full_name) || installedNames.has(r.name) || !!(r.npm_name && installedNames.has(r.npm_name))
        return r
      })
      sendJson(res, 200, { ok: true, plugins })
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === "GET" && path === "/api/dsh-plugins/installed") {
    try {
      let wantCheck = false
      try {
        wantCheck = new URL(req.url || ("/" + search), "http://127.0.0.1").searchParams.get("check") === "1"
      } catch {
        wantCheck = false
      }
      if (wantCheck) {
        sendJson(res, 200, await checkUpdates(true))
        return
      }
      const catalog = await loadCatalog()
      const installed = collectInstalledGithub(catalog).map(row => {
        const hit = findCatalogHit(catalog, row)
        const meta = readInstalledMeta(row)
        const isSelf = row.full_name === SELF_FULL
        const version = isSelf ? (selfPackageVersion() || meta.version) : meta.version
        return {
          ...row,
          version,
          current: version,
          latest: "",
          currentSha: meta.sha || "",
          latestSha: "",
          newer: false,
          status: "unknown",
          self: isSelf,
          catalog: hit ? apiRow(hit) : null,
        }
      })
      sendJson(res, 200, { ok: true, installed, newerCount: 0, restartHint: RESTART_HINT })
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'GET' && path === '/api/dsh-plugins/detail') {
    let full = ''
    try {
      full = new URL(req.url || ('/' + search), 'http://127.0.0.1').searchParams.get('full_name') || ''
    } catch {
      full = ''
    }
    full = String(full).trim()
    if (!validFullName(full)) {
      sendJson(res, 400, { ok: false, error: 'full_name must look like owner/repo' })
      return
    }
    try {
      const data = await loadDetail(full)
      sendJson(res, 200, data)
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'GET' && path === '/api/dsh-plugins/prefs') {
    try {
      sendJson(res, 200, { ok: true, prefs: loadPrefs() })
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/prefs') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    try {
      const prefs = mergePrefs(body)
      sendJson(res, 200, { ok: true, prefs })
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'GET' && path === '/api/dsh-plugins/updates') {
    try {
      const data = await checkUpdates(true)
      sendJson(res, 200, data)
    } catch (err) {
      sendJson(res, 500, { ok: false, error: String(err && err.message || err) })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/install') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    const full = String((body && body.full_name) || '').trim()
    const specIn = String((body && (body.spec || body.name || body.npm_name)) || '').trim()
    if (!validFullName(full) && !specIn) {
      sendJson(res, 400, { ok: false, error: 'full_name or package name required' })
      return
    }
    const profile = safeProfile(body && body.profile)
    let sub = sanitizePath(body && body.path)
    let pkg = ''
    try {
      const items = await loadCatalog()
      const hit = items.find(x => x.full_name === full) || findCatalogHit(items, { full_name: full, name: specIn })
      if (hit && hit.path && !sub) sub = hit.path
      if (hit) pkg = rowPkg(hit)
    } catch {}
    if (!pkg && specIn && !specIn.startsWith('github:')) pkg = specIn
    try {
      const result = await installPlugin(full, profile, sub, pkg)
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        needsRestart: true,
        message: String(err && err.message || err),
        command: installCmd(full, profile, sub),
        stdout: '',
        stderr: String(err && err.message || err),
      })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/update') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    const target = String((body && body.target) || '').trim()
    const profile = safeProfile(body && body.profile)
    if (!resolveUpdateFulls(target)) {
      sendJson(res, 400, { ok: false, error: 'target must be self, all, or owner/repo' })
      return
    }
    try {
      const result = await runUpdate(target, profile)
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        needsRestart: true,
        message: String(err && err.message || err),
        target,
      })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/uninstall') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    const target = String((body && (body.full_name || body.name || body.spec)) || '').trim()
    const profile = safeProfile(body && body.profile)
    if (!target) {
      sendJson(res, 400, { ok: false, error: 'full_name, name, or spec required' })
      return
    }
    try {
      const result = await uninstallPlugin(target, profile)
      let status = 500
      if (result.ok) status = 200
      else if (result.message === '未找到已安装的插件' || (result.message && result.message.startsWith('不能从商店'))) status = 400
      sendJson(res, status, result)
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        needsRestart: false,
        message: String(err && err.message || err),
      })
    }
    return
  }


  if (method === 'POST' && path === '/api/dsh-plugins/open') {
    let body
    try {
      body = JSON.parse((await readBody(req)) || '{}')
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' })
      return
    }
    const url = String((body && body.url) || '').trim()
    if (!isSafeOpenUrl(url)) {
      sendJson(res, 400, { ok: false, error: 'url must be https github.com or github.io' })
      return
    }
    try {
      const result = await openExternalUrl(url)
      sendJson(res, result.ok ? 200 : 500, result)
    } catch (err) {
      sendJson(res, 500, { ok: false, message: String(err && err.message || err) })
    }
    return
  }

  if (method === 'POST' && path === '/api/dsh-plugins/restart') {
    sendJson(res, 200, { ok: true, restarting: true, message: '正在重启…' })
    setTimeout(() => process.exit(0), 400)
    return
  }

  sendJson(res, 404, { ok: false, error: 'not found' })
}

function registerHttp(ctx) {
  if (!ctx.webServer) return
  const route = {
    kind: 'prefix',
    path: '/api/dsh-plugins',
    handler: handleHttp,
  }
  if (ctx.effect) ctx.effect(() => ctx.webServer.register(route))
  else ctx.webServer.register(route)
}

async function scheduledTick(ctx) {
  try {
    const info = await checkUpdates(true)
    const prefs = loadPrefs()
    const selfNewer = !!(info.self && info.self.newer)
    const anyNewer = selfNewer || ((info.newerCount || 0) > 0)
    if (!anyNewer) return
    if (prefs.autoUpdateOthers) {
      const result = await runUpdate('all', 'web')
      if (result && result.ok && info.self && info.self.latestSha) {
        prefs.lastSelfSha = info.self.latestSha
        savePrefs(prefs)
      }
    } else if (prefs.autoUpdateSelf && selfNewer) {
      const result = await runUpdate('self', 'web')
      if (result && result.ok && info.self && info.self.latestSha) {
        prefs.lastSelfSha = info.self.latestSha
        savePrefs(prefs)
      }
    }
  } catch (err) {
    if (ctx && ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] check ' + err)
  }
}

export {
  sanitizePath,
  githubSpec,
  parseGithubSpec,
  toUpdateSpec,
  isPlaceholderPkg,
  expand,
  installCmd,
  applyPathOverride,
  PLACEHOLDER_WARN,
  uninstallCmd,
  resolveUninstallItem,
  RESTART_HINT,
  cmpSemver,
  extractShaFromLock,
  selfPackageVersion,
  readInstalledMeta,
  fetchRemotePackage,
  fetchRemoteSha,
  decideNewer,
  decideStatus,
  checkUpdates,
  inspectPluginHealth,
  contactAuthor,
  issuesUrl,
  isSafeOpenUrl,
  collectInstalledGithub,
  collectInstalledPlugins,
  findCatalogHit,
  classifySpec,
  fetchRemoteNpm,
  rowPkg,
}

export async function apply(ctx) {
  try {
    await registerWithDefineTool(ctx)
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] ' + err)
  }
  try {
    registerHttp(ctx)
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] http ' + err)
  }
  try {
    const inst = collectInstalledGithub()
    for (const x of inst) {
      if (x.warning && ctx.logger && ctx.logger.warn) {
        ctx.logger.warn('[dsh-plugins-catalog] ' + x.full_name + ': ' + x.warning)
      }
    }
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] installed ' + err)
  }
  try {
    const prefs = loadPrefs()
    if (prefs.autoUpdateSelf || prefs.autoUpdateOthers) {
      setTimeout(() => {
        scheduledTick(ctx)
        setInterval(() => scheduledTick(ctx), 6 * 60 * 60 * 1000)
      }, 20000)
    }
  } catch (err) {
    if (ctx.logger && ctx.logger.warn) ctx.logger.warn('[dsh-plugins-catalog] autoupdate ' + err)
  }
}
