export const globalMessages = {
  'zh-Hans': {
    title: '项目真相架构',
    arguments: '立论',
    topics: '议题',
    specification: '规范',
    guide: '指南',
  },
  'zh-Hant': {
    title: '專案真相架構',
    arguments: '立論',
    topics: '議題',
    specification: '規範',
    guide: '指南',
  },
  en: {
    title: 'Project Truth Architecture',
    arguments: 'Arguments',
    topics: 'Topics',
    specification: 'Specification',
    guide: 'Guide',
  },
} as const;

export type Language = keyof typeof globalMessages;
export type GlobalMessageKey = keyof (typeof globalMessages)['zh-Hans'];
