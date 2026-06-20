export const argumentIds = [
  'argument/what-is-project-truth',
  'argument/project-truth-in-codebase',
  'argument/project-truth-by-domain',
  'argument/project-natural-language-in-work-language',
] as const;

export type ArgumentId = (typeof argumentIds)[number];
