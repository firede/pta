---
title: Project Truth Should Be Organized by Domain
description: In the codebase, project truth should be organized by domain; code directories are the preferred form of organization, and external domain declarations supplement domain boundaries that directories cannot express.
dependsOn:
  - argument/what-is-project-truth
  - argument/project-truth-in-codebase
sourceHash: 1df0cedcf221850e031d93c705bc7645725b9c5024a7de3c22227d1bd2b2f971
---

This article builds on the position in [Project Truth Must Enter the Codebase](/en/argument/project-truth-in-codebase/): project truth that code does not express, that is difficult for code to express, or that is easy to misread should also share a version boundary with the implementation. This article refers to this portion of project truth as non-code project truth, and further discusses how it should be organized in the codebase.

Project truth should be organized by domain. A domain is the organizational unit of project truth. It organizes, within one scope, the code implementation, terms, constraints, rules, decision records, and necessary historical memory that need to be understood, changed, reviewed, and continuously maintained together; this content collectively forms the currently effective project truth of that domain.

The preferred form of domain organization is a directory structure close to the implementation. Directories not only provide a location for content; they also form a layered background through hierarchy: upper-level domains capture project truth that holds across a larger scope, while lower-level domains capture more specific project truth within their own domain scope. Well-defined domain boundaries in the codebase make project truth easier to discover, understand, review, and maintain in sync. When code directories cannot express domain boundaries, external domain declarations can define the domain scope.

## Background

Organizing project truth in the codebase also requires answering how it is placed, how it is discovered, and how it is maintained. Existing code expresses the runnable part of project truth; natural language, glossaries, decision records, and necessary historical memory supplement the parts that code cannot express, that are difficult for code to express, or that are easy to misread. This non-code project truth needs a stable relationship with the corresponding implementation.

Without an organizing approach, non-code project truth will degrade into an accumulation of materials even if it shares a version boundary with code. People and agents need to know which part of the implementation each truth applies to, which background should be checked when modifying code, and which non-code project truth should be updated together when reviewing changes.

Therefore, project truth also needs an organizing approach that stays close to the boundaries by which the project is understood and changed.

## Rationale

Project truth should be organized by domain because a domain is the unit that needs shared background when understanding and changing a project.

Domain boundaries come from stable understanding and maintenance boundaries in the project. They may come from business capabilities, or from technical architecture, component systems, infrastructure, or implementation boundaries. The criterion is whether these contents need to be understood, changed, reviewed, and continuously maintained together.

When domain boundaries align with code directory boundaries, the domain's non-code project truth should be placed beside the domain implementation. This placement has low cognitive overhead and makes the content easier to discover. When developers or agents enter a directory to handle a problem, they can directly see the currently effective terms, constraints, rules, decision records, and necessary historical memory of that domain; the reading, modification, and review of project truth can also follow code changes within the same version boundary.

Directory structures also create a layered background. Upper-level domains capture project truth that holds across a larger scope, while lower-level domains capture more specific project truth within their own domain scope. This layered background comes from the natural structure of the code implementation. It presents concerns at different levels without creating mandatory override rules. It lets local truth be understood within the larger implementation and domain background, reducing the cost of repeatedly explaining context.

Well-defined domain boundaries in code significantly reduce the implementation cost of a project truth architecture. When the existing code structure can express domain boundaries, that structure should be reused first. Keeping non-code project truth close to the domain implementation makes it easier for project truth to remain currently effective and to be maintained in sync during changes.

## Boundaries

When project truth is organized by domain, directories are the most common and natural carrier of domain boundaries. Whether a directory forms a domain unit needs to be defined through a conventional entry point. This entry point lets people and agents determine whether the directory carries non-code project truth, and which domain scope that truth applies to.

Not all domains naturally correspond to directories. Some code structures express domains through file sets, for example when multiple modules are mixed in the same directory. In this case, external domain declarations can define the domain scope and bind non-code project truth back to the corresponding paths and explicit file lists. The domain unit is still established by domain; paths and file ranges are only how it is located in the codebase.

File-range domains should keep their boundaries enumerable, reviewable, and maintainable over time. Explicit file lists are the expressive limit for this kind of domain. If a domain needs complex rules such as include, exclude, or glob to describe it, that means its complexity has exceeded what a discrete file set is suited to carry, and the project should consider reorganizing it into a clearer domain unit through directory structure.

A file-range domain is a final domain unit. It does not rely on directory hierarchy to provide lower-level space, and it does not generate further lower-level domain relationships. Further splitting subdomains inside the file set weakens the intuitiveness and maintainability of the boundary.

Organizing project truth by domain does not require a project to immediately rearrange its existing code structure just to record project truth, but clear domain boundaries in the codebase are a better foundation for implementing a project truth architecture. When the existing structure cannot sufficiently express domain boundaries, external domain declarations can supplement them. When a domain can only be defined through complex file rules over a long period, it usually indicates that the domain abstraction in the code structure is insufficient.

## Objections

**Domain knowledge is structured more like a graph, so why not use a knowledge graph?**

Domains do form graph-like relationships. One domain may depend on terms from another domain, call another domain's interfaces, be affected by another domain's business rules, or share a piece of historical background with multiple domains.

Knowledge graphs are suited to knowledge scenarios with many relationships, many relationship types, and a need for programmatic exploration, such as search, recommendation, large enterprise knowledge management, and cross-system knowledge analysis. The main scenario for project truth is more specific: it serves understanding, modification, review, and continuous iteration within one codebase. This scenario already has directories, file paths, code dependencies, glossaries, links, and full-text search as infrastructure, and relationships between domains can usually be discovered through these signals.

The primary maintenance structure of project truth should prioritize the codebase's native structure. Placing non-code project truth near the domain implementation lets discovery, reading, modification, and review happen in the same workflow. A knowledge graph introduces another relationship-modeling and maintenance interface, and at the codebase level its cost is usually higher than its benefit.

Knowledge graphs can be used to generate projection views. They can extract, reorganize, and present relationships from project truth for cross-domain search, relationship browsing, audit, or analysis. Project truth itself serves as the current basis; graph-like structures are better suited as projection views generated from project truth.

**What if some domains are not naturally divided by directory?**

The organizational unit of project truth is the domain; the directory is only one natural form of domain boundary.

When code directories already express domain boundaries, project truth should be placed close to those directories. When domain boundaries are scattered across multiple files in the same directory, external domain declarations can define the domain and bind it to the corresponding implementation through paths and explicit file lists.

This approach preserves the principle of domain organization and avoids mistaking directories for the only organizational form. External domain declarations supplement domain boundaries that the code structure does not express clearly. They are suitable for a small number of clear, enumerable file ranges. When a boundary is complex enough to require a rule system to maintain, the better direction is to improve the domain abstraction in the code structure.

**How is this domain different from a domain in DDD?**

In this article, a domain is used to organize project truth. To judge whether a scope forms a domain, look at whether the code implementation and non-code project truth within it need to be understood, changed, reviewed, and continuously maintained together.

In DDD, domains serve business modeling and system design, focusing on business problems, modeling language, bounded contexts, and implementation boundaries. Domains in this article serve the organization of project truth, so their scope may cover interface layers, application layers, component systems, infrastructure, or other technical structures beyond the DDD context.

If a project uses DDD, the business boundaries it forms can become an important basis for dividing project truth domains. This article does not require a project to use DDD, and does not limit domains to business domains in the DDD context.

## Conclusion

In the codebase, project truth should be organized by domain. A domain places the code implementation and non-code project truth that need to be understood, changed, reviewed, and continuously maintained together in the same semantic scope, so that the current basis can be maintained together with the implementation.

Directory structures are the preferred form of domain organization. They have low cognitive overhead, stay close to the implementation, are easy to discover, and can reuse the domain abstractions already formed in the project's technical architecture. When domain boundaries align with directory boundaries, project truth should be placed nearby; when domain boundaries cannot be expressed by directories, external domain declarations can bind them to explicit paths and file ranges.

Organizing project truth by domain preserves the understandability of the codebase's native structure and provides a stable foundation for later compilation, scanning, and projection view generation. Knowledge graphs, cross-domain relationship browsing, and audit analysis can be presented through projection views; domain organization should carry project truth's primary maintenance structure.
