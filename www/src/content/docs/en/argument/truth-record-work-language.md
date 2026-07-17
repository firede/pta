---
title: Natural Language Expression Should Match the Working Language
description: Natural language expression in the truth record should match the working language, improving understandability and reducing translation loss, term drift, and retrieval gaps.
dependsOn:
  - argument/what-is-project-truth
sourceHash: 51fe65869f19b5b6e8cd2c92069982fc413e5a73b90c97efdd76978a66b08b5b
---

Natural language expression in the truth record should match the working language.

The working language is the natural language that the project's primary maintainers continuously use to understand, discuss, record, and maintain the project. It is formed by expression patterns that are reused consistently in the project, and is the default language for project explanations.

## Background

Project truth is explicitly recorded outside the implementation as the truth record. This article discusses natural language expression in the truth record.

The truth record relies heavily on natural language. It carries the concepts, rules, shared interpretations, and tradeoffs with their reasons that the project currently follows, and may also explain engineering constraints and maintenance conventions. Whether natural language remains consistent directly affects whether people can understand and maintain the project smoothly.

Engineering symbols usually need to follow ecosystem, interface, and tooling constraints; natural language expression is responsible for helping maintainers read, judge, and collaborate. This article discusses the language choice for the latter kind of expression.

## Rationale

**A unified working language lowers the cost of human understanding and maintenance.**

The key is a stable default natural language: whether the working language is Chinese, English, or another natural language the team has long used, maintainers should be able to read, discuss, and update the truth record through the same main language. When the language is stable, the path to understanding is more direct, and the cost of reading, changing, and reviewing is lower.

**Language inconsistency increases the cost for AI to locate the record.**

AI can handle multiple languages, but multilingual processing does not cost the same. When AI participates in a project, it often depends on text search, retrieval, and context extraction to locate relevant judgments; natural language lacks stable mechanisms comparable to code symbol indexes. Language inconsistency lowers keyword match quality, forcing AI to try multiple phrasings, cross-language keywords, or broader scans, and makes relevant content easier to miss.

**A unified working language lets judgments accumulate in the same set of expressions.**

The glossary can be built around the words that are actually used; rule explanations, tradeoff reasons, and maintenance conventions can also reuse the same wording. This reduces translation loss, term drift, scattered expression, and retrieval gaps, allowing the truth record to remain a valid record that people and AI can keep locating, reusing, and maintaining.

## Boundaries

**This article discusses natural language expression in the truth record.**

To judge whether a piece of text falls under this principle, the key question is whether it explains the project, explains a judgment, or supports collaborative judgment.

**Engineering symbol names follow engineering constraints.**

Code identifiers, interface fields, and other engineering symbols can follow the relevant ecosystem and team conventions; the key is that they maintain stable correspondence with project concepts in the working language.

**Engineering proper names can remain in their original language.**

Commands, configuration items, API names, and error messages are all such proper names. Keeping the original language should be limited to the engineering proper names themselves; the surrounding explanation should still be organized in the working language. Engineering operation instructions aim at accurate execution, and their language choice follows the team's engineering practice.

## Objections

**If working languages differ, will cross-project reuse of domain knowledge become harder?**

Cross-project reuse at the implementation level usually depends on compatible programming languages, package management systems, and runtime environments. Cross-project reuse of the truth record is mainly about moving domain knowledge, rule patterns, term relationships, and modeling experience into the target project.

When this content enters the target project, it needs to be re-expressed in terms of the target project's existing project truth, implementation structure, and working language. Only after the migrated content is adopted by the target project and becomes a judgment it currently follows does it enter project truth in the target project.

**In a monorepo whose packages use different languages, does the working language still hold?**

The working language exists per project, and a project is delimited by maintenance relationships: the scope that a group of primary maintainers continuously understands, discusses, records, and maintains constitutes one project. Packages and repositories are units of engineering facilities, not natural project boundaries: packages in a monorepo[^monorepo] are units of the build and distribution ecosystem, and repository boundaries vary with the version control system — Git's conventions make one repository carrying one project feel natural, while a single SVN repository customarily hosts multiple projects. Project boundaries should not be inherited by default from the topology of facilities; they should be explicitly delimited by maintenance relationships.

Multiple packages maintained by the same group of maintainers under the same set of judgments form one project, sharing one semantic space and one working language. A package forked from an open-source project in another language keeps its original documentation as external material; judgments the project relies on are still re-expressed in the working language when they enter project truth.

If a repository does contain several scopes maintained separately without shared judgments, those are multiple projects, each with its own working language. How tools accommodate multiple projects is an engineering choice; it does not change that the working language holds per project.

[^monorepo]: A monorepo is a repository layout that manages multiple packages or subprojects in one repository.

**Will differences between natural language expression and engineering symbol names create confusion?**

Engineering symbol names and natural language expression in the truth record play different roles. Engineering symbol names express implementation structure and are affected by component boundaries, refactoring, framework conventions, database design, and symbol systems. Natural language expression in the truth record serves understanding and judgment, and needs to remain stable with the working language.

After a project refactor, engineering symbol names may change while project concepts can remain stable. The two can be connected through the glossary, references, and necessary explanations, supporting both engineering location and project understanding.

## Conclusion

Natural language expression in the truth record should match the working language. The working language is the default language continuously used by primary maintainers to understand, discuss, record, and maintain the project.

This principle lets explanations, rules, shared interpretations, and tradeoffs with their reasons in project truth accumulate in the same language. It makes the project easier for people to understand and reduces the cost for AI to locate judgments. Engineering symbol names can evolve under engineering constraints; natural language expression in the truth record should remain stable and continuously support retrieval, reuse, and maintenance.
