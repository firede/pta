---
title: The Grounding Part Must Be Versioned with the Execution Part
description: In long-lived iterative projects, whenever the execution part is managed in a repository and AI will participate in later maintenance, the grounding part of project truth must be versioned with the execution part.
dependsOn:
  - argument/what-is-project-truth
sourceHash: d8ac5148e4eb0a01f9dc4e3ff0a56919e67a3b32979c7374c3e7110ce4a26a75
---

In long-lived iterative projects, whenever the execution part is managed in a repository and AI will participate in later maintenance, the grounding part of project truth must be versioned with the execution part.

Versioning here means sharing the same version boundary: changes to the grounding part should be committed, reviewed, rolled back, and traced together with the related execution changes.

> This article builds on the distinction between the execution part and the grounding part in [What Is Project Truth](/en/argument/what-is-project-truth/), and discusses only their version boundary relationship.

## Background

The execution part is usually already managed in a repository and forms the version boundary for the current result. How the current result is produced, verified, and delivered changes as the execution part changes across versions. In different projects, the execution part may take the form of code, engineering files, workflows, or verification materials.

The grounding part often lacks a stable version boundary. It may remain as tacit knowledge in maintainers' memory, or be scattered across requirements, collaboration, knowledge management, and conversation history. Once this content becomes detached from the execution part, it becomes hard to confirm what the current project actually follows.

When AI participates in later maintenance, the distance between clarifying requirements, adding constraints, and changing the execution part becomes much shorter. Later iterations depend on both the execution part and the grounding part. When the grounding part lacks a stable version boundary, or does not share a version boundary with the execution part, this detachment affects understanding, modification, verification, and review more quickly.

## Rationale

**A shared version boundary makes it clear whether basis content is still valid.**

The grounding part affects later iterations, but does not enter the current execution flow. Whether it is still valid depends on its correspondence with the execution part. Rules, constraints, terms, and tradeoffs must be traceable to the execution versions they apply to.

After the grounding part is versioned with the execution part, whether basis content is still valid can be judged within the same version boundary. When people and AI understand the project, they do not first need to decide whether external documents still match the current execution state, nor do they need to piece together version relationships across multiple tools.

**A shared version boundary lets basis content be maintained with changes.**

A single iteration may change both the execution result and the basis for later judgment. Rule changes, terminology convergence, constraint changes, and added historical reasons may all require updates to the grounding part. Once the two share a version boundary, these changes can be maintained within the same commit, review, and rollback boundary.

This does not require the grounding part to duplicate details already expressed clearly by the execution part. What needs to be maintained together is content that later iterations must follow, but that the execution part cannot reliably carry.

**Without a shared version boundary, translation and drift accumulate.**

When the grounding part stays outside the execution part, maintainers often first extract context from the execution state, then write the judgment basis into external materials. During later changes, they have to map those materials back to the execution part and judge which objects, boundaries, and verification methods they correspond to.

Each round trip introduces information loss, retelling bias, version mismatch, and missing context. In long-term iteration, these problems accumulate into basis drift. External materials may look complete, but can no longer reliably explain what the current project actually follows.

**AI participation amplifies location and judgment costs.**

When AI participates in later maintenance, it usually needs to locate, change, and verify results in the repository where the execution part lives. If the grounding part stays in another version space, every AI change depends on user retelling, ad hoc search, or extra context assembly. Natural-language basis content does not have stable mechanisms comparable to code symbol indexes, and version mismatch further reduces the reliability of search and judgment.

Once the grounding part lives in the same repository, AI can discover the currently valid basis content directly, and include grounding-part changes and execution changes in the same review. Human reviewers can also judge both whether the result is correct and whether the related basis content still holds.

## Boundaries

**This article discusses the underlying version relationship.**

Versioning the grounding part with the execution part means they share a version boundary.

**How the grounding part is organized and governed is outside the scope of this article.**

File formats, directory structures, review workflows, update mechanisms, and deprecation rules belong to later design work.

**Access entry points are also not defined here.**

The repository provides the underlying version boundary; external systems can provide access, review, and update entry points according to project needs.

**Process materials are not project truth and should not be maintained as project truth.**

Process materials record discussion, judgment, and decision-making processes; common forms include meeting notes, research materials, issues, PRs, ADRs, and AI conversations.

**This principle applies to projects whose execution part is already reliably managed in a repository and that require long-term iteration.**

A one-off prototype exploration may initially rely on conversation context, temporary materials, and immediate judgment. When the project enters continuous maintenance, the grounding part needs to be versioned with the execution part.

## Objections

**Will the repository become a pile of materials?**

This risk comes from losing the entry standard. Content that enters the repository must already belong to the grounding part that the current project actually follows. Research, discussion, and process records can remain in their existing workflows. Only content that the project actually follows and that will affect later iteration judgments and results needs to be versioned with the execution part.

The grounding part stores only content that the execution part cannot reliably carry. Rules, structures, and verification methods already expressed clearly by the execution part should remain in the execution part. Invalidated basis content should be updated or deleted with changes.

**Do external systems lose their value?**

External systems still have value. They are good at collecting information, organizing discussion, presenting views, initiating changes, and carrying workflows. Their limitation is the version boundary. After content becomes something the project actually follows, if it remains outside the execution part for a long time, it gradually loses its stable correspondence with the current execution version.

External systems can continue to serve collaboration and access, while the grounding part is versioned with the execution part. This preserves the usability of higher-level tools while keeping the content the current project actually follows traceable, reviewable, and recoverable through rollback.

**Will versioning the grounding part with the execution part increase maintenance burden?**

It adds explicit maintenance work, but reduces hidden understanding costs. When the grounding part stays outside, maintainers still need to judge which materials are valid, which rules are outdated, and which constraints still apply. Those judgments are simply scattered across communication, search, and context stitching. The explicit maintenance work is a one-time investment; the scattered hidden judgments are paid again in every iteration, and keep accumulating as iterations continue.

After the grounding part is versioned with the execution part, the maintenance burden enters the normal change flow. When changing the execution part, maintainers can also check whether the related basis content needs updating. When reviewing changes, they can also confirm whether the related basis content and the execution result remain consistent.

## Conclusion

The grounding part must be versioned with the execution part. Project truth consists of the execution part and the grounding part. This article discusses their version relationship: the grounding part needs to share a version boundary with the execution part.

The core judgment is that it should be possible to review, trace, roll back, and maintain the content the current project actually follows together with the current result.

This lets people, AI, and tools judge whether basis content is valid on the same current version, and maintain basis content and the execution result together through changes.
