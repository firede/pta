---
title: Project Truth Should Be Organized by Domain
description: After the reference basis enters the repository, it should be organized by domain and kept close to the related execution part; when the reference basis cannot be placed in the corresponding domain directory, or when directories cannot express the boundary, an external domain declaration can fill the gap.
dependsOn:
  - argument/what-is-project-truth
  - argument/reference-basis-versioned-with-execution-part
sourceHash: b23184bc1621035fae2b7dba8864212f37d3dea311fbc0051fc9b6e639be6179
---

Project truth should be organized by domain. A domain is a stable scope for understanding and maintaining a project. The execution part and the reference basis within a domain need to be understood, changed, verified, and reviewed together in later iterations.

The basic approach to domain organization is to keep the reference basis close to the related execution part and reuse the directory boundaries already formed by the execution part. Directories can express both location and scope. Higher-level directories carry broader basis content, while lower-level directories carry more specific basis content. When the reference basis cannot be placed in the corresponding domain directory, or when directories cannot clearly express domain boundaries, an external domain declaration can fill the gap.

> This article builds on the judgment in [Reference Basis Must Share Execution Version Boundaries](/en/argument/reference-basis-versioned-with-execution-part/), and discusses only how the reference basis should be organized after it enters the repository.

## Background

After the reference basis enters the repository, the version boundary has been handled, but organization still needs to be addressed. A shared repository lets the reference basis and the execution part be committed, reviewed, rolled back, and traced together, but it does not automatically explain which part of the execution content an item in the reference basis applies to.

Without an organizing approach, the reference basis is merely moved from outside the repository into the repository, and can still become a pile of materials. When people and AI change some part of the execution content, they need to quickly find the related terms, constraints, rules, and necessary historical reasons, and also need to know which parts of the reference basis may need to be updated with the change.

Therefore, project truth needs to be organized by stable domain boundaries. Domain boundaries place the related execution part and reference basis within the same maintenance scope, so the reference basis can both share a version boundary and explain which part of the execution content it applies to.

## Rationale

**Domain boundaries come from long-term maintenance scopes.**

Domain boundaries come from stable boundaries for understanding and maintenance in the project. To judge whether a scope can become a domain, the key question is whether the execution part and the reference basis inside it need the same background, and whether they can be reviewed and evolved as a long-term maintenance unit.

A domain may come from a business capability, or from an architectural layer, component system, infrastructure boundary, or workflow boundary. Its purpose is to serve long-term project understanding and maintenance.

**The reference basis should stay close to the related execution part.**

When domain boundaries align with directory boundaries, the reference basis for that domain should be placed near the related execution part. This organization lets people and AI directly see the currently valid basis when they enter an execution scope.

After the reference basis is placed close to the execution part, reading, changing, and reviewing are also more likely to happen within the same version boundary. When a change affects a domain, maintainers can check both whether the execution result and the current basis are still consistent.

**Directory hierarchy expresses where basis content applies.**

Directory structure provides not only a location, but also a scope. Higher-level directories are suited to holding basis content that applies across a larger scope, while lower-level directories are suited to holding more specific basis content.

This hierarchy expresses shared background at different scopes without introducing an additional override algorithm. It lets local content in the reference basis be understood within a larger project background, reducing the cost of repeatedly explaining context.

**Existing structure should be reused first.**

The way the execution part is organized usually already reflects the project's actual maintenance boundaries. When the existing directory structure can express domain boundaries, that structure should be reused first. When the reference basis stays close to the related execution part, project truth is easier to keep current and easier to maintain with execution changes.

When the reference basis cannot be placed in the corresponding domain directory, or when the existing structure cannot clearly express domain boundaries, an external domain declaration can make the correspondence between the reference basis and the execution part explicit. It should not replace clear structure that should exist in the execution part itself.

## Boundaries

When project truth is organized by domain, directories are the most common way to express domain boundaries. Whether a directory forms a domain unit needs to be made clear by project convention. This convention lets people and AI judge whether the directory stores reference-basis content, and what scope that content applies to.

Some domains need an external domain declaration to connect the reference basis and the execution part. An external declaration should point to a directory path first. It may point only to a directory, or it may declare a limited file list under that directory. When it points only to a directory, the directory expresses the domain scope. When it also declares a file list, the domain scope is jointly defined by the directory path and the file list.

A domain defined by a file list within a directory should remain small, explicit, and enumerable. A limited file list is the expressive limit for this kind of domain; if a domain needs complex rules to define it, it has exceeded the complexity that a discrete file set is suited to carry.

A domain defined by a file list within a directory should be treated as a final domain unit. It does not rely on the directory hierarchy to provide lower-level space, and does not produce further lower-level domain relationships.

Organizing project truth by domain does not require a project to immediately rearrange its existing structure just to record project truth. When the reference basis cannot be placed in the corresponding domain directory, or when the existing structure cannot sufficiently express domain boundaries, an external domain declaration can fill the gap. When a domain can only be defined through complex file rules over a long period, that usually indicates insufficient domain abstraction in the execution part.

This article discusses organization principles. It does not define specific file names, directory names, declaration formats, or scanning rules. Those belong to later specification work.

## Objections

**Domain relationships are more graph-like, so why not use a knowledge graph?**

Domains do form graph-like relationships. One domain may depend on another domain's terms, interfaces, rules, or historical reasons, and may also share the same background with multiple domains.

Knowledge graphs are suited to knowledge scenarios with many relationships, many relationship types, and a need for programmatic exploration. The main scenario for project truth is more specific: it serves understanding, modification, review, and continuous iteration within one repository. This scenario already has directories, file paths, dependencies, links, and full-text search as infrastructure, and relationships between domains can usually be discovered through these signals.

The primary maintenance structure of project truth should prioritize the repository's native structure. Placing the reference basis near the related execution part lets discovery, reading, modification, and review happen in the same workflow. A knowledge graph introduces another relationship-modeling and maintenance interface, and at the repository level its cost is usually higher than its benefit.

Knowledge graphs can be used to generate projection views. They can extract, reorganize, and present relationships from project truth for cross-domain search, relationship browsing, audit, or analysis. Project truth itself carries the current basis; graph-like structures are better suited as projection views generated from project truth.

**What if some domains cannot be maintained directly by directory?**

The organizational unit of project truth is the domain. The directory is only one natural form of domain boundary.

When a directory already expresses a domain boundary, the reference basis should first be placed near that directory. If the reference basis cannot be placed in the corresponding domain directory, or if the domain involves only a small number of files under that directory, an external domain declaration can connect the reference basis with the corresponding execution part.

This preserves the principle of domain organization and avoids treating directories as the only organizational form. An external declaration should point to a directory path first, and may also declare a limited file list under that directory. When file boundaries are complex enough to require complex rules, the better direction is to improve the domain abstraction in the execution part.

**How is this domain different from a domain in DDD?**

In this article, a domain is used to organize project truth. To judge whether a scope forms a domain, look at whether the execution part and the reference basis inside it need to be understood, changed, reviewed, and continuously maintained together.

In DDD[^ddd], domains serve business modeling and system design, focusing on business problems, model language, bounded contexts, and implementation boundaries. Domains in this article serve the organization of project truth, so their scope may cover interface layers, application layers, component systems, infrastructure, or other maintenance boundaries outside the DDD context.

If a project uses DDD, the business boundaries it forms can become an important basis for dividing project truth domains. This article does not require a project to use DDD, and does not limit domains to business domains in the DDD context.

[^ddd]: DDD is short for Domain-Driven Design.

## Conclusion

Project truth should be organized by domain. A domain places the execution part and the reference basis that need to be understood, changed, verified, and reviewed together within the same maintenance scope, allowing the current basis to be maintained with execution changes.

Directory structure is the preferred form of domain organization because it stays close to the execution part, is easy to discover, and can reuse the maintenance boundaries already formed in the project. When the reference basis cannot be placed in the corresponding domain directory, or when the domain boundary cannot be clearly expressed by directories, an external domain declaration can connect the reference basis with the execution part. The external declaration should point to a directory path first, and declare a limited file list within that directory only when necessary.
