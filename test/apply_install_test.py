import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from apply_install import add_short_keys, apply_rows  # noqa: E402


class TestLinkInstall(unittest.TestCase):
    def test_compact_keeps_link_method(self):
        o = add_short_keys({}, {"install": "link"})
        self.assertEqual(o["im"], "link")

    def test_apply_rows_preserves_existing_link(self):
        rows = [{"full_name": "AdamPlatin123/awesome-dsh-plugins", "install": "link"}]
        apply_rows(rows, {})
        self.assertEqual(rows[0]["install"], "link")


if __name__ == "__main__":
    unittest.main()
