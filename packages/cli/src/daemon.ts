import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { GlobalPaths } from './paths.ts';

export type DaemonState = Readonly<{
  pid: number;
  port: number;
  startedAt: string;
}>;

export function daemonStateFilePath(paths: GlobalPaths): string {
  return join(paths.stateDir, 'daemon', 'daemon.json');
}

export async function readDaemonState(paths: GlobalPaths): Promise<DaemonState | undefined> {
  try {
    const source = await readFile(daemonStateFilePath(paths), 'utf8');
    const parsed = JSON.parse(source) as DaemonState;
    return typeof parsed.pid === 'number' && typeof parsed.port === 'number' ? parsed : undefined;
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

export async function aliveDaemonState(paths: GlobalPaths): Promise<DaemonState | undefined> {
  const state = await readDaemonState(paths);
  if (state === undefined) return undefined;
  return isProcessAlive(state.pid) ? state : undefined;
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
