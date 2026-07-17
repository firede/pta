import pc from 'picocolors';

// 色彩层：同一结构的第二次渲染，只做叠加、不承载语义（管道剥色后信息无损）。
// 开关在入口判定一次，样式以实例注入；素文是默认路径，测试锚定素文。

export type Style = Readonly<{
  bold: (text: string) => string;
  dim: (text: string) => string;
  red: (text: string) => string;
  yellow: (text: string) => string;
  green: (text: string) => string;
  cyan: (text: string) => string;
  magenta: (text: string) => string;
}>;

const identity = (text: string): string => text;

export const plainStyle: Style = {
  bold: identity,
  dim: identity,
  red: identity,
  yellow: identity,
  green: identity,
  cyan: identity,
  magenta: identity,
};

export function terminalStyle(enabled: boolean): Style {
  if (!enabled) return plainStyle;
  const colors = pc.createColors(true);
  return {
    bold: colors.bold,
    dim: colors.dim,
    red: colors.red,
    yellow: colors.yellow,
    green: colors.green,
    cyan: colors.cyan,
    magenta: colors.magenta,
  };
}

/** 仅 TTY 上色；NO_COLOR 一票否决，FORCE_COLOR 显式覆盖（供管道进分页器等场景）。 */
export function stdoutSupportsColor(
  env: Readonly<Partial<Record<string, string>>> = process.env,
  isTTY: boolean = process.stdout.isTTY === true,
): boolean {
  const noColor = env['NO_COLOR'];
  if (noColor !== undefined && noColor !== '') return false;
  const force = env['FORCE_COLOR'];
  if (force !== undefined && force !== '') {
    return force !== '0' && force.toLowerCase() !== 'false';
  }
  return isTTY && env['TERM'] !== 'dumb';
}

const sgrPattern = /\x1b\[[0-9;]*m/gu;

/** 剥除 SGR 转义：显示宽度计算与「剥色后信息无损」断言共用。 */
export function stripStyles(text: string): string {
  return text.replaceAll(sgrPattern, '');
}
