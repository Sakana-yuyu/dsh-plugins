        return null;
      }
      try {
        var t = window.__TAURI__;
        if (t && t.opener && t.opener.openUrl) { t.opener.openUrl(url); return; }
        if (t && t.shell && t.shell.open) { t.shell.open(url); return; }
      } catch (e) {}
      var p1 = invokeTauri("plugin:opener|open_url", { url: url });
      if (p1 && p1.then) {
        p1.catch(function () {
          var p2 = invokeTauri("plugin:shell|open", { path: url });
          if (!(p2 && p2.then)) fallbackOpen(url);
          else p2.catch(function () { fallbackOpen(url); });
        });
        return;
      }
      fallbackOpen(url);
    }
    function fallbackOpen(url) {
      var w = null;
      try { w = window.open(url, "_blank", "noopener,noreferrer"); } catch (e) {}
      if (w) return;
      fetch("/api/dsh-plugins/open", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: url })
      }).catch(function () {});
    }
    function copyText(text) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      return Promise.reject(new Error("no clipboard"));
    }
    function excerpt(s, max) {
      s = String(s || "").replace(/\r\n/g, "\n").trim();
      max = max || 12000;
      if (s.length > max) s = s.slice(0, max) + "…";
      return s;
    }
    function coverH(size) {
      return size === "medium" ? 200 : 0;
    }
    function readLocalUi() {
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) return { showSidebar: true, coverSize: "large" };
        var o = JSON.parse(raw);
        return {
          showSidebar: o.showSidebar !== false,
          coverSize: o.coverSize === "medium" ? "medium" : "large"
        };
      } catch (e) {
        return { showSidebar: true, coverSize: "large" };
      }
    }
    function writeLocalUi(partial) {
      var cur = readLocalUi();
      if (partial.showSidebar !== undefined) cur.showSidebar = !!partial.showSidebar;
      if (partial.coverSize) cur.coverSize = partial.coverSize === "medium" ? "medium" : "large";
      try { localStorage.setItem(LS_KEY, JSON.stringify(cur)); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent(EVT, { detail: cur })); } catch (e) {}
      return cur;
    }
    function chipStyle(on) {
      return {
        display: "inline-block",
        padding: "3px 10px",
        margin: "0 6px 6px 0",
        borderRadius: 999,
        border: "1px solid " + (on ? BRAND : LINE),
        background: BG,
        color: on ? BRAND : FG,
        cursor: "pointer",
        fontSize: 12,
        lineHeight: "18px"
      };
    }
    function btnStyle(disabled, primary, danger) {
      var color = disabled ? MUTED : (danger ? ERR : (primary ? BRAND : FG));
      var border = (danger && !disabled) ? ERR : (primary && !disabled ? BRAND : LINE);
      return {
        padding: "6px 12px",
        borderRadius: 6,
        border: "1px solid " + border,
        background: BG,
        color: color,
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: 12,
        lineHeight: "18px"
      };
    }
    function inputStyle() {
      return {
        flex: 1,
        minWidth: 0,
        padding: "6px 10px",
        borderRadius: 6,
        border: "1px solid " + LINE,
        background: BG,
        color: FG,
        fontSize: 13,
        outline: "none"
      };
    }
    function cmdStyle() {
      return {
        display: "block",
        width: "100%",
        maxWidth: "100%",
        marginTop: 8,
        padding: "4px 0",
        border: "none",
        background: "transparent",
        color: MUTED,
        fontSize: 11,
        lineHeight: "16px",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: "pointer",
        textAlign: "left",
        boxSizing: "border-box"
      };
    }
    function matchItem(p, q, scope, cat) {
      if (scope === "official" && !p.official) return false;
      if (scope === "community" && p.official) return false;
      if (cat && cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      var blob = [p.name, p.full_name, p.author, p.description, p.description_zh, p.description_en, p.category_zh, p.category].join(" ").toLowerCase();
      return blob.indexOf(q) >= 0;
    }
    function overlay(node) {
      // Render in place instead of portaling to document.body: the store page
      // is a full-screen fixed layer, and a body-portaled modal with the same
      // z-index can be covered by it in the desktop shell. Rendering the modal
      // inside the tree keeps it above the page it belongs to.
      return node;
    }

    function sectionTitle(text) {
      return h("div", {
        style: { fontSize: 13, fontWeight: 600, color: FG, margin: "16px 0 8px" }
      }, text);
    }

    function DetailModal(props) {
      var p = props.p;
      var detail = props.detail;
      var onClose = props.onClose;
      var full = p.full_name || "";
      var pkgName = p.npm_name || p.name || "";
      var id = pkgName || full;
      var author = p.author || ownerOf(full);
      var zh = p.description_zh || p.description || "";
      var en = p.description_en || "";
      var imgs = (detail && detail.images) || [];
      if (imgs.length > 16) imgs = imgs.slice(0, 16);
      var ci = useState(0);
      var curIdx = ci[0], setCurIdx = ci[1];
      var safeIdx = imgs.length ? (curIdx % imgs.length) : 0;
      function prevImg() {
        if (!imgs.length) return;
        setCurIdx((safeIdx + imgs.length - 1) % imgs.length);
      }
      function nextImg() {
        if (!imgs.length) return;
        setCurIdx((safeIdx + 1) % imgs.length);
      }
      var readmeZh = excerpt((detail && detail.readme_zh) || "", 12000);
      var readmeEn = excerpt((detail && detail.readme_en) || "", 12000);
      var readme = readmeZh || readmeEn;
      var node = h("div", {
        onClick: onClose,
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 10001,
          background: "rgba(0,0,0,0.48)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          boxSizing: "border-box"
        }
      },
        h("div", {
          onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); },
          style: {
            // Adaptive full-size: follows the viewport (94vw / up to 92vh),
            // grows with a large window, stays compact on a small one.
            width: "min(1200px, 94vw)",
            maxHeight: "92vh",
            minHeight: "60vh",
            overflow: "auto",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "18px 20px 24px",
            boxSizing: "border-box",
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)"
          }
        },
          h("div", {
            style: {
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
              paddingRight: 40
            }
          },
            h("div", { style: { minWidth: 0 } },
              h("div", { style: { fontSize: 18, fontWeight: 650, color: FG } }, p.name || pkgName || full),
              h("div", { style: { color: MUTED, fontSize: 12, marginTop: 4 } },
                (author ? author + " · " : "") + (p.category_zh || p.category || "") +
                (full ? " · " + full : "")
              )
            )
          ),
          (detail && detail.loading) ? h("div", { style: { color: MUTED, marginTop: 12 } }, "正在加载效果图和文档…") : null,
          (detail && detail.error) ? h("div", { style: { color: ERR, marginTop: 12 } }, detail.error) : null,
          sectionTitle("效果图"),
          imgs.length ? h("div", {
            style: {
              position: "relative",
              height: 340,
