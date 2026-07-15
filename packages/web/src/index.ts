export type DashboardPageOptions = Readonly<{
  version: string;
  apiAvailable?: boolean;
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
    margin: 0; min-height: 100vh;
    font-family: ui-sans-serif, system-ui, "PingFang SC", "Noto Sans CJK SC", sans-serif;
    background: light-dark(#fafaf9, #111113); color: light-dark(#1c1917, #e7e5e4);
  }
  main { max-width: 64rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
  h1 { font-size: 1.4rem; font-weight: 600; margin: 0; }
  h2 { font-size: 1.05rem; font-weight: 600; margin: 2rem 0 .75rem; }
  header { display: flex; align-items: baseline; gap: .75rem; }
  p, td, th { color: light-dark(#57534e, #a8a29e); }
  code { font-family: ui-monospace, monospace; font-size: .85em; }
  table { width: 100%; border-collapse: collapse; font-size: .9rem; }
  th, td { text-align: left; padding: .4rem .5rem; border-bottom: 1px solid light-dark(#e7e5e4, #292524); vertical-align: top; }
  th { font-weight: 500; white-space: nowrap; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .warn { color: light-dark(#b45309, #fbbf24); }
  .ok { color: light-dark(#15803d, #4ade80); }
  .muted { color: light-dark(#a8a29e, #57534e); }
  button {
    font: inherit; padding: .35rem .8rem; border-radius: .4rem; cursor: pointer;
    border: 1px solid light-dark(#d6d3d1, #44403c);
    background: light-dark(#f5f5f4, #1c1917); color: inherit;
  }
  pre {
    font-family: ui-monospace, monospace; font-size: .8rem; line-height: 1.5;
    overflow-x: auto; padding: .75rem; border-radius: .5rem;
    background: light-dark(#f5f5f4, #1c1917);
  }
</style>
</head>
<body>
<main>
  <header>
    <h1>PTA Dashboard</h1>
    <p><code>v${options.version}</code></p>
  </header>
  ${
    options.apiAvailable === true
      ? `<section>
    <h2>仓库</h2>
    <div id="repositories"><p class="muted">加载中……</p></div>
  </section>
  <section>
    <h2>cron 任务</h2>
    <div id="cron"><p class="muted">加载中……</p></div>
  </section>
  <section>
    <h2>推导缓存</h2>
    <div id="cache"><p class="muted">加载中……</p></div>
  </section>
  <section>
    <h2>行为日志</h2>
    <div id="logs"><p class="muted">加载中……</p></div>
  </section>
<script>
(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  async function loadRepositories() {
    const box = document.getElementById('repositories');
    try {
      const items = await (await fetch('/api/repositories')).json();
      if (!Array.isArray(items) || items.length === 0) {
        box.innerHTML = '<p class="muted">注册表为空：在仓库里运行任一 pta 命令即可登记。</p>';
        return;
      }
      const rows = items.map((item) => {
        const report = item.report;
        const counts = report ? report.counts : undefined;
        const cell = (value, warn) => value === undefined
          ? '<td class="num muted">—</td>'
          : '<td class="num' + (warn && value > 0 ? ' warn' : '') + '">' + esc(value) + '</td>';
        return '<tr>'
          + '<td><code>' + esc(item.root) + '</code><br><span class="muted">' + esc(String(item.identity).slice(0, 12)) + '</span></td>'
          + cell(counts && counts.expired, true)
          + cell(counts && counts.conditionTriggered, true)
          + cell(counts && counts.awaitingDerivation, true)
          + cell(counts && counts.conflicts + counts.violations, true)
          + cell(counts && counts.suspicions, false)
          + '<td class="muted">' + esc(report ? String(report.generatedAt).slice(0, 16).replace('T', ' ') : '未巡检') + '</td>'
          + '</tr>';
      }).join('');
      box.innerHTML = '<table><thead><tr><th>仓库</th><th>到期</th><th>条件触发</th><th>待推导</th><th>冲突+违例</th><th>嫌疑</th><th>最近巡检</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } catch (error) {
      box.innerHTML = '<p class="warn">仓库数据加载失败：' + esc(error) + '</p>';
    }
  }

  async function loadCron() {
    const box = document.getElementById('cron');
    try {
      const items = await (await fetch('/api/cron')).json();
      if (!Array.isArray(items) || items.length === 0) {
        box.innerHTML = '<p class="muted">没有 cron 条目。零 LLM 地板扫描内建每小时一次；agent 介入的任务用 <code>pta cron create</code> 显式排期。</p>';
        return;
      }
      const rows = items.map((item) => '<tr>'
        + '<td><code>' + esc(item.id) + '</code></td>'
        + '<td><code>' + esc(item.schedule) + '</code></td>'
        + '<td>' + esc(item.action) + (item.agent ? ' <span class="muted">@' + esc(item.agent) + '</span>' : '') + '</td>'
        + '<td><code>' + esc(item.repository) + '</code></td>'
        + '<td class="muted">' + esc(item.nextWakeAt ? String(item.nextWakeAt).slice(0, 16).replace('T', ' ') : '不可达') + '</td>'
        + '</tr>').join('');
      box.innerHTML = '<table><thead><tr><th>id</th><th>schedule</th><th>动作</th><th>仓库</th><th>下次唤醒</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } catch (error) {
      box.innerHTML = '<p class="warn">cron 数据加载失败：' + esc(error) + '</p>';
    }
  }

  async function loadCache() {
    const box = document.getElementById('cache');
    try {
      const stats = await (await fetch('/api/cache')).json();
      const kb = (stats.bytes / 1024).toFixed(1);
      box.innerHTML = '<p>' + esc(stats.entries) + ' 条推导记录，共 ' + esc(kb) + ' KiB。'
        + '缓存可丢弃：清理后重新推导即可恢复。 '
        + '<button id="gc">清理 30 天未触碰的记录</button> <span id="gc-result" class="muted"></span></p>';
      document.getElementById('gc').addEventListener('click', async () => {
        const result = document.getElementById('gc-result');
        result.textContent = '清理中……';
        try {
          const health = await (await fetch('/api/health')).json();
          const outcome = await (await fetch('/api/cache/gc', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              ...(health.instanceToken ? { 'x-pta-token': health.instanceToken } : {}),
            },
            body: JSON.stringify({ olderThanDays: 30 }),
          })).json();
          result.textContent = '已回收 ' + outcome.removed + ' 条，保留 ' + outcome.kept + ' 条。';
          void loadCache();
        } catch (error) {
          result.textContent = '清理失败：' + error;
        }
      });
    } catch (error) {
      box.innerHTML = '<p class="warn">缓存数据加载失败：' + esc(error) + '</p>';
    }
  }

  async function loadLogs() {
    const box = document.getElementById('logs');
    try {
      const records = await (await fetch('/api/logs?limit=20')).json();
      if (!Array.isArray(records) || records.length === 0) {
        box.innerHTML = '<p class="muted">暂无日志。</p>';
        return;
      }
      const lines = records.map((record) =>
        esc(record.time) + ' [' + esc(record.source) + '] ' + esc(record.event)
        + (record.details ? ' ' + esc(JSON.stringify(record.details)) : ''));
      box.innerHTML = '<pre>' + lines.join('\\n') + '</pre>';
    } catch (error) {
      box.innerHTML = '<p class="warn">日志加载失败：' + esc(error) + '</p>';
    }
  }

  void loadRepositories();
  void loadCron();
  void loadCache();
  void loadLogs();
})();
</script>`
      : `<section>
    <p>此服务未接入管理数据（缺 API 提供者）。经 <code>pta dashboard</code> 或 <code>pta daemon</code> 启动可获得完整视图。</p>
    <p><a href="/api/health">/api/health</a></p>
  </section>`
  }
</main>
</body>
</html>
`;
}
