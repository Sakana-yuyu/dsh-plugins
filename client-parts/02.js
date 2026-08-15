        author: slash > 0 ? full.slice(0, slash) : "",
        warning: (row && row.warning) || "",
        issues_url: (row && row.issues_url) || (full ? ("https://github.com/" + full + "/issues") : ""),
        usable: row ? row.usable !== false : true,
        self: !!(row && row.self)
      }, row);
    }

    function Pager(props) {
      var cur = props.cur;
      var pages = props.pages;
      var setPage = props.setPage;
      var jp = useState(String(cur));
      var jump = jp[0], setJump = jp[1];
      useEffect(function () { setJump(String(cur)); }, [cur]);
      function go(n) {
        n = parseInt(n, 10);
        if (!(n > 0)) n = 1;
        if (n > pages) n = pages;
        setPage(n);
      }
      return h("div", {
        style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }
      },
        h("button", {
          type: "button",
          disabled: cur <= 1,
          onClick: function () { go(1); },
          style: btnStyle(cur <= 1, false)
        }, "首页"),
        h("button", {
          type: "button",
          disabled: cur <= 1,
          onClick: function () { go(cur - 1); },
          style: btnStyle(cur <= 1, false)
        }, "上一页"),
        h("form", {
          onSubmit: function (e) { if (e && e.preventDefault) e.preventDefault(); go(jump); },
          style: { display: "flex", alignItems: "center", gap: 6 }
        },
          h("input", {
            value: jump,
            onChange: function (e) { setJump(e.target.value); },
            inputMode: "numeric",
            title: "输入页码后回车或点跳转",
            style: {
              width: 52,
              padding: "4px 6px",
              borderRadius: 6,
              border: "1px solid " + LINE,
              background: BG,
              color: FG,
              textAlign: "center",
              fontSize: 12,
              outline: "none"
            }
          }),
          h("span", { style: { color: MUTED, fontSize: 12 } }, "/ " + pages),
          h("button", { type: "submit", style: btnStyle(false, true) }, "跳转")
        ),
        h("button", {
          type: "button",
          disabled: cur >= pages,
          onClick: function () { go(cur + 1); },
          style: btnStyle(cur >= pages, false)
        }, "下一页"),
        h("button", {
          type: "button",
          disabled: cur >= pages,
          onClick: function () { go(pages); },
          style: btnStyle(cur >= pages, false)
        }, "末页")
      );
    }

    function UpdateBanner(props) {
      var info = props.info;
      var busy = props.busy;
      var onUpdate = props.onUpdate;
      var note = props.note;
      if (note) {
        return h("div", {
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "10px 12px",
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid " + (note.ok ? OK : ERR),
            color: note.ok ? OK : ERR,
            background: BG,
            fontWeight: 600
          }
        }, note.text);
      }
      if (info && (info.status === "error" || info.ok === false)) {
        return h("div", {
          onClick: props.onRetry,
          style: {
            padding: "8px 12px",
            marginBottom: 12,
            borderRadius: 8,
            border: "1px solid " + LINE,
            background: BG,
            color: MUTED,
            fontSize: 12,
            cursor: props.onRetry ? "pointer" : "default"
          }
        }, "检查失败，点此重试");
      }
      var names = [];
      var inst = (info && info.installed) || [];
      for (var ui = 0; ui < inst.length; ui++) {
        if (inst[ui] && inst[ui].newer) names.push(inst[ui].name || inst[ui].full_name);
      }
      if (!names.length && info && info.newer) names.push("dsh-plugins-catalog");
      if (!info || (!info.newer && !(info.newerCount > 0) && !names.length)) return null;
      return h("div", {
        style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px",
          marginBottom: 12,
          borderRadius: 8,
          border: "1px solid " + BRAND,
          background: BG
        }
      },
        h("div", { style: { minWidth: 0 } },
          h("div", { style: { fontWeight: 650, color: BRAND } }, names.length ? ("有更新：" + names.join("、")) : "目录插件有新版本"),
          h("div", { style: { fontSize: 12, color: MUTED, marginTop: 2 } },
            names.length
              ? ("共 " + names.length + " 个。对应卡片会标「有更新」，点那张卡的「更新」。")
              : ("当前 " + (info.current || "-") + " → " + (info.latest || info.latestSha || "最新"))
          )
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
