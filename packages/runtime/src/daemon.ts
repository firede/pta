import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GlobalPaths } from './paths.ts';

export type DaemonState = Readonly<{
  pid: number;
  port: number;
  token: string;
  startedAt: string;
}>;

export function newInstanceToken(): string {
  return randomBytes(16).toString('hex');
}

export function daemonStateFilePath(paths: GlobalPaths): string {
  return join(paths.stateDir, 'daemon', 'daemon.json');
}

export async function readDaemonState(paths: GlobalPaths): Promise<DaemonState | undefined> {
  try {
    const source = await readFile(daemonStateFilePath(paths), 'utf8');
    const parsed = JSON.parse(source) as DaemonState;
    return typeof parsed.pid === 'number' &&
      typeof parsed.port === 'number' &&
      typeof parsed.token === 'string'
      ? parsed
      : undefined;
  } catch {
    return undefined;
  }
}

export async function writeDaemonState(paths: GlobalPaths, state: DaemonState): Promise<void> {
  const file = daemonStateFilePath(paths);
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`);
}

export async function clearDaemonState(paths: GlobalPaths): Promise<void> {
  await rm(daemonStateFilePath(paths), { force: true });
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function verifyDaemonToken(state: DaemonState): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${state.port}/api/health`, {
      signal: AbortSignal.timeout(1000),
    });
    if (!response.ok) return false;
    const health = (await response.json()) as { instanceToken?: unknown };
    return health.instanceToken === state.token;
  } catch {
    return false;
  }
}

export async function verifiedDaemonState(paths: GlobalPaths): Promise<DaemonState | undefined> {
  const state = await readDaemonState(paths);
  if (state === undefined || !isProcessAlive(state.pid)) return undefined;
  return (await verifyDaemonToken(state)) ? state : undefined;
}

export type ServiceManager = 'launchd' | 'systemd';

export async function installedServiceManager(
  home: string,
  platform: NodeJS.Platform = process.platform,
): Promise<ServiceManager | undefined> {
  const managed: { path: string; manager: ServiceManager } | undefined =
    platform === 'darwin'
      ? { path: launchdPlistPath(home), manager: 'launchd' }
      : platform === 'linux'
        ? { path: systemdUnitPath(home), manager: 'systemd' }
        : undefined;
  if (managed === undefined) return undefined;
  try {
    await access(managed.path);
    return managed.manager;
  } catch {
    return undefined;
  }
}

export function launchdPlistPath(home: string): string {
  return join(home, 'Library', 'LaunchAgents', 'pub.pta.daemon.plist');
}

export function renderLaunchdPlist(nodePath: string, cliMainPath: string, logDir: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>pub.pta.daemon</string>
  <key>ProgramArguments</key>
  <array>
    <string>${nodePath}</string>
    <string>${cliMainPath}</string>
    <string>daemon</string>
    <string>run</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${logDir}/daemon.out</string>
  <key>StandardErrorPath</key><string>${logDir}/daemon.err</string>
</dict>
</plist>
`;
}

export function systemdUnitPath(home: string): string {
  return join(home, '.config', 'systemd', 'user', 'pta-daemon.service');
}

export function renderSystemdUnit(nodePath: string, cliMainPath: string): string {
  return `[Unit]
Description=PTA daemon

[Service]
ExecStart=${nodePath} ${cliMainPath} daemon run
Restart=on-failure

[Install]
WantedBy=default.target
`;
}
