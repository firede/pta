import { getEntry } from 'astro:content';

import { globalMessages, type Language } from '@/data/i18n';
import { argumentIds } from '@/data/arguments';
import { specificationIds } from '@/data/specifications';

import { getDocsEntryHref, getLanguageFromLocale, getLocalizedDocsEntryId } from './i18n';

/** 全站内容的典籍结构：立论、规范、指南三卷，条目带正名编号。 */
export type VolumeKey = 'argument' | 'specification' | 'guide';

export interface CanonEntry {
  /** 简体中文内容集合 id，如 `argument/what-is-project-truth`。 */
  id: string;
  title: string;
  description: string;
  /** 卷内序号（0 起）；术语表等附录条目为 null。 */
  index: number | null;
  /** 正名编号：论三 / Arg. 03；附录条目为空串。 */
  number: string;
  href: string;
  dependsOn: readonly string[];
}

export interface CanonVolume {
  key: VolumeKey;
  /** 卷次：卷一 / Vol. I */
  ordinal: string;
  /** 卷名：立论 / Arguments */
  label: string;
  entries: CanonEntry[];
}

const volumeOrder = ['argument', 'specification', 'guide'] as const;

const zhNumerals = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
const latinNumerals = ['I', 'II', 'III'];

const volumeLabelKeys = {
  argument: 'arguments',
  specification: 'specification',
  guide: 'guide',
} as const;

/** 卷次的正名：汉语为「卷一」，拉丁区划为「Vol. I」。 */
export function formatVolumeOrdinal(language: Language, volume: VolumeKey) {
  const index = volumeOrder.indexOf(volume);
  return language === 'en' ? `Vol. ${latinNumerals[index]}` : `卷${zhNumerals[index]}`;
}

/** 条目编号的正名：论三、规范一、Arg. 03、Spec. 01。 */
export function formatEntryNumber(language: Language, volume: VolumeKey, index: number) {
  if (volume === 'argument') {
    if (language === 'en') return `Arg. ${String(index + 1).padStart(2, '0')}`;
    return `${language === 'zh-Hant' ? '論' : '论'}${zhNumerals[index]}`;
  }
  if (volume === 'specification') {
    if (language === 'en') return `Spec. ${String(index + 1).padStart(2, '0')}`;
    return `${language === 'zh-Hant' ? '規範' : '规范'}${zhNumerals[index]}`;
  }
  return '';
}

/** 星图节点牌面的紧凑编号：三、十一、03。 */
export function formatPlateNumber(language: Language, index: number) {
  return language === 'en' ? String(index + 1).padStart(2, '0') : zhNumerals[index];
}

async function toCanonEntry(
  id: string,
  locale: string | undefined,
  language: Language,
  volume: VolumeKey,
  index: number | null,
): Promise<CanonEntry> {
  const entry = await getEntry('docs', getLocalizedDocsEntryId(id, locale));
  if (!entry) {
    throw new Error(
      `canon: 找不到文档条目 "${getLocalizedDocsEntryId(id, locale)}"（来源 "${id}"）。`,
    );
  }

  return {
    id,
    title: entry.data.title,
    description: entry.data.description ?? '',
    index,
    number: index === null ? '' : formatEntryNumber(language, volume, index),
    href: getDocsEntryHref(id, locale),
    dependsOn: entry.data.dependsOn ?? [],
  };
}

/** 读取当前语言的完整典籍结构；在构建期解析，结果随页面静态化。 */
export async function getCanon(locale: string | undefined): Promise<CanonVolume[]> {
  const language = getLanguageFromLocale(locale);

  return Promise.all(
    volumeOrder.map(async (key) => {
      let entries: CanonEntry[];
      if (key === 'argument') {
        entries = await Promise.all([
          ...argumentIds.map((id, index) => toCanonEntry(id, locale, language, key, index)),
          // 术语表是卷一附录，不占编号
          toCanonEntry('argument/glossary', locale, language, key, null),
        ]);
      } else if (key === 'specification') {
        entries = await Promise.all(
          specificationIds.map((id, index) => toCanonEntry(id, locale, language, key, index)),
        );
      } else {
        entries = [await toCanonEntry('guide', locale, language, key, null)];
      }

      return {
        key,
        ordinal: formatVolumeOrdinal(language, key),
        label: globalMessages[language][volumeLabelKeys[key]],
        entries,
      };
    }),
  );
}

/** 由站内路径反查典籍条目，供翻篇与章头定位编号。 */
export async function findCanonEntryByHref(locale: string | undefined, href: string) {
  const canon = await getCanon(locale);
  const normalized = href.endsWith('/') ? href : `${href}/`;
  for (const volume of canon) {
    for (const entry of volume.entries) {
      if (entry.href === normalized) return { volume, entry };
    }
  }
  return undefined;
}

/** 由 Starlight 路由 id 反查典籍条目（路由 id 带 locale 前缀时剥除）。 */
export async function findCanonEntry(locale: string | undefined, routeId: string) {
  const canon = await getCanon(locale);
  const prefix = locale && locale !== 'root' ? `${locale}/` : '';
  const sourceId = prefix && routeId.startsWith(prefix) ? routeId.slice(prefix.length) : routeId;
  for (const volume of canon) {
    for (const entry of volume.entries) {
      if (entry.id === sourceId) return { volume, entry };
    }
  }
  return undefined;
}
