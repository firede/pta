---
title: Project Truth Must Enter the Codebase
description: In software projects where coding agents participate in long-term iteration, project truth must enter the codebase and share a version boundary with the implementation.
dependsOn:
  - argument/what-is-project-truth
sourceHash: d8347e8f2ce954bbe3599dcaec3394ff703a71d76aa1c6c3c3e223669710968e
---

In software projects where coding agents participate in long-term iteration, project truth must enter the codebase and share a version boundary with the implementation.

This article follows the definition in [What Is Project Truth](/en/argument/what-is-project-truth/): project truth is the content that the current project actually follows. Part of it exists in the code implementation, and another part is supplemented by natural language, glossaries, decision records, and necessary historical memory.

The portion expressed in code is already in the codebase. When this article says "enter the codebase," it focuses on the portion of project truth that needs to be supplemented by natural language, glossaries, decision records, and necessary historical memory; those materials should also live in the same versioned space as the code implementation.

## Background

Traditional collaboration between product and engineering separates requirements from implementation. Product teams deliver requirements through PRDs, specs, issues, and similar forms; engineers then turn these descriptions into code. This model mainly serves asynchronous collaboration among people: different roles, different tools, and different delivery boundaries need an artifact that can be handed off, reviewed, and scheduled.

This separation comes from the structure of organizational collaboration. It does not imply that requirement materials and implementation must remain in separate versioned spaces over the long term. Once coding agents participate in implementation, the distance between requirement clarification and code changes becomes significantly shorter. In many cases, once the requirement is clearly defined, the constraints are clarified, and the context is filled in, the implementation can be generated quickly.

The value of requirement materials lies in constraining and guiding implementation. Long-term iteration requires the content that the current project actually follows to be kept in the same version system as the implementation, so that it is not left in external documents, human memory, meeting notes, or expired issues.

## Rationale

Project truth that code does not express, that is difficult for code to express, or that is easy to misread creates a continuous translation cost when it remains outside the codebase.

Traditional PRDs, specs, and issues often first extract context from the existing project state, then add background, feature descriptions, change notes, and acceptance criteria. This step translates code implementation, product state, and business judgment into documents. After developers or agents receive these materials, they still need to map the documents back to the codebase and judge which models, interfaces, pages, flows, boundary conditions, and tests they correspond to. The same project truth therefore goes through a round-trip translation from code to document and then from document back to code.

Every translation brings information loss, bias introduced by retelling, version drift, and missing context. In a mode dominated by human collaboration, organizational process can absorb this cost. Once agents participate in implementation, these translations continuously block code changes. Agents mainly work inside the codebase; actual changes ultimately appear as code diffs and are verified through tests, builds, and deployments. Once project truth that code does not express, that is difficult for code to express, or that is easy to misread remains in another versioned space, every agent change depends on user restatement, temporary lookup, or stitching together additional context.

After project truth enters the codebase, this round-trip translation across versioned spaces is eliminated. Code implementation continues to express the runnable part of project truth; natural language, glossaries, decision records, and necessary historical memory supplement, within the same version boundary, the parts that code does not express, that are difficult for code to express, or that are easy to misread. Once the two parts are maintained together, changes can happen directly in the version system where the implementation lives, without first producing an external document and then translating that document back into code changes.

External knowledge bases are still valuable. They are suitable for reading, discussion, presentation, and material collection. Their weakness lies in the version boundary: they do not share commit history, review process, rollback boundary, and change context with code. For long-term iteration, if the content that the current project actually follows does not evolve with the implementation, it will gradually become unreliable out-of-band information.

## Boundaries

What enters the codebase is content that has already become project truth; the processes that produce this content can remain in their own suitable workflows.

Team meetings, user feedback, product discussions, multi-turn clarification with coding agents, and pull requests triggered automatically by feedback can all produce project truth. These processes themselves do not need to enter the codebase in their original form. Only content that has been clarified, compressed, and confirmed, and has become content that the current project actually follows, needs to be captured as the current version's business state, domain constraints, real-world conditions, commercial constraints, product semantics, stable terminology, decision outcomes, and key reasons for change.

This model mainly applies to software projects that need long-term iteration. Long-term iteration needs a stable, traceable, and reusable current basis. A one-off prototype exploration aims to build quickly, see quickly, and receive feedback quickly. In that case, project truth can temporarily exist in conversation context, temporary materials, and immediate judgment; capturing it in the codebase too early can slow down exploration.

The placement of project truth in the codebase is a foundational structural judgment. How the upper layers access, audit, modify, and publish this truth belongs to application-layer design. Product, design, business, and engineering roles do not all have to face Git or a code editor directly. GUIs, conversational agents, requirements systems, and automated workflows can all serve as entry points for auditing, checking, and updating project truth.

When deciding where project truth should live, first look at how the product is defined, implemented, verified, and iterated, then look at which entry points different people, agents, and tools should use to create value.

## Objections

**Will the codebase become a dumping ground for product materials?**

This risk comes from a breakdown in entry standards. If every product-related material is put into the repository, the codebase will inevitably become unmanageable.

This article uses a narrower entry standard: content should enter the codebase only after it has become something that the current project actually follows. User research, market research, and business analysis can remain as inputs in separate projects. Only when the conclusions from these materials have been transformed into product behavior, permission rules, domain models, real-world constraints, commercial constraints, deployment limits, stable terminology, or solution tradeoffs do they need to be versioned with the implementation.

**Are PRDs, specs, and issues therefore rejected?**

No. PRDs, specs, and issues remain valid as names and forms. The problem comes from the traditional usage that places them between requirements and implementation and gives them the role of final basis.

In the agent era, they can continue to exist as higher-level wrappers: discussion entry points, task orchestration, audit interfaces, change requests, or historical records. The project truth that should enter the codebase needs to go through clarification, compression, confirmation, and transformation.

## Conclusion

In projects where coding agents participate in long-term iteration, project truth that code does not express, that is difficult for code to express, or that is easy to misread can no longer remain outside the version system where the implementation lives. Requirements and implementation serve the same goal; coding agents shorten the distance from clarification to change, and also make the cost of traditional separation more visible.

Project truth must enter the codebase because the content that the current project actually follows needs to share the same version boundary as the implementation. This lets people, agents, and tools work from the same current basis and reduces the need to carry context back and forth between external materials and code changes.

This article only establishes the position and version relationship. It does not cover the specific forms, audit process, update mechanism, or the ways project truth, after entering the codebase, coordinates with tests, types, configuration, documentation, and agent workflows.
