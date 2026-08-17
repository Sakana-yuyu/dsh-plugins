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
      // Theme-aware foreground: the sidebar cell is transparent, so a dark
      // shell would swallow the near-black default FG and the button (and its
      // icon) become invisible. Track dark mode live — the theme presenter
      // flips body[data-ds-dark-theme] / color-scheme at runtime, and the
      // luminance probe falls back for skins that only repaint CSS.
      var dt = useState(darkThemeActive());
      var dark = dt[0], setDark = dt[1];

      useEffect(function () {
        function update() { setDark(darkThemeActive()); }
        update();
        var mo = null;
        try {
          if (document.body && window.MutationObserver) {
            mo = new MutationObserver(update);
            mo.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme", "class", "style"] });
          }
        } catch (e) {}
        var mq = null;
        try { mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null; } catch (e) {}
        if (mq && mq.addEventListener) mq.addEventListener("change", update);
        window.addEventListener(EVT, update);
        return function () {
          if (mo) mo.disconnect();
          if (mq && mq.removeEventListener) mq.removeEventListener("change", update);
          window.removeEventListener(EVT, update);
        };
      }, []);

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

      // On a dark shell the near-black default FG disappears; use a light
      // foreground and lighter hover/active tints so the entry stays visible.
      var btnFg = dark ? "#f3f4f6" : FG;
      var btnHover = dark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)";
      var btnActive = dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.1)";

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
          color: btnFg,
          cursor: "pointer",
          fontSize: 14,
          overflow: "hidden",
          boxSizing: "border-box",
          textAlign: "left",
          fontFamily: "inherit",
          flexShrink: 0,
          "--dshp-hover": btnHover,
          "--dshp-active": btnActive
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
      // Same dark-theme awareness as the sidebar entry: the settings section
      // renders on the shell's own surface, so keep the foreground readable
      // when that surface is dark.
      var dt = useState(darkThemeActive());
      var dark = dt[0], setDark = dt[1];

      useEffect(function () {
        function update() { setDark(darkThemeActive()); }
        update();
        var mo = null;
        try {
          if (document.body && window.MutationObserver) {
            mo = new MutationObserver(update);
