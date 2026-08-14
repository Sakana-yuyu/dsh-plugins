# DSH 插件目录

公开的 DeepSeek Harness（DSH）插件目录。从 GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin) 收集仓库，按 stars 排名，并标出 `deepseek-ai` 官方插件。

- 在线目录：https://sakana-yuyu.github.io/dsh-plugins/
- 本仓库：https://github.com/Sakana-yuyu/dsh-plugins

## 一键把本目录装进 DSH

```sh
dsh plugin --profile web add "github:Sakana-yuyu/dsh-plugins"
```

装好后可以对 DSH 说「帮我找视觉插件」或「安装 liustack/modlens」。插件会搜索本目录，并执行：

```sh
dsh plugin --profile web add "github:owner/repo"
```

## 在网页里安装其他插件

每张卡片都有现成命令。点「安装」即复制：

```sh
dsh plugin --profile web add "github:owner/repo"
```

点「克隆」复制 `git clone` 地址。

## 只克隆本目录

```sh
git clone https://github.com/Sakana-yuyu/dsh-plugins.git
```

## 数据

- 来源：GitHub topic `dsh-plugin` + `deepseek-ai/deepseek-harness`
- 工作日自动刷新（GitHub Actions）
- 分类：官方核心、UI 与皮肤、视觉、终端 TUI、桌面、浏览器、工作流、工具与技能、搜索与研究、开发与代码、目录与精选、其他

## English

Star-ranked catalog of DeepSeek Harness plugins. Live site: https://sakana-yuyu.github.io/dsh-plugins/

Install this catalog into DSH:

```sh
dsh plugin --profile web add "github:Sakana-yuyu/dsh-plugins"
```

Then ask DSH to search the catalog and install other plugins with `dsh plugin --profile web add "github:owner/repo"`.
