import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assignDomainParents,
  extractEntries,
  inspectContents,
  splitFrontmatter,
  type Domain,
  type DomainContent,
} from '../src/index.ts';

function domain(identifier: string): Domain {
  const frontmatter = splitFrontmatter('- 判断\n').frontmatter;
  return {
    kind: 'directory',
    declarationPath: `${identifier === '' ? '' : `${identifier}/`}TRUTH.md`,
    containerPath: identifier,
    identifier,
    claimedPath: identifier,
    filesPresent: false,
    dependsOn: [],
    frontmatter,
    problems: [],
  };
}

function fixture(): readonly DomainContent[] {
  const root = assignDomainParents([domain('')])[0] as Domain;
  return [
    {
      domain: root,
      files: {
        'TRUTH.md': extractEntries(
          '- 普通判断，不入巡检集合。\n- [?] 风险分级与学会指南一致。2025-06 采用，2027-01 核对指南是否更新。\n- [?] 服务部署在单台服务器上。部署拓扑变化时复查。\n',
          'TRUTH.md',
          '',
        ),
        'RESIDUE.md': extractEntries('- 2024-03 之前的数据无法区分邻面龋。\n', 'RESIDUE.md', ''),
      },
    },
  ];
}

test('inspectContents 圈定标记条目与残留，日期型取最大日期', () => {
  const report = inspectContents(fixture(), '2026-07-15');

  assert.equal(report.members.length, 3);
  const marked = report.members.filter((member) => member.kind === 'marked-truth');
  assert.equal(marked.length, 2);
  assert.equal(marked[0]?.due, '2027-01');
  assert.equal(marked[1]?.due, undefined);
  assert.equal(report.members.filter((member) => member.kind === 'residue').length, 1);
  assert.equal(report.expiries.length, 0);
});

test('inspectContents 到期以日期起点判定，残留日期不作到期', () => {
  const before = inspectContents(fixture(), '2026-12-31');
  assert.equal(before.expiries.length, 0);

  const due = inspectContents(fixture(), '2027-01-01');
  assert.equal(due.expiries.length, 1);
  const expiry = due.expiries[0];
  assert.equal(expiry?.category, 'expiry');
  assert.equal(expiry?.status, 'machine-decidable');
  assert.match(expiry?.evidence.message ?? '', /复查线索 2027-01 已到期/u);
  assert.equal(expiry?.evidence.file, 'TRUTH.md');
  assert.equal(expiry?.evidence.line, 2);
});
