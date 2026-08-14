          if (label === "插件" || label === "插件库") {
            try { b.click(); return true; } catch (e) {}
          }
        }
      }
      return false;
    }

    function SidebarStore(props) {
      var ui0 = readLocalUi();
      var sh = useState(ui0.showSidebar);
      var show = sh[0], setShow = sh[1];
      var cs = useState(ui0.coverSize);
      var coverSize = cs[0], setCoverSize = cs[1];
      var hs = useState(null);
      var host = hs[0], setHost = hs[1];
      var nw = useState(false);
      var hasUpdate = nw[0], setHasUpdate = nw[1];

      useEffect(function () {
        function onUp(e) {
          var d = (e && e.detail) || {};
          setHasUpdate(!!d.newer || (d.newerCount > 0));
        }
        window.addEventListener(UPD_EVT, onUp);
        fetchUpdateInfo(function (err, info) {
          if (info) setHasUpdate(!!info.newer || (info.newerCount > 0));
        });
        return function () { window.removeEventListener(UPD_EVT, onUp); };
      }, []);

      useEffect(function () {
        var dead = false;
        fetch("/api/dsh-plugins/prefs")
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (dead || !data || !data.ok || !data.prefs) return;
            var p = data.prefs;
            var nextShow = p.showSidebar !== false;
            var nextCover = p.coverSize === "medium" ? "medium" : "large";
            setShow(nextShow);
            setCoverSize(nextCover);
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
