import { globalMessages, type GlobalMessageKey, type Language } from '../data/i18n';

const rootLanguage = 'zh-Hans' satisfies Language;
const rootLocale = 'root';

const languageLabels = {
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  en: 'English',
} as const satisfies Record<Language, string>;

type LanguageEntry = [Language, (typeof languageLabels)[Language]];

const languageEntries = Object.entries(languageLabels) as LanguageEntry[];
const localizedPathPrefixes = new Set<string>(
  languageEntries.flatMap(([language]) =>
    getLocale(language) === rootLocale ? [] : [getLocale(language)],
  ),
);

/** 从统一语言配置派生给 Starlight 使用的 i18n 配置。 */
export const starlightI18n = {
  defaultLocale: rootLocale,
  locales: Object.fromEntries(
    languageEntries.map(([language, label]) => [
      getLocale(language),
      {
        label,
        lang: language,
      },
    ]),
  ),
  title: Object.fromEntries(
    languageEntries.map(([language]) => [language, getMessage(language, 'title')]),
  ),
};

function getMessage(language: Language, key: GlobalMessageKey) {
  return globalMessages[language][key];
}

function getLocale(language: Language) {
  return language === rootLanguage ? rootLocale : language.toLowerCase();
}

/** 读取默认语言下的全局文案，用于 Starlight 配置的默认 label。 */
export function getRootMessage(key: GlobalMessageKey) {
  return getMessage(rootLanguage, key);
}

/** 为 Starlight 的 translations 字段生成非默认语言文案。 */
export function getStarlightTranslations(key: GlobalMessageKey) {
  return Object.fromEntries(
    languageEntries
      .filter(([language]) => language !== rootLanguage)
      .map(([language]) => [language, getMessage(language, key)]),
  );
}

function localizeHref(href: string, locale: string | undefined) {
  if (!locale || locale === rootLocale || !href.startsWith('/') || href.startsWith('//'))
    return href;

  const [pathPrefix] = href.slice(1).split('/');

  if (pathPrefix && localizedPathPrefixes.has(pathPrefix)) return href;

  return `/${locale}${href}`;
}

/** 根据当前 Starlight locale 生成文档条目的站内链接。 */
export function getDocsEntryHref(id: string, locale: string | undefined) {
  const path = id === 'index' ? '/' : `/${id}/`;
  return localizeHref(path, locale);
}

/** 根据当前 Starlight locale 生成文档条目的内容集合 id。 */
export function getLocalizedDocsEntryId(id: string, locale: string | undefined) {
  if (!locale || locale === rootLocale) return id;
  return `${locale}/${id}`;
}
