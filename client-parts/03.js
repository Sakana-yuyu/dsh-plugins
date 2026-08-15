        // container width allows and every column shares the remaining width
        // equally, so ALL cards are the same size (no stretched last row).
        // Maximizing the window adds columns instead of widening cards.
        '[data-dsh-plugins-catalog]{width:100%;max-width:none;flex:1 1 auto;min-width:0;align-self:stretch;box-sizing:border-box}',
        '[data-dsh-plugins-grid]{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:stretch}',
        '[data-dsh-plugins-grid]>*{min-width:0}',
        '.dsh-plugins-sidebar-btn:hover{background:rgba(0,0,0,0.06)}',
        '.dsh-plugins-sidebar-btn:active{background:rgba(0,0,0,0.1)}',
        '[class*="footerActions"]{flex-direction:column!important}'
      ].join("");
      document.head.appendChild(style);
    }

    function hideStoreChrome() {
      if (typeof document === "undefined") return function () {};
      document.documentElement.setAttribute("data-dsh-plugins-store", "1");
      var style = document.getElementById("dsh-plugins-store-css");
      if (!style) {
        style = document.createElement("style");
        style.id = "dsh-plugins-store-css";
        document.head.appendChild(style);
      }
      style.textContent = [
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.composer"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.composer.bar"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.composer.footer"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.input"]{display:none!important}',
        'html[data-dsh-plugins-store="1"] [data-slot="conversation.view"]{width:100%!important;max-width:none!important;flex:1 1 auto!important;min-width:0!important}',
        'html[data-dsh-plugins-store="1"] *:has([data-dsh-plugins-catalog]){max-width:none!important}'
      ].join("");
      var extra = [];
      function hideNode(el) {
        if (!el || el.getAttribute("data-dsh-plugins-hid")) return;
        if (el.querySelector && el.querySelector("[data-dsh-plugins-catalog]")) return;
        el.setAttribute("data-dsh-plugins-hid", "1");
        el.setAttribute("data-dsh-plugins-disp", el.style.display || "");
        el.style.display = "none";
        extra.push(el);
      }
      var fields = document.querySelectorAll("textarea, input, [contenteditable='true']");
      for (var i = 0; i < fields.length; i++) {
        var el = fields[i];
        var ph = String(el.getAttribute("placeholder") || el.getAttribute("aria-label") || "");
        if (!/给智能体发消息|发消息|Send message/i.test(ph)) continue;
        var node = el;
        var found = null;
        for (var k = 0; k < 10 && node && node !== document.body; k++) {
          var pos = "";
          try { pos = window.getComputedStyle(node).position; } catch (e) {}
          if (pos === "fixed" || pos === "absolute" || pos === "sticky") { found = node; break; }
          node = node.parentElement;
        }
        hideNode(found || el.parentElement);
      }
      return function () {
        document.documentElement.removeAttribute("data-dsh-plugins-store");
        if (style && style.parentNode) style.parentNode.removeChild(style);
        for (var j = 0; j < extra.length; j++) {
          var n = extra[j];
          if (!n) continue;
          n.style.display = n.getAttribute("data-dsh-plugins-disp") || "";
          n.removeAttribute("data-dsh-plugins-hid");
          n.removeAttribute("data-dsh-plugins-disp");
        }
      };
    }

    function ownerOf(full) {
      var s = String(full || "");
      var i = s.indexOf("/");
      return i > 0 ? s.slice(0, i) : "";
    }
    function repoUrl(p) {
      var full = String((p && p.full_name) || "").trim();
      var u = String((p && (p.url || p.html_url)) || "").trim();
      if (/^https:\/\/(www\.)?github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/i.test(u)) return u.replace(/\/$/, "");
      if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(full)) return "https://github.com/" + full;
      return "";
    }
    function openExternal(url) {
      url = String(url || "").trim();
      if (!/^https:\/\//i.test(url)) return;
      function invokeTauri(cmd, args) {
        try {
          var inv = (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke)
            || (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke);
          if (inv) return inv(cmd, args);
        } catch (e) {}
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
