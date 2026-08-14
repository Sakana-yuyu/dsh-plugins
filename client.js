window.__ModuleLoader__.load({
  id: "dsh-plugins-catalog",
  factory: (require) => {
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
    var BRAND = "var(--dsw-alias-brand-primary-new-colorprimary-new-color)";
    var FG = "var(--dsw-alias-label-primary)";
    var MUTED = "var(--dsw-alias-label-tertiary)";
    var LINE = "var(--dsw-alias-border-l2)";
    var BG = "var(--dsw-alias-bg-module-platform)";
    var ERR = "var(--dsw-alias-state-error-primary)";
    var OK = "var(--dsw-alias-state-success-primary)";
    var LS_KEY = "dsh-plugins-ui";
    var EVT = "dsh-plugins-ui";
    var UPD_EVT = "dsh-plugins-update";
    var RESTART_LS = "dsh-plugins-restart";
    var SELF_FULL = "Sakana-yuyu/dsh-plugins";
    var SITE = "https://sakana-yuyu.github.io/dsh-plugins/";

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
            latestSha: self.latestSha || "",
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
      fetch("/api/dsh-plugins/installed")
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
    function cardFromInstalled(row) {
      if (row && row.catalog) {
        var c = {};
        for (var k in row.catalog) c[k] = row.catalog[k];
        c.installed = true;
        if (row.warning) c.warning = row.warning;
        if (row.self) c.self = true;
        return c;
      }
      var full = (row && row.full_name) || "";
      var slash = full.indexOf("/");
      return {
        name: (row && row.name) || full,
        full_name: full,
        description: (row && row.spec) || "",
        install: "",
        author: slash > 0 ? full.slice(0, slash) : "",
        warning: (row && row.warning) || "",
        self: !!(row && row.self)
      };
    }
