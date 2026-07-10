export const argumentIds = [
  'argument/what-is-project-truth',
  'argument/grounding-part-versioned-with-execution-part',
  'argument/project-truth-by-domain',
  'argument/grounding-part-work-language',
  'argument/projection-view-compiled-on-demand',
  'argument/project-truth-freshness-governance',
  'argument/derivable-content-in-tool-layer',
  'argument/history-still-in-effect',
  'argument/domain-knowledge-package',
] as const;

export type ArgumentId = (typeof argumentIds)[number];
