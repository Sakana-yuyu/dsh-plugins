---
name: dsh-catalog
description: >
  用户要找、比较或安装 DeepSeek Harness 插件时使用。数据来自本仓库
  Sakana-yuyu/dsh-plugins 的按星排名目录。先搜索确认，再安装。
---

# 用本目录找插件并安装

本仓库既是网页目录，也是可安装的 DSH 组合包。

安装本目录插件：

```sh
dsh plugin --profile web add "github:Sakana-yuyu/dsh-plugins"
```

装好后优先调用工具：

1. `dsh_catalog_search` — 按关键词 / 分类 / 是否官方搜索，返回 `full_name` 和现成安装命令。
2. 把候选（最多 3 个）展示给用户，等用户点名。
3. `dsh_catalog_install` — 传入用户确认的 `full_name`，默认会执行
   `dsh plugin --profile web add "github:owner/repo"`。

没有工具时，用网页目录 https://sakana-yuyu.github.io/dsh-plugins/ 或克隆：

```sh
git clone https://github.com/Sakana-yuyu/dsh-plugins.git
```

分类：official, ui, vision, tui, desktop, browser, workflow, tools, search, dev, awesome, other。

不要编造仓库名。搜索无结果就直说，并给出网页目录链接。
