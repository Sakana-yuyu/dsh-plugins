import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from radar_merge import (  # noqa: E402
    full_name_from_url,
    is_index_repo,
    keep_catalog_row,
    merge_github_items,
    parse_radar_entries,
    pick_latest_snapshot,
    pick_plugin_manifest,
    plugin_manifest_ok,
)


class TestFullNameFromUrl(unittest.TestCase):
    def test_parses_github_url(self):
        self.assertEqual(full_name_from_url("https://github.com/omdsh-dev/7d7d"), "omdsh-dev/7d7d")

    def test_strips_git_suffix_and_slash(self):
        self.assertEqual(full_name_from_url("https://github.com/foo/bar.git/"), "foo/bar")

    def test_rejects_empty_and_non_github(self):
        self.assertEqual(full_name_from_url(""), "")
        self.assertEqual(full_name_from_url("https://example.com/x/y"), "")


class TestParseRadarEntries(unittest.TestCase):
    def test_skips_blank_urls_and_maps_github_shape(self):
        snap = {
            "catalog_entries": [
                {"name": "7d7d", "url": "https://github.com/omdsh-dev/7d7d", "star": 3, "desc": "hi"},
                {"name": "bad", "url": "", "star": 9, "desc": "nope"},
            ]
        }
        rows = parse_radar_entries(snap)
        self.assertEqual([r["full_name"] for r in rows], ["omdsh-dev/7d7d"])
        self.assertEqual(rows[0]["stargazers_count"], 3)
        self.assertEqual(rows[0]["html_url"], "https://github.com/omdsh-dev/7d7d")
        self.assertEqual(rows[0]["description"], "hi")


class TestMergeGithubItems(unittest.TestCase):
    def test_keeps_github_on_overlap_appends_radar_only_sorts_by_stars(self):
        gh = [{"full_name": "a/one", "stargazers_count": 10, "name": "one"}]
        radar = [
            {"full_name": "a/one", "stargazers_count": 99, "name": "one-radar"},
            {"full_name": "b/two", "stargazers_count": 50, "name": "two"},
        ]
        out = merge_github_items(gh, radar)
        self.assertEqual([x["full_name"] for x in out], ["b/two", "a/one"])
        self.assertEqual(out[1]["name"], "one")


class TestIndexRepo(unittest.TestCase):
    def test_radar_repo_and_forks(self):
        self.assertTrue(is_index_repo({
            "full_name": "AdamPlatin123/awesome-dsh-plugins",
            "name": "awesome-dsh-plugins",
        }))
        self.assertTrue(is_index_repo({
            "full_name": "someone/awesome-dsh-plugins",
            "name": "awesome-dsh-plugins",
        }))
        self.assertFalse(is_index_repo({
            "full_name": "liustack/modlens",
            "name": "modlens",
            "description": "vision plugin",
        }))

    def test_awesome_list_name(self):
        self.assertTrue(is_index_repo({
            "full_name": "0xsline/awesome-deepseek-harness",
            "name": "awesome-deepseek-harness",
            "description": "curated plugins",
        }))


class TestPickLatestSnapshot(unittest.TestCase):
    def test_picks_latest_substantial_json(self):
        files = [
            {"name": "20260814T203350Z.json", "size": 1783},
            {"name": "20260814T213619Z.json", "size": 293374},
            {"name": "readme.md", "size": 99},
        ]
        self.assertEqual(pick_latest_snapshot(files)["name"], "20260814T213619Z.json")


class TestPluginManifest(unittest.TestCase):
    def test_requires_dsh_bundle_or_client(self):
        self.assertTrue(plugin_manifest_ok({
            "name": "x",
            "dsh": {"bundle": {"patch": "./cordis.patch.yml"}},
        }))
        self.assertTrue(plugin_manifest_ok({
            "name": "x",
            "dsh": {"client": {"platform": "web"}},
        }))
        self.assertFalse(plugin_manifest_ok(None))
        self.assertFalse(plugin_manifest_ok({"name": "awesome-list"}))
        self.assertFalse(plugin_manifest_ok({"name": "x", "dsh": {}}))

    def test_keep_catalog_row_drops_indexes_and_non_plugins(self):
        radar = {
            "full_name": "AdamPlatin123/awesome-dsh-plugins",
            "name": "awesome-dsh-plugins",
            "description": "雷达索引仓库",
        }
        self.assertFalse(keep_catalog_row(radar, None))
        self.assertFalse(keep_catalog_row(radar, {"name": "radar"}))
        plugin = {
            "full_name": "leavestring/awesome-dsh-background-plugin",
            "name": "awesome-dsh-background-plugin",
        }
        self.assertTrue(keep_catalog_row(plugin, {
            "dsh": {"client": {"platform": "web"}, "bundle": {"patch": "./cordis.patch.yml"}},
        }))
        self.assertFalse(keep_catalog_row(
            {"full_name": "foo/readme-only", "name": "readme-only"},
            None,
        ))
        self.assertTrue(keep_catalog_row(
            {"full_name": "foo/npm-only", "name": "npm-only", "install": "npm", "npm_name": "@foo/bar"},
            None,
        ))
        self.assertIsNone(keep_catalog_row(
            {"full_name": "foo/timeout", "name": "timeout"},
            "error",
        ))

    def test_pick_plugin_manifest_prefers_nested_dsh_package(self):
        root = {"name": "dsh-usage-footer-workspace", "private": True}
        nested = [
            {"name": "helper"},
            {"name": "dsh-usage-status", "dsh": {"client": {"platform": "web"}}},
        ]
        self.assertTrue(plugin_manifest_ok(pick_plugin_manifest([root] + nested)))
        self.assertFalse(plugin_manifest_ok(pick_plugin_manifest([root])))


if __name__ == "__main__":
    unittest.main()


if __name__ == "__main__":
    unittest.main()
