import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parse } from 'smol-toml';

import type { GlobalPaths } from './paths.ts';

export type AgentConfig = Readonly<{
  command: readonly string[];
  timeoutSeconds: number;
}>;

export type GlobalConfig = Readonly<{
  path: string;
  exists: boolean;
  daemonPort: number;
  agents: Readonly<Record<string, AgentConfig>>;
  problems: readonly string[];
}>;

export const defaultDaemonPort = 7823;

export async function loadGlobalConfig(paths: GlobalPaths): Promise<GlobalConfig> {
  const path = join(paths.configDir, 'config.toml');
  let source: string;
  try {
    source = await readFile(path, 'utf8');
  } catch {
    return { path, exists: false, daemonPort: defaultDaemonPort, agents: {}, problems: [] };
  }

  const problems: string[] = [];
  let parsed: unknown;
  try {
    parsed = parse(source);
  } catch (error) {
    problems.push(
      `config.toml 无法按 TOML 1.0 解析：${error instanceof Error ? error.message : String(error)}`,
    );
    return { path, exists: true, daemonPort: defaultDaemonPort, agents: {}, problems };
  }

  const table = parsed as Record<string, unknown>;
  let daemonPort = defaultDaemonPort;
  const daemon = table['daemon'];
  if (daemon !== undefined && typeof daemon === 'object' && daemon !== null) {
    const port = (daemon as Record<string, unknown>)['port'];
    if (typeof port === 'number' && Number.isInteger(port) && port > 0 && port < 65536) {
      daemonPort = port;
    } else if (port !== undefined) {
      problems.push('daemon.port 必须是 1–65535 的整数，已回退默认值。');
    }
  }

  const agents: Record<string, AgentConfig> = {};
  const agentsTable = table['agents'];
  if (agentsTable !== undefined && typeof agentsTable === 'object' && agentsTable !== null) {
    for (const [name, raw] of Object.entries(agentsTable as Record<string, unknown>)) {
      if (typeof raw !== 'object' || raw === null) {
        problems.push(`agents.${name} 必须是表。`);
        continue;
      }
      const record = raw as Record<string, unknown>;
      const command = record['command'];
      if (
        !Array.isArray(command) ||
        command.length === 0 ||
        command.some((item) => typeof item !== 'string')
      ) {
        problems.push(`agents.${name}.command 必须是非空字符串数组。`);
        continue;
      }
      const timeoutRaw = record['timeoutSeconds'];
      const timeoutSeconds = typeof timeoutRaw === 'number' && timeoutRaw > 0 ? timeoutRaw : 300;
      agents[name] = { command: command as readonly string[], timeoutSeconds };
    }
  }

  return { path, exists: true, daemonPort, agents, problems };
}
