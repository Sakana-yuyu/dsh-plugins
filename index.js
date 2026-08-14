import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

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
