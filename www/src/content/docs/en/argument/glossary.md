---
title: Glossary
description: Core terms used in the Arguments section.
tableOfContents: false
sourceHash: cee34595d1f9291c900334a07d4fea8dec33181261fffdf509f424a0a3faac33
---

**Judgment Bandwidth**

Judgment bandwidth is the channel for what a person can explicitly express, continuously judge, and take responsibility for. Set by human cognitive architecture, it stays nearly constant and does not grow with machine capability; once collaborative output exceeds what a person can read in full, it becomes the scarce resource of the collaborative system.

**Constitutive Judgment**

A constitutive judgment is one that defines the goal of the collaboration itself, such as what is wanted, what is cared about, what risk is acceptable, and in whose name commitments are made; it needs a person to provide it at any level of capability. Its counterpart, stopgap contribution, is people covering what machines cannot yet do, and it is continually replaced as machine capability grows.

**Project Truth**

Project truth is the judgments the current project actually follows: the decisions the project has made, and the premises the project has adopted. A piece of content belongs to project truth only when it meets two conditions: reasonable practice cannot derive it, and the project does not accept deviation from it. It grounds adjudication in later iteration and serves as the source for projection view generation.

**Reasonable Practice**

Reasonable practice is what qualified practitioners, facing a problem of the same kind, can adopt without any project-specific information. For the parts project truth has not pinned down, any handling consistent with reasonable practice is acceptable; the baseline shifts with the capability of practitioners and tools.

**Implementation**

The implementation is the whole that enters the current execution flow and determines the current version's result, such as the codebase, engineering files, and workflows. It conforms to project truth without carrying it; the content in it not bound by any judgment constitutes the current state. Its specific form depends on the project type and workflow.

**Truth Record**

The truth record is the explicit record of project truth outside the implementation. Each record carries one judgment together with its reason; when record and implementation diverge, it must be adjudicated whether the implementation has strayed from the judgment or the judgment has changed.

**Glossary**

A glossary maintains the stable vocabulary of a project. It lets people and AI work in the same semantic space, reducing ambiguity caused by synonyms, near-synonyms, industry colloquialisms, and incorrect spellings.

**Working Language**

The working language is the natural language that the project's primary maintainers continuously use to understand, discuss, record, and maintain the project. It is formed by expression patterns that are reused consistently in the project, and is the default language for project explanations.

**Projection View**

A projection view is content extracted, reorganized, and presented from project truth and the implementation for a specific usage context. It is a consumption result and can be regenerated on demand from the sources and the usage context; when content in a projection needs correction, the correction lands on the sources — a judgment's deviation lands on the truth record, an implementation defect lands on the implementation.

**Domain**

A domain is the organizational unit of project truth. It organizes the implementation and truth records that belong to the same long-term maintenance unit.

**Freshness**

Freshness is the degree of consistency between the project truth recorded in the repository and what the project actually follows. Freshness is maintained by change points and inspection points together.

**Internal Drift**

Internal drift is record deviation triggered by changes inside the repository. It takes two forms: the implementation is updated while the same domain's truth records are not re-checked; or a domain's truth records are updated while the related domains that reference them are not re-checked.

**External Drift**

External drift is record deviation triggered by changes outside the repository. When the real-world constraints the project follows change, no event appears in the repository, and the record falls out of truth.

**Change Point**

A change point is a checkpoint attached to change actions such as commits, reviews, and merges. It handles internal drift and folds freshness checks into the normal change flow.

**Inspection Point**

An inspection point is a time-triggered checkpoint independent of changes. It handles external drift and takes over domain relatedness that no structure expresses.

**Check Signal**

A check signal is a discovery suggesting that a project truth record may have deviated. It sends the related records into checkpoints; it is a candidate rather than a conclusion, and most signals require no record update once checked.

**Derivable Content**

Derivable content is content that machines can re-derive from the truth record and the implementation, such as summaries, display names, type judgments, and reverse dependency relationships. It does not enter project truth records; it stays in the tool layer, managed with cache semantics.

**Tool-Layer Cache**

The tool-layer cache is storage outside the repository, managed by tooling, that holds derivable content and the process state of checks and adjudications. It is keyed by the content hash of the source and invalidated when the source changes; it can be discarded at any time, at the cost of one round of re-derivation or re-adjudication.

**Residue**

Residue is the still-effective consequence left by past project states acting on the real world. It has no anchor in the current implementation and cannot be derived from the current version's snapshot; it is recorded explicitly as a non-derivable judgment, with each entry carrying a time or version clue. Its expiry is driven by changes in the world, as external drift, and entries are deleted once they no longer influence later judgments.

**Temporal Claim**

A temporal claim is a material's claim about its own window of validity: claiming current validity, claiming truth as of a moment, or claiming regenerability from sources. The three claims correspond to three ways of maintaining and form the material's stance; the claim cannot be read from the content and needs to be expressed explicitly as a property of the material itself.

**Point-in-Time Snapshot**

A point-in-time snapshot is a material that claims truth only as of the moment it was recorded. Its anchor comes built in with the record, and being maintenance-free follows from its definition: it says nothing about the present, so it never falls out of truth. For its content to speak about the present again, it must pass adjudication and enter a carrier of current claims.

**Domain Knowledge Package**

A domain knowledge package is a sharing unit of domain knowledge extracted from project truth after stripping project coupling and private information, consisting of normative content and informative content. It is not project truth for any project; its content enters the target project's truth only after being re-implemented by the target project, passing verification, and being adopted.

**Normative Content**

Normative content is the part of a domain knowledge package that consuming projects must follow, consisting of the domain's term relationships, rules, edge cases, reasons behind tradeoffs, and verifiers. The range over which it is tested is bounded by the package's sharing scope.

**Informative Content**

Informative content is the part of a domain knowledge package that serves as reference only, represented by the reference implementation. It can be replaced wholesale or regenerated from the normative content, and is not a basis for verification.

**Verifier**

A verifier expresses the machine-verifiable part of domain knowledge as executable verification. It tests domain semantics rather than implementation structure, and is what consumers rely on to judge a package before adoption and to verify results during re-implementation.
