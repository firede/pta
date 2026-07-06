export const argumentIds = [
  'argument/what-is-project-truth',
  'argument/grounding-part-versioned-with-execution-part',
  'argument/project-truth-by-domain',
  'argument/grounding-part-work-language',
] as const;

export type ArgumentId = (typeof argumentIds)[number];
