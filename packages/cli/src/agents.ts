import { execFile } from 'node:child_process';

import type { AgentConfig } from './config.ts';

export type AgentInvocation = Readonly<{
  command: string;
  args: readonly string[];
  stdin?: string;
}>;

export type AgentTaskResult = Readonly<{
  ok: boolean;
  output: string;
  error?: string;
  durationMs: number;
}>;

export function buildAgentInvocation(agent: AgentConfig, prompt: string): AgentInvocation {
  const [command, ...rest] = agent.command;
  const hasPlaceholder = rest.some((item) => item.includes('{prompt}'));
  const args = rest.map((item) => item.replaceAll('{prompt}', prompt));
  return { command: command as string, args, ...(hasPlaceholder ? {} : { stdin: prompt }) };
}

export function runAgentTask(
  agent: AgentConfig,
  prompt: string,
  cwd: string,
): Promise<AgentTaskResult> {
  const invocation = buildAgentInvocation(agent, prompt);
  const started = Date.now();
  return new Promise((resolve) => {
    const child = execFile(
      invocation.command,
      invocation.args,
      { cwd, timeout: agent.timeoutSeconds * 1000, maxBuffer: 32 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const durationMs = Date.now() - started;
        if (error === null) {
          resolve({ ok: true, output: stdout, durationMs });
        } else {
          resolve({
            ok: false,
            output: stdout,
            error: stderr.trim() !== '' ? stderr.trim() : error.message,
            durationMs,
          });
        }
      },
    );
    if (invocation.stdin !== undefined) child.stdin?.write(invocation.stdin);
    child.stdin?.end();
  });
}
