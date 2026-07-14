---
title: The Truth Record Must Be Versioned with the Implementation
description: In long-lived iterative projects, whenever the implementation is managed in a repository and AI will participate in later maintenance, the truth record must be versioned with the implementation.
dependsOn:
  - argument/what-is-project-truth
sourceHash: bf4e7c42b4bd919ad7f2dd35ee1ee4077c7e70bef43509321e0e0c5237ce8bb2
---

In long-lived iterative projects, whenever the implementation is managed in a repository and AI will participate in later maintenance, the truth record must be versioned with the implementation.

Versioning here means sharing the same version boundary: record changes should be committed, reviewed, rolled back, and traced together with the related implementation changes.

> This article builds on the relationship between the truth record and the implementation in [What Is Project Truth](/en/argument/what-is-project-truth/), and discusses only their version boundary.

## Background

The implementation is usually already managed in a repository and forms the version boundary for the current result. How the current result is produced, verified, and delivered changes as the implementation changes across versions. In different projects, the implementation may take the form of code, engineering files, workflows, or verification materials.

The truth record often lacks a stable version boundary. The project's judgments may remain as tacit knowledge in maintainers' memory, or be scattered across requirements, collaboration, knowledge management, and conversation history. Once these judgments become detached from the implementation, it becomes hard to confirm what the current project actually follows.

When AI participates in later maintenance, the distance between clarifying requirements, adding constraints, and changing the implementation becomes much shorter. Later iterations depend on both the implementation and the truth record. When the truth record lacks a stable version boundary, or does not share a version boundary with the implementation, this detachment affects understanding, modification, verification, and review more quickly.

## Rationale

**A shared version boundary makes the record's validity decidable.**

The truth record constrains the implementation but does not itself enter the execution flow. Whether a judgment is still valid depends on its correspondence with the implementation. Rules, constraints, terms, and tradeoffs must be traceable to the implementation versions they apply to.

After the truth record is versioned with the implementation, a judgment's validity can be decided within the same version boundary. When people and AI understand the project, they do not first need to decide whether external documents still match the current implementation state, nor do they need to piece together version relationships across multiple tools.

**A shared version boundary lets the record be maintained with changes.**

A single iteration may change both the implementation result and the project's judgments. Rule changes, terminology convergence, constraint changes, and added reasons may all require the truth record to be updated in step. Once the two share a version boundary, these changes can be maintained within the same commit, review, and rollback boundary.

This does not require the truth record to track implementation details. The record carries judgments together with their binding force and reasons; the evolution of implementation details is absorbed by reasonable practice, and the record needs updating only when a judgment changes.

**Without a shared version boundary, translation and drift accumulate.**

When the truth record stays outside the implementation, maintainers often first extract context from the implementation state, then write the judgments into external materials. During later changes, they have to map those materials back to the implementation and judge which objects, boundaries, and verification methods they correspond to.

Each round trip introduces information loss, retelling bias, version mismatch, and missing context. In long-term iteration, these problems accumulate into record drift. External materials may look complete, but can no longer reliably explain what the current project actually follows.

**AI participation amplifies location and judgment costs.**

When AI participates in later maintenance, it usually needs to locate, change, and verify results in the repository where the implementation lives. If the truth record stays in another version space, every AI change depends on user retelling, ad hoc search, or extra context assembly. Natural-language records do not have stable mechanisms comparable to code symbol indexes, and version mismatch further reduces the reliability of search and judgment.

Once the truth record lives in the same repository, AI can discover the currently valid judgments directly, and include judgment changes and implementation changes in the same review. Human reviewers can also judge both whether the result is correct and whether the related judgments still hold.

## Boundaries

**This article discusses the underlying version relationship.**

Versioning the truth record with the implementation means they share a version boundary.

**How the truth record is organized and governed is outside the scope of this article.**

File formats, directory structures, review workflows, update mechanisms, and deprecation rules belong to later design work.

**Access entry points are also not defined here.**

The repository provides the underlying version boundary; external systems can provide access, review, and update entry points according to project needs.

**Process materials are not project truth and should not be maintained as project truth.**

Process materials record discussion, judgment, and decision-making processes; common forms include meeting notes, research materials, issues, PRs, ADRs, and AI conversations.

**This principle applies to projects whose implementation is already reliably managed in a repository and that require long-term iteration.**

A one-off prototype exploration may initially rely on conversation context, temporary materials, and immediate judgment. When the project enters continuous maintenance, the truth record needs to be versioned with the implementation.

## Objections

**Will the repository become a pile of materials?**

This risk comes from losing the entry standard. Content that enters the repository must be a judgment the current project actually follows. Research, discussion, and process records can remain in their existing workflows. Only judgments that meet the two conditions of project truth need to be versioned with the implementation.

The truth record stores only the project's judgments: decisions and premises that reasonable practice cannot derive and the project does not accept deviating from. Implementation details and derivable content stay in the implementation and the tool layer. Invalidated judgments should be updated or deleted with changes.

**Do external systems lose their value?**

External systems still have value. They are good at collecting information, organizing discussion, presenting views, initiating changes, and carrying workflows. Their limitation is the version boundary. After content becomes a judgment the project actually follows, if it remains outside the implementation for a long time, it gradually loses its stable correspondence with the current implementation version.

External systems can continue to serve collaboration and access, while the truth record is versioned with the implementation. This preserves the usability of higher-level tools while keeping the judgments the current project actually follows traceable, reviewable, and recoverable through rollback.

**Will versioning the truth record with the implementation increase maintenance burden?**

It adds explicit maintenance work, but reduces hidden understanding costs. When the truth record stays outside, maintainers still need to judge which materials are valid, which rules are outdated, and which constraints still apply. Those judgments are simply scattered across communication, search, and context stitching. The explicit maintenance work is a one-time investment; the scattered hidden judgments are paid again in every iteration, and keep accumulating as iterations continue.

After the truth record is versioned with the implementation, the maintenance burden enters the normal change flow. When changing the implementation, maintainers can also check whether the related judgments need review. When reviewing changes, they can also confirm whether the related judgments and the implementation result remain consistent.

## Conclusion

The truth record must be versioned with the implementation. This article discusses their version relationship: the truth record needs to share a version boundary with the implementation.

The core judgment is that it should be possible to review, trace, roll back, and maintain the judgments the current project actually follows together with the current result.

This lets people, AI, and tools judge whether the record is valid on the same current version, and maintain the record and the implementation together through changes.
