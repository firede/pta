export const globalMessages = {
  'zh-Hans': {
    title: '项目真相架构',
    specification: '规范',
    guide: '指南',
    arguments: '立论',
  },
  'zh-Hant': {
    title: '專案真相架構',
    specification: '規範',
    guide: '指南',
    arguments: '立論',
  },
  en: {
    title: 'Project Truth Architecture',
    specification: 'Specification',
    guide: 'Guide',
    arguments: 'Arguments',
  },
} as const;

export type Language = keyof typeof globalMessages;
export type GlobalMessageKey = keyof (typeof globalMessages)['zh-Hans'];
