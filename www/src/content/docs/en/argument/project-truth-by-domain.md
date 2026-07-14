---
title: Project Truth Should Be Organized by Domain
description: After truth records enter the repository, they should be organized by domain and kept close to the related implementation; when a truth record cannot be placed in the corresponding domain directory, or when directories cannot express the boundary, an external domain declaration can fill the gap.
dependsOn:
  - argument/what-is-project-truth
  - argument/truth-record-versioned-with-implementation
sourceHash: 3295f022707c56b8e39077f8803c705654e9aeeeb40598d21b537b26baf31793
---

Project truth should be organized by domain. A domain is a stable scope for understanding and maintaining a project. The implementation and truth records within a domain need to be understood, changed, verified, and reviewed together in later iterations.

The basic approach to domain organization is to keep truth records close to the related implementation and reuse the directory boundaries already formed by the implementation. Directories can express both location and scope. Higher-level directories carry broader records, while lower-level directories carry more specific records. When a truth record cannot be placed in the corresponding domain directory, or when directories cannot clearly express domain boundaries, an external domain declaration can fill the gap.

> This article builds on the judgment in [The Truth Record Must Be Versioned with the Implementation](/en/argument/truth-record-versioned-with-implementation/), and discusses only how truth records should be organized after they enter the repository.

## Background

After truth records enter the repository, the version boundary has been handled, but organization still needs to be addressed. A shared repository lets truth records and the implementation be committed, reviewed, rolled back, and traced together, but it does not automatically explain which part of the implementation a judgment applies to.

Without an organizing approach, truth records are merely moved from outside the repository into the repository, and can still become a pile of materials. When people and AI change some part of the implementation, they need to quickly find the related terms, constraints, rules, and tradeoff reasons, and also need to know which records may need to be re-checked with the change.

Therefore, project truth needs to be organized by stable domain boundaries. Domain boundaries place the related implementation and truth records within the same maintenance scope, so truth records can both share a version boundary and explain which scope of the implementation they apply to.

## Rationale

**Domain boundaries come from long-term maintenance scopes.**

Domain boundaries come from stable boundaries for understanding and maintenance in the project. To judge whether a scope can become a domain, the key question is whether the implementation and truth records inside it need the same background, and whether they can be reviewed and evolved as a long-term maintenance unit.

A domain may come from a business capability, or from an architectural layer, component system, infrastructure boundary, or workflow boundary. Its purpose is to serve long-term project understanding and maintenance.

**Truth records should stay close to the related implementation.**

When domain boundaries align with directory boundaries, the domain's truth records should be placed near the related implementation. This organization lets people and AI directly see the currently valid judgments when they enter a scope of the implementation.

After truth records are placed close to the implementation, reading, changing, and reviewing are also more likely to happen within the same version boundary. When a change affects a domain, maintainers can check whether the implementation result and the related judgments are still consistent.

**Directory hierarchy expresses where records apply.**

Directory structure provides not only a location, but also a scope. Higher-level directories are suited to holding judgments that apply across a larger scope, while lower-level directories are suited to holding more specific judgments.

This hierarchy expresses shared background at different scopes without introducing an additional override algorithm. It lets local judgments be understood within a larger project background, reducing the cost of repeatedly explaining context.

**Existing structure should be reused first.**

The way the implementation is organized usually already reflects the project's actual maintenance boundaries. When the existing directory structure can express domain boundaries, that structure should be reused first. When truth records stay close to the related implementation, project truth is easier to keep current and easier to maintain with implementation changes.

When a truth record cannot be placed in the corresponding domain directory, or when the existing structure cannot clearly express domain boundaries, an external domain declaration can make the correspondence between truth records and the implementation explicit. It should not replace clear structure that should exist in the implementation itself.

## Boundaries

**Whether a directory forms a domain unit needs to be made clear by project convention.**

When project truth is organized by domain, directories are the most common way to express domain boundaries; this convention lets people and AI judge whether the directory stores truth records, and what scope those judgments apply to.

**Some domains need an external domain declaration to connect truth records and the implementation.**

An external declaration should point to a directory path first, and declare a limited file list under that directory only when necessary: when it points only to a directory, the directory expresses the domain scope; when it declares a file list, the domain scope is jointly defined by the directory path and the file list.

**A limited file list is the expressive limit of an external declaration.**

A domain defined by a file list should remain small, explicit, and enumerable, and exists as a final domain unit — hierarchy semantics are carried by directories, and a discrete file set provides no lower-level space and produces no lower-level domain relationships. If a domain needs complex rules to describe it, it has exceeded the complexity that a discrete file set is suited to carry; when this persists, it usually indicates insufficient domain abstraction in the implementation, and the fix belongs in the implementation itself.

**Organizing project truth by domain does not require a project to immediately rearrange its existing structure just to record project truth.**

When the existing structure cannot yet sufficiently express domain boundaries, an external domain declaration can fill the gap first.

**This article discusses organization principles and does not define specific file names, directory names, declaration formats, or scanning rules.**

Those belong to later specification work.

## Objections

**Domain relationships are more graph-like, so why not use a knowledge graph?**

Domains do form graph-like relationships. One domain may depend on another domain's terms, interfaces, rules, or tradeoff reasons, and may also share the same background with multiple domains.

Knowledge graphs are suited to knowledge scenarios with many relationships, many relationship types, and a need for programmatic exploration. The main scenario for project truth is more specific: it serves understanding, modification, review, and continuous iteration within one repository. This scenario already has directories, file paths, dependencies, links, and full-text search as infrastructure, and relationships between domains can usually be discovered through these signals.

The primary maintenance structure of project truth should prioritize the repository's native structure. Placing truth records near the related implementation lets discovery, reading, modification, and review happen in the same workflow. A knowledge graph introduces another relationship-modeling and maintenance interface, and at the repository level its cost is usually higher than its benefit.

Knowledge graphs can be used to generate projection views. They can extract, reorganize, and present relationships from project truth for cross-domain search, relationship browsing, audit, or analysis. Project truth itself carries the currently valid judgments; graph-like structures are better suited as projection views generated from project truth.

**Does this tie project truth to directory structure?**

No. The organizational unit of project truth is the domain; the directory is only the most natural form of domain boundary. When directories can express domain boundaries, placing truth records nearby yields the most benefit; when they cannot, an external domain declaration can equally connect truth records with the implementation. The principle of domain organization does not depend on directories as its only form.

**How is this domain different from a domain in DDD?**

In this article, a domain is used to organize project truth. To judge whether a scope forms a domain, look at whether the implementation and truth records inside it need to be understood, changed, reviewed, and continuously maintained together.

In DDD[^ddd], domains serve business modeling and system design, focusing on business problems, model language, bounded contexts, and implementation boundaries. Domains in this article serve the organization of project truth, so their scope may cover interface layers, application layers, component systems, infrastructure, or other maintenance boundaries outside the DDD context.

If a project uses DDD, the business boundaries it forms can become an important basis for dividing project truth domains. This article does not require a project to use DDD, and does not limit domains to business domains in the DDD context.

[^ddd]: DDD is short for Domain-Driven Design.

## Conclusion

Project truth should be organized by domain. A domain places the implementation and truth records that need to be understood, changed, verified, and reviewed together within the same maintenance scope, allowing related judgments to be maintained with implementation changes.

Directory structure is the preferred form of domain organization because it stays close to the implementation, is easy to discover, and can reuse the maintenance boundaries already formed in the project. When a truth record cannot be placed in the corresponding domain directory, or when the domain boundary cannot be clearly expressed by directories, an external domain declaration can connect truth records with the implementation.
