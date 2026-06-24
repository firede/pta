export const argumentIds = [
  'argument/what-is-project-truth',
  'argument/reference-basis-versioned-with-execution-part',
  'argument/project-truth-by-domain',
  'argument/reference-basis-work-language',
] as const;

export type ArgumentId = (typeof argumentIds)[number];
