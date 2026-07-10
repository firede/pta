export const specificationIds = [
  'specification/domain-declaration',
  'specification/content-structure',
  'specification/governance',
  'specification/compilation',
  'specification/identity',
  'specification/integration',
] as const;

export type SpecificationId = (typeof specificationIds)[number];
