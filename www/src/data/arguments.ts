export const argumentIds = [
  'argument/what-is-project-truth',
  'argument/grounding-part-versioned-with-execution-part',
  'argument/project-truth-by-domain',
  'argument/grounding-part-work-language',
  'argument/projection-view-compiled-on-demand',
  'argument/project-truth-freshness-governance',
] as const;

export type ArgumentId = (typeof argumentIds)[number];
