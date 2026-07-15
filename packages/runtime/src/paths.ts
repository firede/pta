import { homedir } from 'node:os';
import { join } from 'node:path';

export type GlobalPaths = Readonly<{
  configDir: string;
  cacheDir: string;
  stateDir: string;
}>;

export function resolveGlobalPaths(
  env: Readonly<Record<string, string | undefined>> = process.env,
): GlobalPaths {
  const home = env['HOME'] ?? homedir();
  const base = (variable: string, fallback: readonly string[]): string => {
    const value = env[variable];
    return value === undefined || value === ''
      ? join(home, ...fallback, 'pta')
      : join(value, 'pta');
  };
  return {
    configDir: base('XDG_CONFIG_HOME', ['.config']),
    cacheDir: base('XDG_CACHE_HOME', ['.cache']),
    stateDir: base('XDG_STATE_HOME', ['.local', 'state']),
  };
}
