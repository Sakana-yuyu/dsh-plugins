        ),
        h("button", {
          type: "button",
          disabled: !!busy,
          onClick: onUpdate,
          style: btnStyle(!!busy, true)
        }, busy ? "更新中…" : "立即更新")
      );
    }

    function RestartBanner(props) {
      if (!props.show) return null;
      return h("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "12px 14px",
          marginBottom: 12,
          borderRadius: 8,
          border: "1px solid " + BRAND,
          background: BG
        }
      },
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontWeight: 700, color: BRAND, fontSize: 14 } }, "需要重启"),
          h("div", { style: { fontSize: 12, color: FG, marginTop: 4, lineHeight: "18px" } },
            "请完全退出 dsh-desktop 再打开，刚安装或卸载的插件才会生效。"
          )
        ),
        h("button", {
          type: "button",
          onClick: props.onDismiss,
          style: btnStyle(false, true)
        }, "知道了")
      );
    }

    function RestartModal(props) {
      if (!props.show) return null;
      var node = h("div", {
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
            width: "min(420px, 92vw)",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "18px 20px 20px",
            boxSizing: "border-box",
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)"
          }
        },
          h("div", { style: { fontSize: 18, fontWeight: 650, color: "#111827", marginBottom: 10 } }, "更新完成"),
          h("div", { style: { fontSize: 13, lineHeight: "22px", color: "#374151", marginBottom: 16 } },
            "插件已更新。要现在重启应用吗？不重启的话，新版本要等下次启动才生效。"
          ),
          h("div", { style: { display: "flex", gap: 8, justifyContent: "flex-end" } },
            h("button", { type: "button", onClick: props.onLater, style: {
              padding: "8px 14px", borderRadius: 8, border: "1px solid #d1d5db",
              background: "#fff", color: "#111827", fontWeight: 600, cursor: "pointer"
            } }, "稍后"),
            h("button", { type: "button", onClick: props.onRestart, style: {
              padding: "8px 14px", borderRadius: 8, border: "1px solid #2563eb",
              background: "#2563eb", color: "#ffffff", fontWeight: 650, cursor: "pointer"
            } }, "立即重启")
          )
        )
      );
      return overlay(node);
    }

    // Two-column card grid. Injected once at apply time so both the overlay
    // store page and the conversation.view tab get the layout.
    function injectGridCss() {
      if (typeof document === "undefined") return;
      var id = "dsh-plugins-grid-css";
      if (document.getElementById(id)) return;
      var style = document.createElement("style");
      style.id = id;
      style.textContent = [
        // Equal-size card grid: auto-fill creates as many 300px columns as the
        // container width allows and every column shares the remaining width
        // equally, so ALL cards are the same size (no stretched last row).
        // Maximizing the window adds columns instead of widening cards.
        '[data-dsh-plugins-catalog]{width:100%;max-width:none;flex:1 1 auto;min-width:0;align-self:stretch;box-sizing:border-box}',
        '[data-dsh-plugins-grid]{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;align-items:stretch}',
        '[data-dsh-plugins-grid]>*{min-width:0}',
        // Sidebar entry: the shell stacks footer actions in one flex row, so
        // another plugin's footer button would crowd this one. The slot
        // wrapper is display:contents (inline), so select its flex parent
        // (:has) and let it wrap; this entry then owns its own full row and
        // sits at the very bottom (order after every sibling action).
        '.dsh-plugins-sidebar-btn{--dshp-hover:rgba(0,0,0,0.06);--dshp-active:rgba(0,0,0,0.1);order:999;flex:0 0 100%;max-width:100%;width:100%}',
        '.dsh-plugins-sidebar-btn:hover{background:var(--dshp-hover)}',
        '.dsh-plugins-sidebar-btn:active{background:var(--dshp-active)}',
        'div:has(> [data-slot="sidebar.footer.action"]){flex-wrap:wrap}',
        '.dsh-plugins-sidebar-btn+.dsh-plugins-sidebar-btn{margin-top:4px}'
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
