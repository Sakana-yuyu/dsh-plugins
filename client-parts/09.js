              : "没有匹配的插件"
          ) : null,
          ((view === "installed" || (!loading && !error)) && matched.length > 0) ? h("div", { style: { marginTop: 14 } },
            h(Pager, { cur: cur, pages: pages, setPage: setPage })
          ) : null
        )
      );
    }

    function CatalogView() {
      var coverSize = readLocalUi().coverSize;
      var os = useState(storeOpen);
      var open = os[0], setOpen = os[1];
      useEffect(function () {
        var un = subscribeStoreOpen(function (v) { setOpen(v); });
        return un;
      }, []);
      useEffect(function () {
        if (open) return hideStoreChrome();
        return;
      }, [open]);
      if (!open) return null;
      // Full-screen opaque page rendered inside the shell.overlay layer. The
      // background is fully opaque so the conversation window is completely
      // hidden while the store is open. It must NOT portal to document.body:
      // the overlay layer is the shell's own stacking surface, and portaling
      // out of it can break z-order in the desktop shell.
      return h("div", {
        "data-dsh-plugins-catalog": "",
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: BG,
          color: FG,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
          pointerEvents: "auto"
        }
      },
        h(CatalogErrorBoundary, null,
          h(CatalogDrawer, {
            coverSize: coverSize,
            onClose: function () { setStoreOpen(false); }
          })
        )
      );
    }

    // conversation.view variant: renders the catalog full-height inside the
    // view ring, activated by the header view tab (owner-driven `only`).
    function CatalogViewTab() {
      var coverSize = readLocalUi().coverSize;
      useEffect(function () {
        return hideStoreChrome();
      }, []);
      return h("div", {
        "data-dsh-plugins-catalog": "",
        style: {
          height: "100%",
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          flex: 1,
          alignSelf: "stretch",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }
      },
        h(CatalogErrorBoundary, null,
          h(CatalogDrawer, { coverSize: coverSize })
        )
      );
    }

    function SidebarStore(props) {
      var ui0 = readLocalUi();
      var sh = useState(ui0.showSidebar);
      var show = sh[0], setShow = sh[1];
      var cs = useState(ui0.coverSize);
      var coverSize = cs[0], setCoverSize = cs[1];
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

      if (show === false) {
        return null;
      }

      // Render the sidebar entry as a normal slot cell so the shell places it
      // beside Settings. Previously the button was createPortal'd into a DOM
      // node scraped with hard-coded [data-slot] selectors; when those selectors
      // didn't match (different shell/skin), the button never appeared and the
      // catalog page could not be opened.
      return h("button", {
        type: "button",
        title: "插件库",
        className: "dsh-plugins-sidebar-btn",
        onClick: function (e) {
          if (e && e.preventDefault) e.preventDefault();
          if (e && e.stopPropagation) e.stopPropagation();
          setStoreOpen(true);
        },
        // Aligned with the adjacent sidebar footer badges (settings / cordis
        // panel): same 49px height, same horizontal padding, same radius.
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          height: 49,
          padding: "0 8px 0 6px",
          border: "none",
          borderRadius: 12,
          background: "transparent",
          color: FG,
          cursor: "pointer",
          fontSize: 14,
          overflow: "hidden",
          boxSizing: "border-box",
          textAlign: "left",
          fontFamily: "inherit",
          flexShrink: 0
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
