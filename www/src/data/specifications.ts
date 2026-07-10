export const specificationIds = [
  'specification/domain-declaration',
  'specification/content-structure',
  'specification/governance',
] as const;

export type SpecificationId = (typeof specificationIds)[number];
