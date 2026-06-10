# PTA

Project Truth Architecture / 项目真相架构。

## 结构

- `www`: PTA 标准文档网站，域名目标为 `pta.pub`。

## 命令

```sh
vp install
vp run www#dev
vp run check
vp run build
vp run www#preview
```

提交前检查：

```sh
vp staged
```

格式化和 lint：

```sh
vp fmt --write
vp lint
```
