    function matchItem(p, q, scope, cat) {
      if (scope === "official" && !p.official) return false;
      if (scope === "community" && p.official) return false;
      if (cat && cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      var blob = [p.name, p.full_name, p.author, p.description, p.description_zh, p.description_en, p.category_zh, p.category].join(" ").toLowerCase();
      return blob.indexOf(q) >= 0;
    }
    function overlay(node) {
      // Render in place instead of portaling to document.body: the store page
      // is a full-screen fixed layer, and a body-portaled modal with the same
      // z-index can be covered by it in the desktop shell. Rendering the modal
      // inside the tree keeps it above the page it belongs to.
      return node;
    }

    function sectionTitle(text) {
      return h("div", {
        style: { fontSize: 13, fontWeight: 600, color: FG, margin: "16px 0 8px" }
      }, text);
    }

    function DetailModal(props) {
      var p = props.p;
      var detail = props.detail;
      var onClose = props.onClose;
      var full = p.full_name || "";
      var pkgName = p.npm_name || p.name || "";
      var id = pkgName || full;
      var author = p.author || ownerOf(full);
      var zh = p.description_zh || p.description || "";
      var en = p.description_en || "";
      var imgs = (detail && detail.images) || [];
      if (imgs.length > 16) imgs = imgs.slice(0, 16);
      var ci = useState(0);
      var curIdx = ci[0], setCurIdx = ci[1];
      var safeIdx = imgs.length ? (curIdx % imgs.length) : 0;
      function prevImg() {
        if (!imgs.length) return;
        setCurIdx((safeIdx + imgs.length - 1) % imgs.length);
      }
      function nextImg() {
        if (!imgs.length) return;
        setCurIdx((safeIdx + 1) % imgs.length);
      }
      var readmeZh = excerpt((detail && detail.readme_zh) || "", 12000);
      var readmeEn = excerpt((detail && detail.readme_en) || "", 12000);
      var readme = readmeZh || readmeEn;
      var node = h("div", {
        onClick: onClose,
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
            // Adaptive full-size: follows the viewport (94vw / up to 92vh),
            // grows with a large window, stays compact on a small one.
            width: "min(1200px, 94vw)",
            maxHeight: "92vh",
            minHeight: "60vh",
            overflow: "auto",
            background: "#ffffff",
            color: "#111827",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            padding: "18px 20px 24px",
            boxSizing: "border-box",
            boxShadow: "0 16px 40px rgba(0,0,0,0.22)"
          }
        },
          h("div", {
            style: {
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
              paddingRight: 40
            }
          },
            h("div", { style: { minWidth: 0 } },
              h("div", { style: { fontSize: 18, fontWeight: 650, color: FG } }, p.name || pkgName || full),
              h("div", { style: { color: MUTED, fontSize: 12, marginTop: 4 } },
                (author ? author + " · " : "") + (p.category_zh || p.category || "") +
                (full ? " · " + full : "")
              )
            )
          ),
          (detail && detail.loading) ? h("div", { style: { color: MUTED, marginTop: 12 } }, "正在加载效果图和文档…") : null,
          (detail && detail.error) ? h("div", { style: { color: ERR, marginTop: 12 } }, detail.error) : null,
          sectionTitle("效果图"),
          imgs.length ? h("div", {
            style: {
              position: "relative",
              height: 340,
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
