export type DashboardPageOptions = Readonly<{
  version: string;
}>;

export function renderIndexHtml(options: DashboardPageOptions): string {
  return `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PTA Dashboard</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0; min-height: 100vh; display: grid; place-items: center;
    font-family: ui-sans-serif, system-ui, "PingFang SC", "Noto Sans CJK SC", sans-serif;
    background: light-dark(#fafaf9, #111113); color: light-dark(#1c1917, #e7e5e4);
  }
  main { text-align: center; padding: 2rem; }
  h1 { font-size: 1.4rem; font-weight: 600; margin: 0 0 .5rem; }
  p { margin: .25rem 0; color: light-dark(#57534e, #a8a29e); }
  code { font-family: ui-monospace, monospace; }
</style>
</head>
<body>
<main>
  <h1>PTA Dashboard</h1>
  <p>管理界面骨架已就绪，功能视图随后接入。</p>
  <p><code>v${options.version}</code> · <a href="/api/health">/api/health</a></p>
</main>
</body>
</html>
`;
}
