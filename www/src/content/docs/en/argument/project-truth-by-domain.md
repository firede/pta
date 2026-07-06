---
title: Project Truth Should Be Organized by Domain
description: After the grounding part enters the repository, it should be organized by domain and kept close to the related execution part; when the grounding part cannot be placed in the corresponding domain directory, or when directories cannot express the boundary, an external domain declaration can fill the gap.
dependsOn:
  - argument/what-is-project-truth
  - argument/grounding-part-versioned-with-execution-part
sourceHash: b371cb6b1c4dbf9c9c563f43af2b123cda5c7a312b9bdb83a02faaaf2bb3144d
---

Project truth should be organized by domain. A domain is a stable scope for understanding and maintaining a project. The execution part and the grounding part within a domain need to be understood, changed, verified, and reviewed together in later iterations.

The basic approach to domain organization is to keep the grounding part close to the related execution part and reuse the directory boundaries already formed by the execution part. Directories can express both location and scope. Higher-level directories carry broader basis content, while lower-level directories carry more specific basis content. When the grounding part cannot be placed in the corresponding domain directory, or when directories cannot clearly express domain boundaries, an external domain declaration can fill the gap.

> This article builds on the judgment in [The Grounding Part Must Be Versioned with the Execution Part](/en/argument/grounding-part-versioned-with-execution-part/), and discusses only how the grounding part should be organized after it enters the repository.

## Background

After the grounding part enters the repository, the version boundary has been handled, but organization still needs to be addressed. A shared repository lets the grounding part and the execution part be committed, reviewed, rolled back, and traced together, but it does not automatically explain which part of the execution content an item in the grounding part applies to.

Without an organizing approach, the grounding part is merely moved from outside the repository into the repository, and can still become a pile of materials. When people and AI change some part of the execution content, they need to quickly find the related terms, constraints, rules, and necessary historical reasons, and also need to know which parts of the grounding part may need to be updated with the change.

Therefore, project truth needs to be organized by stable domain boundaries. Domain boundaries place the related execution part and grounding part within the same maintenance scope, so the grounding part can both share a version boundary and explain which part of the execution content it applies to.

## Rationale

**Domain boundaries come from long-term maintenance scopes.**

Domain boundaries come from stable boundaries for understanding and maintenance in the project. To judge whether a scope can become a domain, the key question is whether the execution part and the grounding part inside it need the same background, and whether they can be reviewed and evolved as a long-term maintenance unit.

A domain may come from a business capability, or from an architectural layer, component system, infrastructure boundary, or workflow boundary. Its purpose is to serve long-term project understanding and maintenance.

**The grounding part should stay close to the related execution part.**

When domain boundaries align with directory boundaries, the grounding part for that domain should be placed near the related execution part. This organization lets people and AI directly see the currently valid basis when they enter an execution scope.

After the grounding part is placed close to the execution part, reading, changing, and reviewing are also more likely to happen within the same version boundary. When a change affects a domain, maintainers can check whether the execution result and the related basis content are still consistent.

**Directory hierarchy expresses where basis content applies.**

Directory structure provides not only a location, but also a scope. Higher-level directories are suited to holding basis content that applies across a larger scope, while lower-level directories are suited to holding more specific basis content.

This hierarchy expresses shared background at different scopes without introducing an additional override algorithm. It lets local content in the grounding part be understood within a larger project background, reducing the cost of repeatedly explaining context.

**Existing structure should be reused first.**

The way the execution part is organized usually already reflects the project's actual maintenance boundaries. When the existing directory structure can express domain boundaries, that structure should be reused first. When the grounding part stays close to the related execution part, project truth is easier to keep current and easier to maintain with execution changes.

When the grounding part cannot be placed in the corresponding domain directory, or when the existing structure cannot clearly express domain boundaries, an external domain declaration can make the correspondence between the grounding part and the execution part explicit. It should not replace clear structure that should exist in the execution part itself.

## Boundaries

When project truth is organized by domain, directories are the most common way to express domain boundaries. Whether a directory forms a domain unit needs to be made clear by project convention. This convention lets people and AI judge whether the directory stores grounding-part content, and what scope that content applies to.

Some domains need an external domain declaration to connect the grounding part and the execution part. An external declaration should point to a directory path first, and declare a limited file list under that directory only when necessary: when it points only to a directory, the directory expresses the domain scope; when it declares a file list, the domain scope is jointly defined by the directory path and the file list.

A limited file list is the expressive limit of an external declaration. A domain defined by a file list should remain small, explicit, and enumerable, and exists as a final domain unit — hierarchy semantics are carried by directories, and a discrete file set provides no lower-level space and produces no lower-level domain relationships. If a domain needs complex rules to describe it, it has exceeded the complexity that a discrete file set is suited to carry; when this persists, it usually indicates insufficient domain abstraction in the execution part, and the fix belongs in the execution part itself.

Organizing project truth by domain does not require a project to immediately rearrange its existing structure just to record project truth. When the existing structure cannot yet sufficiently express domain boundaries, an external domain declaration can fill the gap first.

This article discusses organization principles. It does not define specific file names, directory names, declaration formats, or scanning rules. Those belong to later specification work.

## Objections

**Domain relationships are more graph-like, so why not use a knowledge graph?**

Domains do form graph-like relationships. One domain may depend on another domain's terms, interfaces, rules, or historical reasons, and may also share the same background with multiple domains.

Knowledge graphs are suited to knowledge scenarios with many relationships, many relationship types, and a need for programmatic exploration. The main scenario for project truth is more specific: it serves understanding, modification, review, and continuous iteration within one repository. This scenario already has directories, file paths, dependencies, links, and full-text search as infrastructure, and relationships between domains can usually be discovered through these signals.

The primary maintenance structure of project truth should prioritize the repository's native structure. Placing the grounding part near the related execution part lets discovery, reading, modification, and review happen in the same workflow. A knowledge graph introduces another relationship-modeling and maintenance interface, and at the repository level its cost is usually higher than its benefit.

Knowledge graphs can be used to generate projection views. They can extract, reorganize, and present relationships from project truth for cross-domain search, relationship browsing, audit, or analysis. Project truth itself carries the currently valid basis content; graph-like structures are better suited as projection views generated from project truth.

**Does this tie project truth to directory structure?**

No. The organizational unit of project truth is the domain; the directory is only the most natural form of domain boundary. When directories can express domain boundaries, placing the grounding part nearby yields the most benefit; when they cannot, an external domain declaration can equally connect the grounding part with the execution part. The principle of domain organization does not depend on directories as its only form.

**How is this domain different from a domain in DDD?**

In this article, a domain is used to organize project truth. To judge whether a scope forms a domain, look at whether the execution part and the grounding part inside it need to be understood, changed, reviewed, and continuously maintained together.

In DDD[^ddd], domains serve business modeling and system design, focusing on business problems, model language, bounded contexts, and implementation boundaries. Domains in this article serve the organization of project truth, so their scope may cover interface layers, application layers, component systems, infrastructure, or other maintenance boundaries outside the DDD context.

If a project uses DDD, the business boundaries it forms can become an important basis for dividing project truth domains. This article does not require a project to use DDD, and does not limit domains to business domains in the DDD context.

[^ddd]: DDD is short for Domain-Driven Design.

## Conclusion

Project truth should be organized by domain. A domain places the execution part and the grounding part that need to be understood, changed, verified, and reviewed together within the same maintenance scope, allowing related basis content to be maintained with execution changes.

Directory structure is the preferred form of domain organization because it stays close to the execution part, is easy to discover, and can reuse the maintenance boundaries already formed in the project. When the grounding part cannot be placed in the corresponding domain directory, or when the domain boundary cannot be clearly expressed by directories, an external domain declaration can connect the grounding part with the execution part.
