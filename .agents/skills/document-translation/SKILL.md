---
name: document-translation
description: 根据 zh-Hans 原文档创建或同步目标语言译文。仅用户主动调用时触发。
---

根据 zh-Hans 原文档创建目标语言译文。

翻译原则：

- 忠实：尊重原文语义、判断强度、边界和结构。
- 流畅：按目标语言习惯写作，优先自然表达。
- 术语：源文档同目录存在 `glossary.md` 或 `glossary.mdx` 时，先同步目标语言术语表，并采用目标语言术语。
- 结构：保留 frontmatter 字段结构、Markdown/MDX 结构、import、JSX、代码块和数据标识。
- 链接：站内根路径链接加目标语言前缀；外链、锚点、相对链接按语义保留。
- 标识：保持 slug id 不变，例如 `argument/a`、`dependsOn` 值和组件参数中的文档 id 不加语言前缀。

frontmatter 规则：

- 翻译 `title`、`description`、`hero.actions.text` 等面向读者的文案。
- 保留 `dependsOn`、`template`、`editUrl`、`tableOfContents`、组件 id、图标名和外部链接等结构性值。
- 写入 `sourceHash`，其值来自当前 zh-Hans 源文档。

工作方式：

1. 确认源文档路径、目标语言和目标 locale；`en` 对应 `/en/`，`zh-hant` 对应 `/zh-hant/`。
2. 运行 `pnpm --filter www i18n:check` 了解翻译缺口和术语表状态。
3. 如果源文档同目录存在 `glossary.md` 或 `glossary.mdx`，先检查该术语表的目标语言译文。
4. 术语表缺失、无效或过期时，提醒用户，并将当前任务切换为翻译术语表；完成术语表后再回到原文档。
5. 读取原文档、目标语言术语表，以及必要的已存在同语言译文，确定术语和文风。
6. 创建或更新 `www/src/content/docs/<locale>/<source-relative-path>`，后缀保持和原文一致。
7. 使用 `pnpm --filter www i18n:hash <source-file>` 计算原文 hash，并写入译文 frontmatter 的 `sourceHash`。
8. 再运行 `pnpm --filter www i18n:check`，确认本次目标文件没有 `missing`、`extension-mismatch`、`invalid` 或 `stale` 问题。

链接规则：

- `/argument/a/` 翻译为 `/en/argument/a/` 或 `/zh-hant/argument/a/`。
- 已带目标语言前缀的链接保持一次前缀，避免重复。
- `https://...`、`mailto:`、`#heading`、`./relative`、`../relative` 仅在明确需要时调整。
- frontmatter 或组件参数中的 `argument/a` 是 id，按标识处理。

完成条件：

- 目标译文存在且 `sourceHash` 匹配当前源文档。
- 源文档同目录存在术语表时，目标语言术语表已同步。
- 译文采用目标语言术语，表达自然，原文判断和边界没有漂移。
- 站内链接已本地化，slug id 保持不变。
- `i18n:check` 中本次处理的文件没有 `missing`、`extension-mismatch`、`invalid` 或 `stale` 问题。

输出规范：

- 需要改文件时直接修改译文文件，不在聊天中贴完整译文。
- 因术语表未同步而切换任务时，明确说出术语表路径、目标语言和原任务路径。
- 结束时说明写入文件、术语表状态和检查结果。
- 不主动提交；只有用户明确要求时才提交。
