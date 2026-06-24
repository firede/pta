export const argumentIds = [
  'argument/what-is-project-truth',
  'argument/reference-basis-versioned-with-execution-part',
  'argument/project-truth-by-domain',
  'argument/project-natural-language-in-work-language',
] as const;

export type ArgumentId = (typeof argumentIds)[number];
