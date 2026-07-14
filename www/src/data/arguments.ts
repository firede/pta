export const argumentIds = [
  'argument/what-is-project-truth',
  'argument/truth-record-versioned-with-implementation',
  'argument/project-truth-by-domain',
  'argument/truth-record-work-language',
  'argument/projection-view-compiled-on-demand',
  'argument/project-truth-freshness-governance',
  'argument/derivable-content-in-tool-layer',
  'argument/history-still-in-effect',
  'argument/domain-knowledge-package',
] as const;

export type ArgumentId = (typeof argumentIds)[number];
