#!/usr/bin/env python3
from __future__ import annotations
import json, os, sys, time, urllib.error, urllib.parse, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
API = "https://api.github.com/search/repositories"
QUERY = "topic:dsh-plugin"
PER_PAGE = 100
MAX_PAGES = 10

CATEGORIES = [
    ("official", "官方核心", "Official core"),
    ("ui", "UI 与皮肤", "UI & skins"),
    ("vision", "视觉", "Vision"),
    ("tui", "终端 TUI", "Terminal TUI"),
    ("desktop", "桌面客户端", "Desktop"),
    ("browser", "浏览器", "Browser"),
    ("workflow", "工作流与多智能体", "Workflow & agents"),
    ("tools", "工具与技能", "Tools & skills"),
    ("search", "搜索与研究", "Search & research"),
    ("dev", "开发与代码", "Dev & code"),
    ("awesome", "目录与精选", "Awesome lists"),
    ("other", "其他", "Other"),
]
CAT_MAP = {cid: (zh, en) for cid, zh, en in CATEGORIES}

def load_translations():
    p = DOCS / "i18n-overrides.json"
    if p.exists():
        return json.loads(p.read_text(encoding="utf-8"))
    return {}

def classify(item):
    owner = (item.get("full_name") or "").split("/")[0].lower()
    if owner == "deepseek-ai":
        return "official"
    blob = " ".join([
        item.get("name") or "",
        item.get("full_name") or "",
        item.get("description") or "",
        " ".join(item.get("topics") or []),
    ]).lower()
    rules = [
        ("awesome", ("awesome", "精选", "catalog", "目录", "handbook", "find-plugins", "awesome-list", "curated")),
        ("vision", ("vision", "视觉", "ocr", "multimodal", "看图", "image-to-text", "modlens")),
        ("tui", ("tui", "terminal-ui", "ink", "终端", "tty", "cli-ui")),
        ("browser", ("browser", "chrome-extension", "浏览器", "chrome sidebar", "dsh-browser")),
        ("desktop", ("desktop", "tauri", "electron", "macos", "launcher", "webview2", "桌面")),
        ("ui", ("skin", "皮肤", "theme", "主题", "web-ui", "web ui", "sidebar", "侧栏", "pet", "宠物", "genui", "visualize", "whale", "鲸鱼", "ads", "广告")),
        ("search", ("search", "搜索", "research", "paper", "论文", "modsearch", "arxiv")),
        ("workflow", ("workflow", "multi-agent", "多智能体", "agent-teams", "orchestration", "subagent", "cowork")),
        ("dev", ("vscode", "lsp", "coding-agent", "decompiler", "reverse", "profiler", "git graph", "sandbox")),
        ("tools", ("skill", "mcp", "memory", "notification", "技能", "toolkit", "todo", "hook")),
    ]
    for cid, keys in rules:
        if any(k in blob for k in keys):
            return cid
    return "other"

def is_bilingual(text):
    if not text:
        return False
    has_cjk = any("\u4e00" <= ch <= "\u9fff" for ch in text)
    has_latin = any("a" <= ch.lower() <= "z" for ch in text)
    return has_cjk and has_latin and len(text) >= 24

def descriptions(full_name, raw, translations):
    raw = (raw or "").strip()
    ov = translations.get(full_name)
    if ov:
        return ov.get("zh", raw), ov.get("en", raw)
    if is_bilingual(raw):
        return raw, raw
    return raw, raw

def github_get(url, token):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "dsh-plugins-catalog",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if e.code in (403, 429):
            reset = e.headers.get("X-RateLimit-Reset")
            wait = 70
            if reset:
                try:
                    wait = max(8, int(reset) - int(time.time()) + 2)
                except ValueError:
                    pass
            print(f"rate limited ({e.code}), sleeping {wait}s", file=sys.stderr)
            time.sleep(min(wait, 95))
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        print(body, file=sys.stderr)
        raise

def fetch_all(token):
    items, seen = [], set()
    for page in range(1, MAX_PAGES + 1):
        qs = urllib.parse.urlencode({
            "q": QUERY, "sort": "stars", "order": "desc",
            "per_page": PER_PAGE, "page": page,
        })
        url = f"{API}?{qs}"
        print(f"fetch page {page} ...", file=sys.stderr)
        data = github_get(url, token)
        batch = data.get("items") or []
        if not batch:
            print(f"empty page {page}, stop", file=sys.stderr)
            break
        for it in batch:
            key = it.get("full_name")
            if not key or key in seen:
                continue
            seen.add(key)
            items.append(it)
        print(f"  got {len(batch)} (total {len(items)} / {data.get('total_count')})", file=sys.stderr)
        if len(batch) < PER_PAGE:
            break
        time.sleep(0.35 if token else 2.0)
    return items

def to_plugin(it, rank, translations):
    full = it.get("full_name") or ""
    official = full.startswith("deepseek-ai/")
    cat = classify(it)
    zh, en = CAT_MAP[cat]
    desc = it.get("description")
    dz, de = descriptions(full, desc, translations)
    clone = it.get("clone_url") or (f"https://github.com/{full}.git" if full else "")
    return {
        "rank": rank,
        "name": it.get("name") or "",
        "full_name": full,
        "html_url": it.get("html_url") or f"https://github.com/{full}",
        "description": desc or "",
        "description_zh": dz,
        "description_en": de,
        "stars": int(it.get("stargazers_count") or 0),
        "forks": int(it.get("forks_count") or 0),
        "language": it.get("language") or "",
        "official": official,
        "category": cat,
        "category_zh": zh,
        "category_en": en,
        "clone_url": clone,
        "image": f"https://opengraph.githubassets.com/1/{full}" if full else "",
        "topics": it.get("topics") or [],
        "updated_at": it.get("updated_at") or "",
    }

def main():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    DOCS.mkdir(parents=True, exist_ok=True)
    translations = load_translations()
    raw = fetch_all(token)
    plugins = [to_plugin(it, i + 1, translations) for i, it in enumerate(raw)]
    (DOCS / "catalog.json").write_text(json.dumps(plugins, ensure_ascii=False, indent=2) + chr(10), encoding="utf-8")
    print("wrote", len(plugins), "plugins")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
