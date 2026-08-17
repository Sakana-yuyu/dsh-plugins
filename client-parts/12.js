        toggleRow("自动更新本目录插件", !!prefs.autoUpdateSelf, function (v) { patchPrefs({ autoUpdateSelf: v }); }),
        toggleRow("自动更新已安装的目录插件", !!prefs.autoUpdateOthers, function (v) { patchPrefs({ autoUpdateOthers: v }); }),
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 } },
          h("button", { type: "button", disabled: busy, onClick: checkNow, style: btnStyle(busy, true) }, "立即检查更新"),
          h("button", { type: "button", disabled: busy, onClick: function () { postUpdate("self"); }, style: btnStyle(busy, false) }, "更新本插件"),
          h("button", { type: "button", disabled: busy, onClick: function () { postUpdate("all"); }, style: btnStyle(busy, false) }, "更新全部")
        ),
        newer ? h("div", {
          style: {
            marginTop: 12,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid " + BRAND,
            color: BRAND,
            fontWeight: 650
          }
        }, "有可用更新，请点「更新本插件」，完成后请完全退出 dsh-desktop 再打开") : null,
        status ? h("div", {
          style: {
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid " + (statusKind === "ok" ? OK : statusKind === "err" ? ERR : statusKind === "warn" ? BRAND : LINE),
            color: statusKind === "ok" ? OK : statusKind === "err" ? ERR : statusKind === "warn" ? BRAND : FG,
            background: BG,
            whiteSpace: "pre-wrap",
            fontSize: 13,
            lineHeight: "20px",
            fontWeight: 600
          }
        }, status) : null,
        h("div", { style: { marginTop: 14 } },
          h("a", {
            href: SITE,
            target: "_blank",
            rel: "noreferrer",
            onClick: function (e) {
              if (e && e.preventDefault) e.preventDefault();
              openExternal(SITE);
            },
            style: { color: BRAND, textDecoration: "none", fontSize: 12 }
          }, "在线目录")
        )
      );
    }

    function apply(ctx) {
      injectGridCss();
      // Top header view tab "插件" (owner-activated view ring).
      ctx.slots.inject("conversation.view", () => ctx.slots.register({
        name: "conversation.view",
        id: "dsh-plugins",
        order: 20,
        label: () => "插件",
      }, CatalogViewTab));
      // Full-screen panel opened from the sidebar "插件" button.
      ctx.slots.inject("shell.overlay", () => ctx.slots.register({
        name: "shell.overlay",
        id: "dsh-plugins-store",
        order: 60,
        label: () => "插件库",
      }, CatalogView));
      ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
        name: "sidebar.footer.action",
        id: "dsh-plugins-catalog",
        order: 40,
        label: () => "插件",
        inject: () => ({}),
      }, SidebarStore));
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-plugins-catalog",
        order: 55,
        label: () => "插件",
        inject: () => ({}),
      }, SettingsManage));
    }

    exports.name = "dsh-plugins-catalog-client";
    exports.inject = ["slots"];
    exports.apply = apply;
    return module.exports;