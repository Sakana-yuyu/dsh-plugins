              borderRadius: 8,
              overflow: "hidden",
              background: "rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }
          },
            h("a", {
              href: imgs[safeIdx],
              target: "_blank",
              rel: "noreferrer",
              style: { display: "block", width: "100%", height: "100%", textAlign: "center" }
            },
              h("img", {
                src: imgs[safeIdx],
                alt: "",
                style: {
                  maxWidth: "100%",
                  maxHeight: "100%",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                  display: "inline-block",
                  verticalAlign: "middle"
                }
              })
            ),
            imgs.length > 1 ? h("button", {
              type: "button",
              title: "上一张",
              onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); prevImg(); },
              style: {
                position: "absolute",
                left: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "rgba(0,0,0,0.35)",
                color: "#ffffff",
                width: 34,
                height: 34,
                borderRadius: 999,
                fontSize: 20,
                lineHeight: "30px",
                cursor: "pointer",
                padding: 0,
                textAlign: "center"
              }
            }, "‹") : null,
            imgs.length > 1 ? h("button", {
              type: "button",
              title: "下一张",
              onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); nextImg(); },
              style: {
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                border: "none",
                background: "rgba(0,0,0,0.35)",
                color: "#ffffff",
                width: 34,
                height: 34,
                borderRadius: 999,
                fontSize: 20,
                lineHeight: "30px",
                cursor: "pointer",
                padding: 0,
                textAlign: "center"
              }
            }, "›") : null,
            imgs.length > 1 ? h("div", {
              style: {
                position: "absolute",
                bottom: 8,
                left: 0,
                right: 0,
                display: "flex",
                justifyContent: "center",
                gap: 6
              }
            },
              imgs.map(function (_, i) {
                return h("button", {
                  key: i,
                  type: "button",
                  title: "第 " + (i + 1) + " 张",
                  onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); setCurIdx(i); },
                  style: {
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    background: i === safeIdx ? BRAND : "rgba(0,0,0,0.25)"
                  }
                })
              })
            ) : null
          ) : h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无 README 效果图"),
          sectionTitle("介绍"),
          zh ? h("div", { style: { color: FG, fontSize: 13, lineHeight: "22px", marginBottom: 8 } }, zh) : null,
          en ? h("div", { style: { color: MUTED, fontSize: 12, lineHeight: "20px" } }, en) : null,
          (!zh && !en) ? h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无简介") : null,
          sectionTitle("文档"),
          readme ? h("div", {
            style: {
              color: FG,
              fontSize: 12,
              lineHeight: "20px",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere"
            }
          }, readme) : h("div", { style: { color: MUTED, fontSize: 12 } }, "暂无 README"),
          full ? h("div", { style: { marginTop: 16 } },
            h("button", {
              type: "button",
              onClick: function (e) {
                if (e && e.preventDefault) e.preventDefault();
                if (e && e.stopPropagation) e.stopPropagation();
                openExternal(repoUrl(p) || ("https://github.com/" + full));
              },
              style: btnStyle(false, true)
            }, "在 GitHub 打开")
          ) : null
        ),
        // Close button pinned to the viewport top-right, always visible even
        // while the content box scrolls.
        h("button", {
          type: "button",
          title: "关闭",
          onClick: function (e) { if (e && e.stopPropagation) e.stopPropagation(); onClose(); },
          style: {
            position: "fixed",
            top: 20,
            right: 24,
            zIndex: 10002,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            fontWeight: 600,
            fontSize: 13,
            lineHeight: "20px",
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)"
          }
        }, "✕ 关闭")
      );
      return overlay(node);
    }

    function PluginCard(props) {
      var p = props.p;
      var install = props.install;
      var uninstall = props.uninstall;
      var toggle = props.toggle;
      var waiting = props.waiting;
      var busyUn = props.busyUn;
      var installed = !!props.installed;
      var isSelf = !!props.isSelf;
      var note = props.note;
      var onUpdate = props.onUpdate;
      var busyUp = !!props.busyUp;
      var hasUpdate = !!(props.hasUpdate || (p && p.newer));
      var enabled = p && p.enabled !== false;
      var toggleable = !!(toggle && p && p.toggleable);
      var hCover = coverH(props.coverSize);
      var ex = useState(false);
      var open = ex[0], setOpen = ex[1];
      var cp = useState(false);
      var copied = cp[0], setCopied = cp[1];
      var dt = useState(null);
      var detail = dt[0], setDetail = dt[1];
      var full = p.full_name || "";
      var id = p.npm_name || p.name || full;
      var author = p.author || ownerOf(full);
      var cmd = (p.install_method === "link" || p.install === "link") ? "" : (p.install || "");
      var linkOnly = p.install_method === "link" || p.install === "link" || /(^|\/)awesome-dsh-plugins$/i.test(full);
      var cover = full ? ("https://opengraph.githubassets.com/1/" + full) : "";
      function onCopy() {
        if (!cmd) return;
        copyText(cmd).then(function () {
          setCopied(true);
          setTimeout(function () { setCopied(false); }, 1200);
        }).catch(function () {});
      }
      function onOpenDetail() {
        setOpen(true);
        if (!detail && full) {
          setDetail({ loading: true, images: [], readme_zh: "", readme_en: "", error: "" });
          fetch("/api/dsh-plugins/detail?full_name=" + encodeURIComponent(full))
            .then(function (r) { return r.json(); })
            .then(function (data) {
              var imgs = (data && data.images) || [];
              if ((!imgs || !imgs.length) && data && data.og) imgs = [data.og];
              setDetail({
                loading: false,
                images: imgs,
                readme_zh: (data && data.readme_zh) || "",
                readme_en: (data && data.readme_en) || "",
                error: data && data.ok === false ? ((data.error || data.message) || "加载失败") : ""
              });
            })
            .catch(function (e) {
              setDetail({
                loading: false,
                images: [],
                readme_zh: "",
                readme_en: "",
                error: String((e && e.message) || e || "加载失败")
              });
            });
        }
      }
      var zh = p.description_zh || "";
