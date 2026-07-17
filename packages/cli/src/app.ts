import {
  buildApplication,
  buildChoiceParser,
  buildCommand,
  buildRouteMap,
  type Application,
  type Command,
  type CommandContext,
  type StricliProcess,
} from '@stricli/core';

import type { CronAction } from '@pta/runtime';

import {
  runChanges,
  runCheck,
  runContext,
  runDomains,
  runInspectDerive,
  runInspectList,
  runInspectRegister,
  runPendingAdd,
  runPendingList,
  runPendingResolve,
} from './commands.ts';
import { textZh } from './text.ts';
import { cronCreate, cronDelete, cronEdit, cronList, cronRun } from './cron.ts';
import {
  agentList,
  agentRun,
  daemonInstall,
  daemonRestart,
  daemonRun,
  daemonStart,
  daemonStatus,
  daemonStop,
  daemonUninstall,
  runDashboard,
  runDoctor,
  runLogs,
  type CliIO,
} from './management.ts';

export type PtaContext = CommandContext &
  Readonly<{ process: StricliProcess; io: CliIO; cwd: string }>;

function parseCount(input: string): number {
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) throw new Error('数量必须是正整数');
  return value;
}

const domainsCommand = buildCommand({
  func: async function (this: PtaContext, _flags: {}) {
    this.process.exitCode = await runDomains(this.io, this.cwd);
  },
  parameters: {},
  docs: {
    brief: '列出全部领域及其记录计数与依赖',
    fullDescription:
      '列出仓库的全部领域，附真相、术语、残留与待裁决四类条目计数，以及领域间的依赖关系；外置领域另附其主张范围。先看有哪些领域，再用 context 取具体背景。',
  },
});

const contextCommand = buildCommand({
  func: async function (this: PtaContext, _flags: {}, ...paths: string[]) {
    this.process.exitCode = await runContext(paths, this.io, this.cwd);
  },
  parameters: {
    positional: {
      kind: 'array',
      parameter: {
        brief: '仓库内的路径，或领域标识',
        parse: String,
        placeholder: '路径',
      },
      minimum: 1,
    },
  },
  docs: {
    brief: '汇集路径所属领域的真相记录与待裁决背景',
    fullDescription:
      '汇集路径所属领域及其祖先的真相记录、术语表、残留与待裁决背景，开工前先跑它。参数也接受领域标识，指向外置领域时用 pta domains 列出的标识。输出附来源标识：已入库状态为版本号，含未入库变更时附内容哈希。',
    customUsage: ['packages/cli src/index.ts', '.pta/docs-argument'],
  },
});

const checkCommand = buildCommand({
  func: async function (this: PtaContext, _flags: {}) {
    this.process.exitCode = await runCheck(this.io, this.cwd);
  },
  parameters: {},
  docs: {
    brief: '核查真相记录结构，报告核查信号',
    fullDescription: [
      '对全仓真相记录做结构核查，按领域输出核查信号。',
      '',
      '退出码：',
      '- 0 无信号，或仅嫌疑级信号',
      '- 1 存在机器可判定的冲突或违例',
      '- 2 运行失败',
    ].join('\n'),
  },
});

const changesCommand = buildCommand({
  func: async function (this: PtaContext, flags: Readonly<{ staged: boolean }>, base?: string) {
    this.process.exitCode = await runChanges(base, flags.staged, this.io, this.cwd);
  },
  parameters: {
    flags: {
      staged: {
        kind: 'boolean',
        brief: '只看暂存区的变更',
        default: false,
      },
    },
    positional: {
      kind: 'tuple',
      parameters: [
        {
          brief: '对比基线，接受提交或分支名',
          parse: String,
          placeholder: '基线',
          optional: true,
        },
      ],
    },
  },
  docs: {
    brief: '按领域分类变更，报告触面与漂移嫌疑',
    fullDescription: [
      '按领域分类变更，报告触面、漂移嫌疑、传播候选与相关的待裁决背景。受托任务收尾时用它自察未解释漂移。',
      '',
      '- 缺省对比工作树与 HEAD',
      '- 给出基线则对比 基线...HEAD，如 pta changes dev',
      '- 加 --staged 只看暂存区',
    ].join('\n'),
  },
});

const pendingRoutes = buildRouteMap({
  routes: {
    list: buildCommand({
      func: async function (this: PtaContext, _flags: {}) {
        this.process.exitCode = await runPendingList(this.io, this.cwd);
      },
      parameters: {},
      docs: { brief: '按领域汇总待裁决条目' },
    }),
    add: buildCommand({
      func: async function (this: PtaContext, _flags: {}, domain: string, question: string) {
        this.process.exitCode = await runPendingAdd(domain, question, this.io, this.cwd);
      },
      parameters: {
        positional: {
          kind: 'tuple',
          parameters: [
            { brief: '领域标识，根领域用 .', parse: String, placeholder: '领域' },
            { brief: '待裁决的问题，以问句表述', parse: String, placeholder: '问题' },
          ],
        },
      },
      docs: {
        brief: '登记待裁决条目',
        fullDescription:
          '把迭代中撞到的未裁决判断登记进领域收件箱 PENDING.md，同内容条目幂等，不重复登记。',
        customUsage: ['packages "cron 解析器要不要换标准解析器？"'],
      },
    }),
    resolve: buildCommand({
      func: async function (this: PtaContext, _flags: {}, ...ids: string[]) {
        this.process.exitCode = await runPendingResolve(ids, this.io, this.cwd);
      },
      parameters: {
        positional: {
          kind: 'array',
          parameter: {
            brief: '条目 id，即内容哈希前缀；跨领域歧义时用 领域:id 限定',
            parse: String,
            placeholder: '条目id',
          },
          minimum: 1,
        },
      },
      docs: {
        brief: '处置完成后移除条目',
        fullDescription:
          '裁决落定后从收件箱移除条目，文件清空即删。处置本身走正常变更流程，修订真相或确认仍然成立。',
        customUsage: ['1a2b3c4d', 'src:5e6f7a8b 9c0d1e2f'],
      },
    }),
  },
  docs: {
    brief: '登记与处置待裁决问题',
  },
});

const inspectRoutes = buildRouteMap({
  routes: {
    list: buildCommand({
      func: async function (this: PtaContext, _flags: {}) {
        this.process.exitCode = await runInspectList(this.io, this.cwd);
      },
      parameters: {},
      docs: { brief: '列出巡检集合的到期与触发情况' },
    }),
    register: buildCommand({
      func: async function (this: PtaContext, _flags: {}, id: string, value: string) {
        this.process.exitCode = await runInspectRegister(id, value, this.io, this.cwd);
      },
      parameters: {
        positional: {
          kind: 'tuple',
          parameters: [
            { brief: '巡检标记条目的 id', parse: String, placeholder: '条目id' },
            {
              brief: '到期日期如 2027-01，或字面量「条件」',
              parse: String,
              placeholder: '线索值',
            },
          ],
        },
      },
      docs: {
        brief: '为条目注册复查线索，记入全局工具层',
        customUsage: ['1a2b3c4d 2027-01', '1a2b3c4d 条件'],
      },
    }),
    derive: buildCommand({
      func: async function (this: PtaContext, _flags: {}, agent: string) {
        this.process.exitCode = await runInspectDerive(agent, this.io, this.cwd);
      },
      parameters: {
        positional: {
          kind: 'tuple',
          parameters: [
            {
              brief: 'agent 名称，见 pta agent list',
              parse: String,
              placeholder: '名称',
            },
          ],
        },
      },
      docs: { brief: '请 agent 推导与评估复查线索' },
    }),
  },
  docs: {
    brief: '查看与推导巡检复查线索',
  },
});

const agentRoutes = buildRouteMap({
  routes: {
    list: buildCommand({
      func: async function (this: PtaContext, _flags: {}) {
        this.process.exitCode = await agentList(this.io);
      },
      parameters: {},
      docs: { brief: '列出已配置的 agent' },
    }),
    run: buildCommand({
      func: async function (this: PtaContext, _flags: {}, name: string, prompt?: string) {
        this.process.exitCode = await agentRun(name, prompt, this.io, this.cwd);
      },
      parameters: {
        positional: {
          kind: 'tuple',
          parameters: [
            { brief: 'agent 名称', parse: String, placeholder: '名称' },
            {
              brief: '提示词，缺省时从标准输入读取',
              parse: String,
              placeholder: '提示词',
              optional: true,
            },
          ],
        },
      },
      docs: { brief: '运行一次 agent 任务' },
    }),
  },
  docs: {
    brief: '管理与调用第三方 agent',
  },
});

const cronActionParser = buildChoiceParser(['inspect', 'derive', 'agent']);

const cronRoutes = buildRouteMap({
  routes: {
    list: buildCommand({
      func: async function (this: PtaContext, _flags: {}) {
        this.process.exitCode = await cronList(this.io);
      },
      parameters: {},
      docs: { brief: '列出 cron 条目与下次唤醒时间' },
    }),
    create: buildCommand({
      func: async function (
        this: PtaContext,
        flags: Readonly<{ repo?: string; agent?: string; prompt?: string }>,
        id: string,
        schedule: string,
        action: 'inspect' | 'derive' | 'agent',
      ) {
        this.process.exitCode = await cronCreate(
          id,
          schedule,
          action as CronAction,
          flags,
          this.io,
          this.cwd,
        );
      },
      parameters: {
        flags: {
          repo: { kind: 'parsed', parse: String, brief: '目标仓库路径，或 all', optional: true },
          agent: { kind: 'parsed', parse: String, brief: 'agent 名称', optional: true },
          prompt: { kind: 'parsed', parse: String, brief: 'agent 任务提示词', optional: true },
        },
        positional: {
          kind: 'tuple',
          parameters: [
            { brief: '条目 id', parse: String, placeholder: 'id' },
            { brief: '五段式 cron 表达式', parse: String, placeholder: 'cron表达式' },
            { brief: '动作类型', parse: cronActionParser, placeholder: '动作' },
          ],
        },
      },
      docs: {
        brief: '创建 cron 条目',
        customUsage: ['daily-report "30 8 * * 1-5" agent --agent reporter --prompt "编译日报"'],
      },
    }),
    edit: buildCommand({
      func: async function (
        this: PtaContext,
        flags: Readonly<{ schedule?: string; repo?: string; agent?: string; prompt?: string }>,
        id: string,
      ) {
        this.process.exitCode = await cronEdit(id, flags, this.io);
      },
      parameters: {
        flags: {
          schedule: { kind: 'parsed', parse: String, brief: '新的 cron 表达式', optional: true },
          repo: { kind: 'parsed', parse: String, brief: '目标仓库路径，或 all', optional: true },
          agent: { kind: 'parsed', parse: String, brief: 'agent 名称', optional: true },
          prompt: { kind: 'parsed', parse: String, brief: 'agent 任务提示词', optional: true },
        },
        positional: {
          kind: 'tuple',
          parameters: [{ brief: '条目 id', parse: String, placeholder: 'id' }],
        },
      },
      docs: {
        brief: '修改 cron 条目',
        customUsage: ['daily-report --schedule "0 9 * * *"'],
      },
    }),
    delete: buildCommand({
      func: async function (this: PtaContext, _flags: {}, id: string) {
        this.process.exitCode = await cronDelete(id, this.io);
      },
      parameters: {
        positional: {
          kind: 'tuple',
          parameters: [{ brief: '条目 id', parse: String, placeholder: 'id' }],
        },
      },
      docs: { brief: '删除 cron 条目' },
    }),
    run: buildCommand({
      func: async function (this: PtaContext, _flags: {}, id: string) {
        this.process.exitCode = await cronRun(id, this.io);
      },
      parameters: {
        positional: {
          kind: 'tuple',
          parameters: [{ brief: '条目 id', parse: String, placeholder: 'id' }],
        },
      },
      docs: { brief: '手动执行一次 cron 条目' },
    }),
  },
  docs: {
    brief: '管理全局定时任务',
  },
});

function daemonAction(brief: string, action: (io: CliIO) => Promise<number>): Command<PtaContext> {
  return buildCommand({
    func: async function (this: PtaContext, _flags: {}) {
      this.process.exitCode = await action(this.io);
    },
    parameters: {},
    docs: { brief },
  });
}

const daemonRoutes = buildRouteMap({
  routes: {
    install: daemonAction('安装为登录时自启的守护进程', daemonInstall),
    uninstall: daemonAction('卸载守护进程', daemonUninstall),
    status: daemonAction('查看守护进程状态', daemonStatus),
    start: daemonAction('启动守护进程', daemonStart),
    stop: daemonAction('停止守护进程', daemonStop),
    restart: daemonAction('重启守护进程', daemonRestart),
    run: daemonAction('在前台运行守护进程，供服务管理器调用', daemonRun),
  },
  docs: {
    brief: '管理承担定时巡检与 cron 调度的守护进程',
    hideRoute: { run: true },
  },
});

const dashboardCommand = buildCommand({
  func: async function (this: PtaContext, _flags: {}) {
    this.process.exitCode = await runDashboard(this.io);
  },
  parameters: {},
  docs: { brief: '打开浏览器管理面板，复用守护进程或临时起服务' },
});

const doctorCommand = buildCommand({
  func: async function (this: PtaContext, _flags: {}) {
    this.process.exitCode = await runDoctor(this.io, this.cwd);
  },
  parameters: {},
  docs: { brief: '检查环境健康状况' },
});

const logsCommand = buildCommand({
  func: async function (this: PtaContext, _flags: {}, limit?: number) {
    this.process.exitCode = await runLogs(limit ?? 20, this.io);
  },
  parameters: {
    positional: {
      kind: 'tuple',
      parameters: [
        {
          brief: '显示条数，默认 20',
          parse: parseCount,
          placeholder: '数量',
          optional: true,
        },
      ],
    },
  },
  docs: { brief: '查看全局行为日志' },
});

const rootRoutes = buildRouteMap({
  routes: {
    domains: domainsCommand,
    context: contextCommand,
    check: checkCommand,
    changes: changesCommand,
    pending: pendingRoutes,
    inspect: inspectRoutes,
    agent: agentRoutes,
    cron: cronRoutes,
    daemon: daemonRoutes,
    dashboard: dashboardCommand,
    doctor: doctorCommand,
    logs: logsCommand,
  },
  docs: {
    brief: '项目真相架构命令行工具',
    fullDescription: [
      '项目真相架构命令行工具',
      '',
      '- 开工之前：domains 看领域全貌，context 取路径背景',
      '- 迭代之中：pending add 登记撞到的待裁决问题',
      '- 收尾自察：changes 核对变更漂移，check 核查记录结构',
      '- 定期巡检：inspect 跟进复查线索',
      '- 全局设施：agent, cron, daemon, dashboard, doctor, logs',
      '',
      '全局旗标 `--cwd <目录>` 与别名 `-C` 让命令在指定目录运行，替代当前目录。',
    ].join('\n'),
  },
});

/** 未知子命令时用于枚举可用动词的静态路由表。 */
export const routeListing: Readonly<Record<string, readonly string[]>> = {
  '': [
    'domains',
    'context',
    'check',
    'changes',
    'pending',
    'inspect',
    'agent',
    'cron',
    'daemon',
    'dashboard',
    'doctor',
    'logs',
  ],
  pending: ['list', 'add', 'resolve'],
  inspect: ['list', 'register', 'derive'],
  agent: ['list', 'run'],
  cron: ['list', 'create', 'edit', 'delete', 'run'],
  daemon: ['install', 'uninstall', 'status', 'start', 'stop', 'restart'],
};

export function buildPtaApplication(version: string): Application<PtaContext> {
  return buildApplication(rootRoutes, {
    name: 'pta',
    versionInfo: { currentVersion: version },
    // kebab 形态是内建 --help-all 的书写习惯；自有旗标全为小写单词，不受此转换影响。
    scanner: { caseStyle: 'allow-kebab-for-camel' },
    localization: {
      loadText: () => textZh,
      defaultLocale: 'zh-CN',
    },
  }) as Application<PtaContext>;
}
