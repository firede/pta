---
title: Reference Basis Must Share Execution Version Boundaries
description: In long-lived iterative projects, whenever the execution part is managed in a repository and AI will participate in later maintenance, the reference basis of project truth must be versioned with the execution part.
dependsOn:
  - argument/what-is-project-truth
sourceHash: 4ddb7b888b1a469707194abfc9beba704e779a9e669330a6f84ef6e9af069c9b
---

In long-lived iterative projects, whenever the execution part is managed in a repository and AI will participate in later maintenance, the reference basis of project truth must be versioned with the execution part.

What matters here is sharing the same version boundary. Changes to the reference basis should be committed, reviewed, rolled back, and traced together with the related execution changes.

> This article builds on the distinction between the execution part and the reference basis in [What Is Project Truth](/en/argument/what-is-project-truth/), and discusses only their version boundary relationship.

## Background

The execution part is usually already managed in a repository and forms the version boundary for the current result. How the current result is produced, verified, and delivered changes as the execution part changes across versions. In different projects, the execution part may take the form of code, engineering files, workflows, or verification materials.

The reference basis often lacks a stable version boundary. It may remain as tacit knowledge in maintainers' memory, or be scattered across requirements, collaboration, knowledge management, and conversation history. Once this content becomes detached from the execution part, it becomes hard to confirm what the current project actually relies on.

When AI participates in later maintenance, the distance between clarifying requirements, adding constraints, and changing the execution part becomes much shorter. Later iterations depend on both the execution part and the reference basis. When the reference basis lacks a stable version boundary, or does not share a version boundary with the execution part, this detachment affects understanding, modification, verification, and review more quickly.

## Rationale

**A shared version boundary makes the current basis easier to judge.**

The reference basis affects later iterations, but does not enter the current execution flow. Whether it is still valid depends on its correspondence with the execution part. Rules, constraints, terms, and tradeoffs must be traceable to the execution versions they apply to.

After the reference basis is versioned with the execution part, the current basis can be judged within the same version boundary. When people and AI understand the project, they do not first need to decide whether external documents still match the current execution state, nor do they need to piece together version relationships across multiple tools.

**A shared version boundary lets the current basis be maintained with changes.**

A single iteration may change both the execution result and the basis for later judgment. Rule changes, terminology convergence, constraint changes, and added historical reasons may all require updates to the reference basis. After the reference basis is versioned with the execution part, these changes can be maintained within the same commit, review, and rollback boundary.

This does not require the reference basis to duplicate details already expressed clearly by the execution part. What needs to be maintained together is the current basis that later iterations must follow, but that the execution part cannot reliably carry.

**Without a shared version boundary, translation and drift accumulate.**

When the reference basis stays outside the execution part, maintainers often first extract context from the execution state, then write the judgment basis into external materials. During later changes, they have to map those materials back to the execution part and judge which objects, boundaries, and verification methods they correspond to.

Each round trip introduces information loss, retelling bias, version mismatch, and missing context. In long-term iteration, these problems accumulate into basis drift. External materials may look complete, but can no longer reliably explain what the current project actually relies on.

**AI participation amplifies location and judgment costs.**

When AI participates in later maintenance, it usually needs to locate, change, and verify results in the repository where the execution part lives. If the reference basis stays in another version space, every AI change depends on user retelling, ad hoc search, or extra context assembly. Natural-language basis content does not have stable mechanisms comparable to code symbol indexes, and version mismatch further reduces the reliability of search and judgment.

After the reference basis is versioned with the execution part, AI can discover the current basis in the same repository, and include reference-basis changes and execution changes in the same review. Human reviewers can also judge both whether the result is correct and whether the current basis still holds.

## Boundaries

This article discusses the underlying version relationship. Versioning the reference basis with the execution part means they share a version boundary.

How the reference basis is organized and governed is outside the scope of this article. File formats, directory structures, review workflows, update mechanisms, and deprecation rules belong to later design work.

Access entry points are also not defined here. The repository provides the underlying version boundary; external systems can provide access, review, and update entry points according to project needs.

Process materials are not project truth and should not be maintained as project truth. Process materials record discussion, judgment, and decision-making processes; common forms include meeting notes, research materials, issues, PRs, ADRs, and AI conversations.

This principle applies to projects whose execution part is already reliably managed in a repository and that require long-term iteration. A one-off prototype exploration may initially rely on conversation context, temporary materials, and immediate judgment. When the project enters continuous maintenance, the current basis needs to be versioned with the execution part.

## Objections

**Will the repository become a pile of materials?**

This risk comes from losing the entry standard. Content that enters the repository must already have become the reference basis that the current project actually relies on. Research, discussion, and process records can remain in their existing workflows. Only content that has formed the current basis and will affect later iteration judgments and results needs to be versioned with the execution part.

The reference basis stores only the current basis that the execution part cannot reliably carry. Rules, structures, and verification methods already expressed clearly by the execution part should remain in the execution part. Invalidated basis content should be updated or deleted with changes.

**Do external systems lose their value?**

External systems still have value. They are good at collecting information, organizing discussion, presenting views, initiating changes, and carrying workflows. Their limitation is the version boundary. After content becomes the current basis, if it remains outside the execution part for a long time, it gradually loses its stable correspondence with the current execution version.

External systems can continue to serve collaboration and access, while the reference basis is versioned with the execution part. This preserves the usability of higher-level tools while keeping the content the current project actually relies on traceable, reviewable, and recoverable through rollback.

**Will versioning the reference basis with the execution part increase maintenance burden?**

It adds explicit maintenance work, but reduces hidden understanding costs. When the reference basis stays outside, maintainers still need to judge which materials are valid, which rules are outdated, and which constraints still apply. Those judgments are simply scattered across communication, search, and context stitching. The explicit maintenance work is a one-time investment; the scattered hidden judgments are paid again in every iteration, and keep accumulating as iterations continue.

After the reference basis is versioned with the execution part, the maintenance burden enters the normal change flow. When changing the execution part, maintainers can also check whether the related basis content needs updating. When reviewing changes, they can also confirm whether the current basis and the execution result remain consistent.

## Conclusion

The reference basis must be versioned with the execution part. Project truth consists of the execution part and the reference basis. This article discusses their version relationship: the reference basis needs to share a version boundary with the execution part.

The core judgment is that it should be possible to review, trace, roll back, and maintain the content the current project actually relies on together with the current result.

This lets people, AI, and tools judge whether the current basis is valid on the same current version, and maintain the current basis and execution result together through changes.
