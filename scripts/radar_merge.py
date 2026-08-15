"""Merge AdamPlatin123/awesome-dsh-plugins radar snapshots into the GitHub topic scan."""
from __future__ import annotations
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

RADAR_OWNER_REPO = "AdamPlatin123/awesome-dsh-plugins"
RADAR_SNAPSHOTS_API = (
    "https://api.github.com/repos/" + RADAR_OWNER_REPO + "/contents/data/snapshots"
)
RAW_SNAPSHOT = "https://raw.githubusercontent.com/" + RADAR_OWNER_REPO + "/main/"
GITHUB_REPO_RE = re.compile(
    r"^https?://(?:www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$",
    re.I,
)
PLACEHOLDER_DESC = {"", "-", "—", "–"}
MIN_SNAPSHOT_BYTES = 10000


def full_name_from_url(url):
    raw = str(url or "").strip()
    m = GITHUB_REPO_RE.match(raw)
    if not m:
        return ""
    return m.group(1) + "/" + m.group(2)


def is_index_repo(item):
    full = str((item or {}).get("full_name") or "").strip()
    name = str((item or {}).get("name") or "").strip().lower()
    desc = str((item or {}).get("description") or "").lower()
    if not full:
        return False
    repo = full.split("/", 1)[-1].lower()
    if repo == "awesome-dsh-plugins":
        return True
    if name.startswith("awesome-") and ("dsh" in name or "plugin" in name or "harness" in name):
        return True
    if "雷达" in desc or "索引仓库" in desc:
        return True
    return False


def pick_latest_snapshot(files):
    jsons = [f for f in (files or []) if str(f.get("name") or "").endswith(".json")]
    jsons.sort(key=lambda f: str(f.get("name") or ""), reverse=True)
    for f in jsons:
        if int(f.get("size") or 0) >= MIN_SNAPSHOT_BYTES:
            return f
    return jsons[0] if jsons else None


def radar_entry_to_item(entry):
    url = str((entry or {}).get("url") or "").strip()
    full = full_name_from_url(url)
    if not full:
        return None
    name = str(entry.get("name") or "").strip() or full.split("/")[-1]
    desc = str(entry.get("desc") or "").strip()
    if desc in PLACEHOLDER_DESC:
        desc = ""
    return {
        "name": name,
        "full_name": full,
        "html_url": "https://github.com/" + full,
        "description": desc,
        "stargazers_count": int(entry.get("star") or 0),
        "forks_count": 0,
        "language": "",
        "topics": [],
        "updated_at": "",
        "default_branch": "main",
        "clone_url": "https://github.com/" + full + ".git",
    }


def parse_radar_entries(snapshot):
    entries = []
    if isinstance(snapshot, dict):
        entries = snapshot.get("catalog_entries") or []
    elif isinstance(snapshot, list):
        entries = snapshot
    out, seen = [], set()
    for entry in entries:
        item = radar_entry_to_item(entry)
        if not item:
            continue
        key = item["full_name"]
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def plugin_manifest_ok(pkg):
    if not isinstance(pkg, dict):
        return False
    dsh = pkg.get("dsh")
    if not isinstance(dsh, dict):
        return False
    return bool(dsh.get("bundle") or dsh.get("client"))


def pick_plugin_manifest(candidates):
    for pkg in candidates or []:
        if plugin_manifest_ok(pkg):
            return pkg
    return None


def keep_catalog_row(row, pkg):
    if not row:
        return False
    kind = str(row.get("install") or "")
    npm_name = str(row.get("npm_name") or "").strip()
    if kind == "npm" and npm_name:
        return True
    if pkg == "error":
        return None
    return plugin_manifest_ok(pkg)


def _package_url(full, branch, subpath=""):
    mid = (str(subpath or "").strip().strip("/") + "/") if subpath else ""
    return "https://raw.githubusercontent.com/" + full + "/" + branch + "/" + mid + "package.json"


def _read_json_url(url, token=None, timeout=20):
    headers = {"User-Agent": "dsh-plugins-catalog"}
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = json.loads(resp.read().decode("utf-8", errors="replace"))
    return data


def _fetch_workspace_packages(full, branch, token, timeout):
    api = "https://api.github.com/repos/" + full + "/contents/packages?ref=" + urllib.parse.quote(branch)
    try:
        listing = _read_json_url(api, token, timeout)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return []
        raise
    if not isinstance(listing, list):
        return []
    found = []
    for ent in listing:
        if not isinstance(ent, dict) or ent.get("type") != "dir":
            continue
        name = str(ent.get("name") or "").strip()
        if not name or ".." in name:
            continue
        try:
            pkg = _read_json_url(_package_url(full, branch, "packages/" + name), None, timeout)
        except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, urllib.error.HTTPError):
            continue
        if isinstance(pkg, dict):
            found.append(pkg)
            if plugin_manifest_ok(pkg):
                return found
    return found


def fetch_package_json(row, timeout=20, token=None):
    full = str((row or {}).get("full_name") or "").strip()
    if not full:
        return None
    token = token or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    sub = str((row or {}).get("path") or "").strip().strip("/")
    if ".." in sub:
        sub = ""
    branches = []
    for b in ((row or {}).get("default_branch"), "main", "master"):
        b = str(b or "").strip()
        if b and b not in branches:
            branches.append(b)
    last_err = None
    for branch in branches:
        try:
            data = _read_json_url(_package_url(full, branch, sub), None, timeout)
        except urllib.error.HTTPError as e:
            if e.code == 404:
                continue
            last_err = e
            continue
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError, json.JSONDecodeError) as e:
            last_err = e
            continue
        if not isinstance(data, dict):
            continue
        if plugin_manifest_ok(data) or sub:
            return data
        try:
            nested = _fetch_workspace_packages(full, branch, token, timeout)
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last_err = e
            nested = []
        picked = pick_plugin_manifest([data] + nested)
        return picked or data
    if last_err and not isinstance(last_err, urllib.error.HTTPError):
        return "error"
    return None


def probe_installable_rows(rows, workers=16):
    from concurrent.futures import ThreadPoolExecutor, as_completed
    rows = list(rows or [])
    pkgs = {}
    if not rows:
        return []
    with ThreadPoolExecutor(max_workers=max(1, int(workers))) as pool:
        futs = {pool.submit(fetch_package_json, row): row for row in rows}
        done = 0
        for fut in as_completed(futs):
            row = futs[fut]
            full = str(row.get("full_name") or "")
            try:
                pkgs[full] = fut.result()
            except Exception:
                pkgs[full] = "error"
            done += 1
            if done % 100 == 0 or done == len(rows):
                print("probe", done, "/", len(rows), file=sys.stderr)
    kept = []
    dropped = 0
    unknown = 0
    for row in rows:
        full = str(row.get("full_name") or "")
        decision = keep_catalog_row(row, pkgs.get(full, "error"))
        if decision is False:
            dropped += 1
            continue
        if decision is None:
            unknown += 1
        kept.append(row)
    print("installable", len(kept), "dropped", dropped, "unknown-kept", unknown, file=sys.stderr)
    for i, row in enumerate(kept, 1):
        row["rank"] = i
        if row.get("install") == "link":
            row["install"] = "github"
    return kept


def merge_github_items(github_items, radar_items):
    out, seen = [], set()
    for it in github_items or []:
        key = str((it or {}).get("full_name") or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    for it in radar_items or []:
        key = str((it or {}).get("full_name") or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(it)
    out.sort(key=lambda x: int((x or {}).get("stargazers_count") or 0), reverse=True)
    return out


def github_headers(token):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "dsh-plugins-catalog",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if token:
        headers["Authorization"] = "Bearer " + token
    return headers


def fetch_json(url, token=None, timeout=60):
    last_err = None
    for attempt in range(4):
        req = urllib.request.Request(url, headers=github_headers(token))
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            last_err = e
            time.sleep(2 * (attempt + 1))
    if last_err:
        raise last_err
    raise RuntimeError("fetch_json failed")


def fetch_radar_items(token=None):
    listing = fetch_json(RADAR_SNAPSHOTS_API, token)
    if not isinstance(listing, list):
        return []
    picked = pick_latest_snapshot(listing)
    if not picked:
        return []
    path = str(picked.get("path") or ("data/snapshots/" + picked.get("name", "")))
    snap = fetch_json(RAW_SNAPSHOT + path, token)
    return parse_radar_entries(snap)
