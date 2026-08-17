        inv("restart_app").catch(function () {
          fetch("/api/dsh-plugins/restart", { method: "POST" }).catch(function () {});
        });
        return;
      }
      fetch("/api/dsh-plugins/restart", { method: "POST" }).catch(function () {});
      setTimeout(function () { location.reload(); }, 1200);
    }
    function readRestartNeeded() {
      try { return localStorage.getItem(RESTART_LS) === "1"; } catch (e) { return false; }
    }
    function writeRestartNeeded(on) {
      try {
        if (on) localStorage.setItem(RESTART_LS, "1");
        else localStorage.removeItem(RESTART_LS);
      } catch (e) {}
    }
    function fetchInstalled(cb) {
      fetch("/api/dsh-plugins/installed?check=1")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.ok && Array.isArray(data.installed)) {
            if (cb) cb(null, data.installed, data);
            return;
          }
          fetch("/api/dsh-plugins/updates")
            .then(function (r2) { return r2.json(); })
            .then(function (d2) { if (cb) cb(null, (d2 && d2.installed) || [], d2); })
            .catch(function (e) { if (cb) cb(e, []); });
        })
        .catch(function () {
          fetch("/api/dsh-plugins/updates")
            .then(function (r2) { return r2.json(); })
            .then(function (d2) { if (cb) cb(null, (d2 && d2.installed) || [], d2); })
            .catch(function (e) { if (cb) cb(e, []); });
        });
    }
    function attachUpdateFields(c, row) {
      if (!c || !row) return c;
      c.newer = !!row.newer;
      c.current = row.current || row.version || "";
      c.latest = row.latest || "";
      c.currentSha = row.currentSha || "";
      c.latestSha = row.latestSha || "";
      c.status = row.status || "";
      c.version = row.version || c.current || "";
      return c;
    }
    function itemKey(row) {
      if (!row) return "";
      return row.dep_name || row.name || row.npm_name || row.full_name || row.spec || "";
    }
    function cardFromInstalled(row) {

      if (row && row.catalog) {
        var c = {};
        for (var k in row.catalog) c[k] = row.catalog[k];
        c.installed = true;
        c.dep_name = row.name || "";
        c.removable = row.removable !== false;
        c.placeholder = !!row.placeholder;
        if (row.placeholder) c.newer = false;
        if (row.warning) c.warning = row.warning;
        if (row.issues_url) c.issues_url = row.issues_url;
        if (row.usable === false) c.usable = false;
        if (row.self) c.self = true;
        return attachUpdateFields(c, row.placeholder ? Object.assign({}, row, { newer: false }) : row);
      }
      var full = (row && row.full_name) || "";
      var pkgName = (row && row.name) || "";
      var slash = full.indexOf("/");
      return attachUpdateFields({
        name: pkgName || full,
        full_name: full,
        dep_name: pkgName,
        npm_name: (row && row.npm_name) || "",
        install_method: (row && row.install_method) || (row && row.source) || "",
        source: (row && row.source) || "",
        removable: row && row.removable !== false,
        placeholder: !!(row && row.placeholder),
        description: (row && row.spec) || "",
        install: "",
        author: slash > 0 ? full.slice(0, slash) : "",
        warning: (row && row.warning) || "",
        issues_url: (row && row.issues_url) || (full ? ("https://github.com/" + full + "/issues") : ""),
        usable: row ? row.usable !== false : true,
        self: !!(row && row.self),
        entryId: (row && row.entryId) || "",
        enabled: row ? row.enabled !== false : true,
        toggleable: !!(row && row.toggleable)
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
