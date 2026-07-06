---
title: Natural Language Expression Should Match the Working Language
description: Natural language expression in the grounding part of project truth should match the working language, improving understandability and reducing translation loss, term drift, and retrieval gaps.
dependsOn:
  - argument/what-is-project-truth
sourceHash: f1867c5753b47264f817b9f9d064f29285a9a165837019688c756fc01a3cd084
---

Natural language expression in the grounding part of project truth should match the working language.

The working language is the natural language that the project's primary maintainers continuously use to understand, discuss, record, and maintain the project. It is formed by expression patterns that are reused consistently in the project, and is the default language for project explanations.

## Background

Project truth consists of the execution part and the grounding part. This article discusses natural language expression in the grounding part.

The grounding part relies heavily on natural language. It records the concepts, rules, shared interpretations, tradeoffs, and necessary historical reasons the project currently follows, and may also explain engineering constraints and maintenance conventions. Whether natural language remains consistent directly affects whether people can understand and maintain the project smoothly.

Engineering symbols usually need to follow ecosystem, interface, and tooling constraints; natural language expression is responsible for helping maintainers read, judge, and collaborate. This article discusses the language choice for the latter kind of expression.

## Rationale

Natural language expression in the grounding part directly affects the cost of understanding and maintaining the project, so it should use the project's established working language. The key is a stable default natural language: whether the working language is Chinese, English, or another natural language the team has long used, maintainers should be able to read, discuss, and update the grounding part through the same main language. When the language is stable, the path to understanding is more direct, and the cost of reading, changing, and reviewing is lower.

Language inconsistency increases the cost for AI to find the right basis content. AI can handle multiple languages, but multilingual processing does not cost the same. When AI participates in a project, it often follows text search, retrieval, and context extraction to locate relevant basis content; natural language lacks stable mechanisms comparable to code symbol indexes. Language inconsistency lowers keyword match quality, forcing AI to try multiple phrasings, cross-language keywords, or broader scans, and makes relevant content easier to miss.

Using a unified working language lets the grounding part accumulate in the same language. The glossary can be built around the words that are actually used; rule explanations, historical reasons, and maintenance conventions can also reuse the same wording. This reduces translation loss, term drift, scattered expression, and retrieval gaps, allowing the grounding part to remain valid basis content that people and AI can keep locating, reusing, and maintaining.

## Boundaries

This article discusses natural language expression in the grounding part. To judge whether a piece of text falls under this principle, the key question is whether it explains the project, explains the basis, or supports collaborative judgment.

Engineering symbol names follow engineering constraints. Code identifiers, interface fields, and other engineering symbols can follow the relevant ecosystem and team conventions; the key is that they maintain stable correspondence with project concepts in the working language.

Engineering proper names can remain in their original language, such as commands, configuration items, API names, and error messages. Keeping the original language should be limited to the engineering proper names themselves; the surrounding explanation should still be organized in the working language. Engineering operation instructions aim at accurate execution, and their language choice follows the team's engineering practice.

## Objections

**If working languages differ, will cross-project reuse of domain knowledge become harder?**

Cross-project reuse at the implementation level usually depends on compatible programming languages, package management systems, and runtime environments. Cross-project reuse in the grounding part is mainly about moving domain knowledge, rule patterns, term relationships, and modeling experience into the target project.

When this content enters the target project, it needs to be re-expressed in terms of the target project's existing project truth, execution structure, and working language. Only after the migrated content is adopted by the target project and becomes content it currently follows does it enter project truth in the target project.

**Will differences between natural language expression and engineering symbol names create confusion?**

Engineering symbol names and natural language expression in the grounding part play different roles. Engineering symbol names express implementation structure and are affected by component boundaries, refactoring, framework conventions, database design, and symbol systems. Natural language expression in the grounding part serves understanding and judgment, and needs to remain stable with the working language.

After a project refactor, engineering symbol names may change while project concepts can remain stable. The two can be connected through the glossary, references, and necessary explanations, supporting both engineering location and project understanding.

## Conclusion

Natural language expression in the grounding part should match the working language. The working language is the default language continuously used by primary maintainers to understand, discuss, record, and maintain the project.

This principle lets explanations, rules, shared interpretations, tradeoffs, and necessary historical reasons in project truth accumulate in the same language. It makes the project easier for people to understand and reduces the cost for AI to find relevant basis content. Engineering symbol names can evolve under engineering constraints; natural language expression in the grounding part should remain stable and continuously support retrieval, reuse, and maintenance.
