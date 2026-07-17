import {
  ArgumentScannerError,
  formatMessageForArgumentScannerError,
  text_en,
  type ApplicationText,
} from '@stricli/core';

function describeException(exc: unknown): string {
  if (exc instanceof ArgumentScannerError) {
    return formatMessageForArgumentScannerError(exc, {
      AliasNotFoundError: (error) => `未知别名 -${error.input}`,
      ArgumentParseError: (error) =>
        `无法解析 ${error.externalFlagNameOrPlaceholder} 的值 "${error.input}"：${
          error.exception instanceof Error ? error.exception.message : String(error.exception)
        }`,
      EnumValidationError: (error) =>
        `${error.externalFlagName} 的值 "${error.input}" 不在可选范围（${error.values.join('、')}）`,
      FlagNotFoundError: (error) =>
        `未知旗标 --${error.input}${
          error.corrections.length > 0 ? `，是否想输入 ${error.corrections.join(' / ')}？` : ''
        }`,
      InvalidNegatedFlagSyntaxError: (error) =>
        `布尔旗标 ${error.externalFlagName} 不接受值 "${error.valueText}"`,
      UnexpectedFlagError: (error) =>
        `旗标 ${error.externalFlagName} 重复出现（已有 "${error.previousInput}"，又见 "${error.input}"）`,
      UnexpectedPositionalError: (error) =>
        `多余的位置参数 "${error.input}"（该命令最多接受 ${error.expectedCount} 个）`,
      UnsatisfiedFlagError: (error) =>
        `旗标 ${error.externalFlagName} 缺少值${
          error.nextFlagName === undefined ? '' : `（其后是 ${error.nextFlagName}）`
        }`,
      UnsatisfiedPositionalError: (error) => `缺少位置参数 <${error.placeholder}>`,
    });
  }
  if (exc instanceof Error) return exc.message;
  return String(exc);
}

export const textZh: ApplicationText = {
  ...text_en,
  keywords: {
    default: '默认 =',
    separator: '分隔符 =',
  },
  headers: {
    usage: '用法',
    aliases: '别名',
    commands: '命令',
    flags: '旗标',
    arguments: '参数',
  },
  briefs: {
    help: '显示此命令的帮助',
    helpAll: '显示帮助（含隐藏命令）',
    version: '显示版本号',
    argumentEscapeSequence: '其后输入一律视为位置参数',
  },
  noCommandRegisteredForInput: ({ input, corrections }) =>
    `未知命令 ${input}${corrections.length > 0 ? `，是否想输入 ${corrections.join(' / ')}？` : ''}`,
  noTextAvailableForLocale: ({ requestedLocale, defaultLocale }) =>
    `语言 ${requestedLocale} 暂无文案，使用默认语言 ${defaultLocale}。`,
  exceptionWhileParsingArguments: (exc) => `参数错误：${describeException(exc)}`,
  exceptionWhileLoadingCommandFunction: (exc) =>
    `内部错误（命令加载失败）：${describeException(exc)}`,
  exceptionWhileLoadingCommandContext: (exc) =>
    `内部错误（上下文加载失败）：${describeException(exc)}`,
  exceptionWhileRunningCommand: (exc) =>
    `命令执行失败：${exc instanceof Error ? (exc.stack ?? exc.message) : String(exc)}`,
  commandErrorResult: (err) => err.message,
  exceptionWhileRunningIntegrationHook: ({ exception, hook, integration }) =>
    `内部错误（集成 ${integration} 的 ${hook} 钩子失败）：${describeException(exception)}`,
  exceptionWhileRunningIntegrationFlag: ({ exception, integration }) =>
    `内部错误（集成 ${integration} 的旗标失败）：${describeException(exception)}`,
  currentVersionIsNotLatest: ({ currentVersion, latestVersion, upgradeCommand }) =>
    `当前版本 ${currentVersion} 落后于最新版本 ${latestVersion}${
      upgradeCommand === undefined ? '。' : `，可运行 ${upgradeCommand} 升级。`
    }`,
};
