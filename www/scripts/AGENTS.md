# scripts 约定

## i18n

- 检查翻译状态：`pnpm --filter www i18n:check`
- 计算文件 hash：`pnpm --filter www i18n:hash <file>`
- `<file>` 支持绝对路径；相对路径按调用命令时的当前目录解析。

`i18n:check` 错误类型：

- `missing`：非草稿原文缺少目标语言译文。
- `extension-mismatch`：译文后缀与原文不一致。
- `invalid`：译文 frontmatter 无法用于检查，例如缺少 `sourceHash`。
- `stale`：译文 `sourceHash` 与当前原文 hash 不一致。
- `orphan`：目标语言译文缺少对应原文。
