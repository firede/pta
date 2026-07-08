---
title: Glossary
description: Core terms used in the Arguments section.
tableOfContents: false
sourceHash: dfd9e0637213ecf37e4434e7cc1f317c7d48d51bbc094df1dac74c25d8d1b88e
---

**Project Truth**

Project truth is the content the current project actually follows. It determines how the project runs now, how it is understood, what later changes and judgments must take into account, and provides the basis for generating projection views in different task contexts. Project truth consists of the execution part and the grounding part.

**Execution Part**

The execution part is the part of project truth that participates in the current execution flow and determines the current version's result. It usually takes an operable, verifiable form; its specific form depends on the project type and workflow.

**Grounding Part**

The grounding part is the part of project truth that does not participate in the current execution flow, but affects later iteration judgments and results. It preserves content that later iterations must follow but that the execution part cannot reliably carry.

**Glossary**

A glossary maintains the stable vocabulary of a project. It lets people and AI work in the same semantic space, reducing ambiguity caused by synonyms, near-synonyms, industry colloquialisms, and incorrect spellings.

**Working Language**

The working language is the natural language that the project's primary maintainers continuously use to understand, discuss, record, and maintain the project. It is formed by expression patterns that are reused consistently in the project, and is the default language for project explanations.

**Projection View**

A projection view is a portion of project truth extracted, reorganized, and presented for a specific usage context. It is a derived result of project truth and can be regenerated on demand from project truth and the usage context; when content in a projection needs correction, the correction lands on project truth.

**Domain**

A domain is the organizational unit of project truth. It organizes the execution part and grounding part that belong to the same long-term maintenance unit.

**Freshness**

Freshness is the degree of consistency between the project truth recorded in the repository and what the project actually follows. Freshness is maintained by change points and inspection points together.

**Internal Drift**

Internal drift is record deviation triggered by changes inside the repository. It takes two forms: the execution part is updated while the same domain's basis content is not; or a domain's basis content is updated while the related domains that reference it are not re-checked.

**External Drift**

External drift is record deviation triggered by changes outside the repository. When the real-world constraints the project follows change, no event appears in the repository, and the record falls out of truth.

**Change Point**

A change point is a checkpoint attached to change actions such as commits, reviews, and merges. It handles internal drift and folds freshness checks into the normal change flow.

**Inspection Point**

An inspection point is a time-triggered checkpoint independent of changes. It handles external drift and takes over domain relatedness that no structure expresses.
