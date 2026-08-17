var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useCallback = React.useCallback;
    var useRef = React.useRef;
    var ReactDOM = null;
    try { ReactDOM = require("react-dom"); } catch (e) { ReactDOM = null; }
    var createPortal = ReactDOM && (ReactDOM.createPortal || (ReactDOM.default && ReactDOM.default.createPortal));

    var CATS = [
      { id: "all", zh: "全部分类" },
      { id: "official", zh: "官方核心" },
      { id: "ui", zh: "UI 与皮肤" },
      { id: "vision", zh: "视觉" },
      { id: "tui", zh: "终端 TUI" },
      { id: "desktop", zh: "桌面" },
      { id: "browser", zh: "浏览器" },
      { id: "workflow", zh: "工作流" },
      { id: "tools", zh: "工具" },
      { id: "search", zh: "搜索" },
      { id: "dev", zh: "开发" },
      { id: "awesome", zh: "精选" },
      { id: "other", zh: "其他" }
    ];
    var SCOPES = [
      { id: "all", zh: "全部" },
      { id: "official", zh: "官方" },
      { id: "community", zh: "社区" }
    ];
    var BRAND = "#2563eb";
    var FG = "#111827";
    var MUTED = "#6b7280";
    var LINE = "#e5e7eb";
    var BG = "#ffffff";
    var ERR = "#dc2626";
    var OK = "#16a34a";
    var LS_KEY = "dsh-plugins-ui";
    var EVT = "dsh-plugins-ui";
    var UPD_EVT = "dsh-plugins-update";
    var RESTART_LS = "dsh-plugins-restart";
    var SELF_FULL = "Sakana-yuyu/dsh-plugins";
    var SITE = "https://sakana-yuyu.github.io/dsh-plugins/";

    // Dark-theme detection for the sidebar entry. The DSH theme presenter marks
    // dark palettes with body[data-ds-dark-theme] and html { color-scheme }, so
    // those are the primary signals; a prefers-color-scheme query covers
    // system-following shells, and a luminance probe over the button's real
    // background catches skins that repaint without setting the attribute. The
    // sidebar button lives on a transparent cell, so the probe walks up to the
    // first opaque ancestor instead of judging the button itself.
    function parseRgbColor(str) {
      var m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(String(str || ""));
      if (!m) return null;
      return [Number(m[1]), Number(m[2]), Number(m[3])];
    }
    function relativeLuminance(rgb) {
      var f = function (v) {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
    }
    function sampleOpaqueBackgroundLuminance() {
      try {
        var node = document.querySelector(".dsh-plugins-sidebar-btn");
        var limit = document.body || document.documentElement;
        while (node && node !== limit) {
          var bg = getComputedStyle(node).backgroundColor;
          var transparent = !bg || bg === "transparent" || /rgba\(0, 0, 0, 0\)/.test(bg);
          var rgb = parseRgbColor(bg);
          if (!transparent && rgb) return relativeLuminance(rgb);
          node = node.parentElement;
        }
      } catch (e) {}
      return null;
    }
    function darkThemeActive() {
      // The DSH presenter writes both signals for every resolved theme, so
      // they are authoritative in both directions — never fall through to
      // matchMedia/luminance when the shell already said "light".
      try {
        if (document.body && document.body.hasAttribute("data-ds-dark-theme")) return true;
      } catch (e) {}
      try {
        var scheme = document.documentElement && document.documentElement.style.colorScheme;
        if (scheme) return scheme === "dark";
      } catch (e) {}
      try {
        if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) return true;
      } catch (e) {}
      var sampled = sampleOpaqueBackgroundLuminance();
      if (sampled !== null) return sampled < 0.35;
      return false;
    }

    // Shared open-state for the full-screen plugin store panel. The sidebar
    // "插件" button toggles it; the shell.overlay occupant renders the panel
    // while open. The panel is fully self-contained (does not depend on
    // activating a conversation.view tab, which the desktop shell would not
    // reliably switch to from a sidebar action).
    var storeOpen = false;
    var storeListeners = [];
    function setStoreOpen(v) {
      v = !!v;
      if (v === storeOpen) return;
      storeOpen = v;
      for (var k = 0; k < storeListeners.length; k++) {
        try { storeListeners[k](v); } catch (e) {}
      }
    }
    function subscribeStoreOpen(fn) {
      storeListeners.push(fn);
      return function () {
        var i = storeListeners.indexOf(fn);
        if (i >= 0) storeListeners.splice(i, 1);
      };
    }

    // Error boundary: if the catalog UI throws during render, show the error
    // instead of letting the slot abdicate (which blanks the view silently).
    var CatalogErrorBoundary = (function () {
      function CB(props) {
        React.Component.call(this, props);
        this.state = { err: null };
      }
      CB.prototype = Object.create(React.Component.prototype);
      CB.prototype.constructor = CB;
      CB.prototype.componentDidCatch = function (err) {
        this.setState({ err: String((err && err.message) || err) });
      };
      CB.prototype.render = function () {
        if (this.state.err) {
          return h("div", {
            style: { color: "#dc2626", padding: 16, fontSize: 13, lineHeight: "20px" }
          }, "插件库渲染出错：" + this.state.err);
        }
        return this.props.children;
      };
      return CB;
    })();

    function PluginIcon() {
      return h("svg", {
        width: 18,
        height: 18,
        viewBox: "0 0 20 20",
        fill: "none",
        "aria-hidden": "true",
        style: { flexShrink: 0, display: "block" }
      },
        h("circle", { cx: 10, cy: 10, r: 8.2, stroke: "currentColor", strokeWidth: 1.5 }),
        h("path", {
          d: "M10 4.8c1.7 2.1 2.8 3.4 2.8 5.4A2.8 2.8 0 0 1 10 13a2.8 2.8 0 0 1-2.8-2.8c0-2 1.1-3.3 2.8-5.4z",
          fill: "currentColor"
        })
      );
    }

    function publishUpdate(info) {
      try { window.dispatchEvent(new CustomEvent(UPD_EVT, { detail: info || {} })); } catch (e) {}
    }
    function fetchUpdateInfo(cb) {
      fetch("/api/dsh-plugins/updates")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var self = (data && data.self) || {};
          var info = {
            ok: !!(data && data.ok),
            newer: !!(self.newer),
            current: self.current || "",
            latest: self.latest || "",
            latestSha: self.latestSha || "",
            status: self.status || "",
            newerCount: (data && data.newerCount) || 0,
            installed: (data && data.installed) || []
          };
          publishUpdate(info);
          if (cb) cb(null, info, data);
        })
        .catch(function (e) { if (cb) cb(e); });
    }
    function runUpdate(target, cb) {
      fetch("/api/dsh-plugins/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target: target || "self" })
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false, message: "invalid json" }; }); })
        .then(function (data) { if (cb) cb(null, data); })
        .catch(function (e) { if (cb) cb(e); });
    }
    function restartNow() {
      // Desktop shell: prefer a full app relaunch (Rust shell + Host). The
      // previous code invoked "plugin:process|restart", which the desktop
      // shell never registered, so it silently fell back to reloading the
      // page while only the backend restarted — the shell window kept the
      // stale UI. invoke("restart_app") relaunches the whole desktop process;
      // on failure (plain web, or an older shell) fall back to the backend
      // restart endpoint.
      var inv = (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke)
        || (window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke);
      if (typeof inv === "function") {
