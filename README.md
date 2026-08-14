# DSH 插件目录

这是一个公开的 DeepSeek Harness（DSH）插件目录。我们从官方 GitHub topic dsh-plugin 收集仓库，按 stars 排名，并标出 deepseek-ai 官方插件与 in-tree 包。

- 在线目录：https://sakana-yuyu.github.io/dsh-plugins/
- 本仓库：https://github.com/Sakana-yuyu/dsh-plugins

克隆本目录：

    git clone https://github.com/Sakana-yuyu/dsh-plugins.git

## 安装插件

先取得官方核心 deepseek-ai/deepseek-harness，再向 profile 添加插件。

    dsh plugin --profile web add "github:owner/repo"

官方包名使用 deepseek-ai 的 dsh 前缀。官方 bundles：base、web-app、headless。

## 数据

- docs/catalog.json：topic 扫描结果，按 stars 降序
- docs/official.json：官方核心 + 单仓 in-tree 包组
- 站点按功能分类，并提供中英切换与推荐区

工作日北京时间 09:00（UTC 01:00，周一到周五）GitHub Action 会自动刷新目录；也可手动触发 refresh workflow。

## English

A public catalog of DeepSeek Harness plugins discovered from the dsh-plugin GitHub topic, ranked by stars. Official deepseek-ai plugins are marked.

Live site: https://sakana-yuyu.github.io/dsh-plugins/
