# PTA

Project Truth Architecture / 项目真相架构。

## 结构

- `www`: PTA 标准文档网站，域名目标为 `pta.pub`。

## 命令

```sh
pnpm --filter www dev
pnpm run ci
pnpm -r build
pnpm --filter www preview
```

提交前检查：

```sh
pnpm run staged
```

格式化和 lint：

```sh
pnpm run format
pnpm run lint
```

## 环境

本仓库使用 [mise](https://mise.jdx.dev/) 管理工具链；`mise.toml` 和 `mise.lock` 需要一起提交。

首次进入一个新的 worktree：

```sh
mise trust
mise install
pnpm install
```

要在切换目录时自动生效，需要先在 shell 中启用 mise activation，例如 zsh 配置 `eval "$(mise activate zsh)"`。未启用时可用 `mise exec -- <command>` 临时进入项目环境。
