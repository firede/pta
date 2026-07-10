---
title: Glossary
description: Core terms used in the Arguments section.
tableOfContents: false
sourceHash: 4b1652b07edc642c2965491abd87a361ccd62bec0ff907fa07a7568180662399
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

**Derivable Content**

Derivable content is content that machines can re-derive from project truth and the execution part, such as summaries, display names, type judgments, and reverse dependency relationships. It does not enter project truth records; it stays in the tool layer, managed with cache semantics.

**Tool-Layer Cache**

The tool-layer cache is storage outside the repository, managed by tooling, that holds derivable content and the process state of checks and adjudications. It is keyed by the content hash of the source and invalidated when the source changes; it can be discarded at any time, at the cost of one round of re-derivation or re-adjudication.

**Domain Knowledge Package**

A domain knowledge package is a sharing unit of domain knowledge extracted from project truth after stripping project coupling and private information, consisting of normative content and informative content. It is not project truth for any project; its content enters the target project's truth only after being re-implemented by the target project, passing verification, and being adopted.

**Normative Content**

Normative content is the part of a domain knowledge package that consuming projects must follow, consisting of the domain's term relationships, rules, edge cases, reasons behind tradeoffs, and verifiers. The range over which it is tested is bounded by the package's sharing scope.

**Informative Content**

Informative content is the part of a domain knowledge package that serves as reference only, represented by the reference implementation. It can be replaced wholesale or regenerated from the normative content, and is not a basis for verification.

**Verifier**

A verifier expresses the machine-verifiable part of domain knowledge as executable verification. It tests domain semantics rather than implementation structure, and is what consumers rely on to judge a package before adoption and to verify results during re-implementation.
