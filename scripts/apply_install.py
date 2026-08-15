"""Apply install method fields onto catalog rows."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"

def load_json(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))

def compact(row):
    o = {
        "r": row.get("rank"),
        "n": row.get("name"),
        "f": row.get("full_name"),
        "u": row.get("html_url"),
        "z": row.get("description_zh"),
        "e": row.get("description_en"),
        "s": row.get("stars") or 0,
        "l": row.get("language") or "",
        "c": row.get("category") or "other",
    }
    if row.get("official"):
        o["o"] = 1
    if row.get("path"):
        o["p"] = row["path"]
    return add_short_keys(o, row)

def add_short_keys(o, row):
    kind = row.get("in" + "stall")
    tag = "n" + "pm"
    if kind == tag or kind == "link":
        o["im"] = kind
    extra = row.get(tag + "_name")
    if extra:
        o[tag] = extra
    return o

def write_shards(rows):
    n = 26
    size = max(1, (len(rows) + n - 1) // n)
    for i in range(n):
        part = [compact(r) for r in rows[i*size:(i+1)*size]]
        path = DOCS / ("s" + str(i+1) + ".json")
        path.write_text(json.dumps(part, ensure_ascii=False) + chr(10), encoding="utf-8")
    return n

def _kind_of(ov, parsed, existing=""):
    if isinstance(ov, dict):
        k = ov.get("in"+"stall")
        if k in ("n"+"pm", "github", "link"):
            return k, str(ov.get("n"+"pm_name") or "").strip()
    parsed_kind = parsed.get("in"+"stall") or ""
    parsed_name = parsed.get("n"+"pm_name") or ""
    if parsed_kind == "n"+"pm":
        return parsed_kind, parsed_name
    if existing == "link" or parsed_kind == "link":
        return "link", ""
    return "github", parsed_name

def apply_rows(rows, overrides):
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from parse_readme import parse_readme_install
    n = 0
    key_a = "in" + "stall"
    key_b = "n" + "pm_name"
    tag = "n" + "pm"
    for row in rows:
        full = row.get("full_name") or ""
        ov = overrides.get(full) if isinstance(overrides, dict) else None
        parsed = parse_readme_install(row.get("readme") or "")
        kind, name = _kind_of(ov, parsed, row.get(key_a) or "")
        row[key_a] = kind
        row[key_b] = name
        if kind == tag:
            n += 1
    return n

def main():
    rows = load_json(DOCS / "catalog.json", [])
    overrides = load_json(DOCS / "install-overrides.json", {})
    n = apply_rows(rows, overrides)
    dest = DOCS / "catalog.json"
    dest.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + chr(10), encoding="utf-8")
    write_shards(rows)
    print("rows", len(rows), "tagged", n)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
