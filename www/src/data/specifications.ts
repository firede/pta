export const specificationIds = [
  'specification/domain-declaration',
  'specification/content-structure',
] as const;

export type SpecificationId = (typeof specificationIds)[number];
