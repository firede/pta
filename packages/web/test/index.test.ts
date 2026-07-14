import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderIndexHtml } from '../src/index.ts';

test('renderIndexHtml 输出带版本号的管理界面骨架', () => {
  const html = renderIndexHtml({ version: '1.2.3' });
  assert.match(html, /<!doctype html>/u);
  assert.match(html, /PTA Dashboard/u);
  assert.match(html, /v1\.2\.3/u);
  assert.match(html, /\/api\/health/u);
});
