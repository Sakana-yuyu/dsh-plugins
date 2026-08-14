            writeLocalUi({ showSidebar: nextShow, coverSize: nextCover });
          })
          .catch(function () {});
        function onEvt(e) {
          var d = (e && e.detail) || readLocalUi();
          setShow(d.showSidebar !== false);
          if (d.coverSize) setCoverSize(d.coverSize);
        }
        function onStorage(e) {
          if (e.key === LS_KEY) onEvt();
        }
        window.addEventListener(EVT, onEvt);
        window.addEventListener("storage", onStorage);
        return function () {
          dead = true;
          window.removeEventListener(EVT, onEvt);
          window.removeEventListener("storage", onStorage);
        };
      }, []);

      useEffect(function () {
        if (show === false) {
          removeRailHost();
          setHost(null);
          return;
        }
        var start = Date.now();
        var timer = null;
        function tick() {
          var node = ensureRailHost();
          if (node) {
            setHost(node);
            return;
          }
          if (Date.now() - start < 10000) {
            timer = setTimeout(tick, 200);
          }
        }
        tick();
        return function () {
          if (timer) clearTimeout(timer);
        };
      }, [show]);

      if (show === false) {
        return null;
      }
      if (!host || !createPortal) return null;

      var btn = h("button", {
        type: "button",
        onClick: function (e) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          openCatalogView();
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "8px 12px",
          border: "none",
          borderRadius: 8,
          background: "transparent",
          color: FG,
          cursor: "pointer",
          fontSize: 14,
          lineHeight: "20px",
          boxSizing: "border-box",
          textAlign: "left",
          pointerEvents: "auto",
          position: "relative",
          zIndex: 8
        }
      },
        h(PluginIcon),
        h("span", null, "插件"),
        hasUpdate ? h("span", {
          style: {
            marginLeft: "auto",
            fontSize: 11,
            lineHeight: "16px",
            padding: "0 6px",
            borderRadius: 999,
            background: BRAND,
            color: "#fff",
            fontWeight: 650
          }
        }, "更新") : null
      );

      return createPortal(btn, host);
    }

    function SettingsManage() {
      var ui0 = readLocalUi();
      var pf = useState({
        showSidebar: ui0.showSidebar,
        coverSize: ui0.coverSize,
        autoUpdateSelf: true,
        autoUpdateOthers: false
      });
      var prefs = pf[0], setPrefs = pf[1];
      var st = useState("");
      var status = st[0], setStatus = st[1];
      var bz = useState(false);
      var busy = bz[0], setBusy = bz[1];
      var kind = useState("info");
      var statusKind = kind[0], setStatusKind = kind[1];
      var hasNew = useState(false);
      var newer = hasNew[0], setNewer = hasNew[1];
      var rm = useState(false);
      var showRestartModal = rm[0], setShowRestartModal = rm[1];

      useEffect(function () {
        var dead = false;
        fetch("/api/dsh-plugins/prefs")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (dead || !data || !data.ok || !data.prefs) return;
            setPrefs(data.prefs);
            writeLocalUi({
              showSidebar: data.prefs.showSidebar !== false,
              coverSize: data.prefs.coverSize
            });
          })
          .catch(function () {});
        return function () { dead = true; };
      }, []);

      useEffect(function () {
        fetchUpdateInfo(function (err, info) {
          if (!info) return;
          setNewer(!!info.newer);
          if (info.newer) {
            setStatusKind("warn");
            setStatus("发现新版本 " + (info.latest || info.latestSha || "") + "（当前 " + (info.current || "-") + "），请点「更新本插件」");
          }
        });
      }, []);

      function patchPrefs(partial) {
        setPrefs(function (p) { return Object.assign({}, p, partial); });
        if (partial.showSidebar !== undefined || partial.coverSize) writeLocalUi(partial);
        fetch("/api/dsh-plugins/prefs", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(partial)
        })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data && data.ok && data.prefs) setPrefs(data.prefs);
          })
          .catch(function () {});
      }

      function checkNow() {
        if (busy) return;
        setBusy(true);
        setStatus("正在检查更新…");
        fetch("/api/dsh-plugins/updates")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (!data || !data.ok) {
              setStatus((data && (data.error || data.message)) || "检查失败");
              return;
            }
            var self = data.self || {};
            function labelOf(item) {
              if (!item) return "检查失败";
              if (item.status === "error" || item.status === "unknown") return "检查失败";
              if (item.newer) return "有更新";
              if (item.status === "latest") return "已是最新";
              return "检查失败";
            }
            var lines = [];
            lines.push("本插件 " + (self.full_name || "Sakana-yuyu/dsh-plugins") +
              " 当前 " + (self.current || "-") +
              " / 最新 " + (self.latest || self.latestSha || "-") +
              " · " + labelOf(self));
            var inst = data.installed || [];
            if (!inst.length) lines.push("未发现已安装的 github: 目录插件");
            else {
              lines.push("已安装 " + inst.length + " 个：");
              for (var i = 0; i < inst.length; i++) {
                var it = inst[i];
                lines.push("- " + it.full_name + " 当前 " + (it.current || it.version || "-") + " / 最新 " + (it.latest || "-") + " · " + labelOf(it));
              }
            }
            var anyNewer = !!self.newer || !!(data.newerCount);
            var anyErr = self.status === "error" || inst.some(function (x) { return x && x.status === "error"; });
            setNewer(anyNewer);
            setStatusKind(anyNewer ? "warn" : (anyErr ? "err" : "ok"));
            setStatus(lines.join("\n"));
          })
          .catch(function (e) {
            setStatusKind("err");
            setStatus(String((e && e.message) || e || "检查失败"));
          })
          .then(function () { setBusy(false); });
      }

      function postUpdate(target) {
        if (busy) return;
        setBusy(true);
        setStatus(target === "all" ? "正在更新全部…" : "正在更新本插件…");
        fetch("/api/dsh-plugins/update", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target: target })
        })
          .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
          .then(function (data) {
            var text;
            if (data && data.ok) text = data.message || "已更新。请完全退出 dsh-desktop 再打开，插件才会生效。";
            else text = (data && (data.message || data.error || data.stderr)) || "更新失败";
            setStatusKind((data && data.ok) ? "ok" : "err");
            if (data && data.ok) {
              setNewer(false);
              writeRestartNeeded(true);
              setShowRestartModal(true);
            }
            setStatus(String(text));
          })
          .catch(function (e) {
            setStatusKind("err");
