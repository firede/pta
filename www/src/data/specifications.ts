export const specificationIds = [
  'specification/domain-declaration',
  'specification/content-structure',
  'specification/governance',
  'specification/compilation',
] as const;

export type SpecificationId = (typeof specificationIds)[number];
