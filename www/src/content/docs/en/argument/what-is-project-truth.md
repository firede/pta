---
title: What Is Project Truth
description: Project truth is the content that the current project actually follows. It is expressed collectively through code, natural language, glossaries, decision records, and other materials, serves the continuous iteration of the project, and provides the basis for generating projection views.
sourceHash: 0fd146db8f2bd3b9e63414b6f6a982cf64f6d25eeb1c429a6a1e0edf538fe3ee
---

Project truth is the content that the current project actually follows. It determines how the project runs now, how it should be understood, what later changes and judgments must reference, and what provides the basis for generating projection views in different task contexts.

Project truth mainly serves the continuous iteration of a project. As long as a project will continue to be understood, changed, explained, audited, or used to generate projection views, it needs a current basis. The user of this basis may be a person or an agent; project truth is meant for understanding and judgment within continuous change.

## Background

The phrase project truth emphasizes current validity. It refers to the core content that the project actually follows in the current version. This content can change across versions, and its scope is limited by what the project adopts and what is currently effective.

Documents, context, and facts point to different problems: documents emphasize the form of expression; context is usually bound to a scenario, more like a slice from a particular task or viewpoint; facts are objective statements about a domain or the real world. Project truth is concerned with what the project actually adopts from these materials, and on what basis it is valid, operates, and evolves.

Therefore, when defining project truth, the central question is: what does the current project actually follow? Which content, once changed, would affect the project's operation, understanding, maintenance, judgment, or projection view generation?

## Rationale

**Part of project truth exists in the code implementation.**

The current implementation already expresses how the product actually runs, how data is organized, how rules are implemented, and how boundaries are handled. Truth already expressed clearly by code can remain in code; there is no need to rewrite the same truth in documentation. Rewriting creates synchronization cost and makes understanding harder.

**Natural language is better suited to supplement what code does not express, is difficult for code to express, or is easy to misread.**

This includes domain knowledge, tacit knowledge, real-world knowledge, business rules, commercial constraints, and actual product tradeoffs that code cannot fully express. For example, certain facts may indeed exist in a domain, but what the project truly needs to record is how it adopts those facts and how it grounds them in product behavior and implementation.

"Humans have permanent teeth and deciduous teeth" is a domain fact; "this system uses FDI notation to record teeth, did not distinguish permanent teeth from deciduous teeth in the early stage, now uniformly records teeth with permanent-tooth numbering, and adds a boolean variable to distinguish permanent teeth from deciduous teeth" is project truth. The former is domain knowledge; the latter is the current system's adopted recording rule and historical tradeoff.

**A stable glossary is also part of project truth.**

A project needs to be understood and changed within the same vocabulary. The role of a glossary is to remove room for ambiguity and reduce confusion caused by synonyms, near-synonyms, industry colloquialisms, and incorrect spellings. In agent coding, this is especially important: an agent builds contextual associations from vocabulary. If a project has no stable glossary, it can easily conflate terms such as "user" and "account," "customer" and "client," or even specialized domain terms such as "diagnosis" and "finding."

The value of unified vocabulary is that it lets people and agents work in the same semantic space.

**Project truth also needs to preserve a small amount of historical memory.**

Historical memory here records the reasons for key changes. The full discussion process can remain in commit history, issues, or external materials. When reading the project in ordinary work, one can first look at the decisions, rules, and tradeoffs that are still currently effective; this content should be reflected directly in the current project truth.

The role of history is to provide low-cost time-dimensional clues when someone needs to ask "why was this changed this way." Git can usually answer what changed, when it changed, and who changed it; historical records in project truth mainly answer why it changed this way. It is therefore suitable for recording the reasons behind key changes in domain strategy, business logic, product tradeoffs, external delivery semantics, important terms, and similar content.

This kind of historical record should be written carefully and handled carefully. After it is written, deletion or compression requires explicit project judgment; a single agent's inability to see its use at the moment is not enough reason to clean it up. Future traceability, audits, projection generation, or external delivery explanations may need precisely these reasons for change.

## Boundaries

**Domain facts can become a source of project truth.**

The facts discussed here are objective statements about a domain or the real world. A fact becomes project truth only when it is adopted by the current project and affects product behavior, business explanation, implementation judgment, terminology, external delivery, or later maintenance.

**Project truth can be expressed through many forms.**

Code, tests, configuration, natural-language documents, glossaries, and decision records can all express project truth. The parts already expressed clearly by code can remain directly in code; documentation mainly supplements what code does not express, is difficult for code to express, or is not suitable for code to carry.

**The scope of project truth is determined by project needs.**

Content held by developers, product managers, designers, domain experts, or business stakeholders can all contribute to project truth. What truly enters project truth is the part that the current project needs to reuse continuously. Its scope may span implementation, domain, business operations, commercial constraints, product concerns, and real-world limitations.

**Projection views are the consumed results of project truth.**

A projection view is for a specific task, an agent execution context, an audit, business understanding, product research, or management review; it extracts, reorganizes, and presents part of project truth. It can be generated, displayed, cached, and passed to agents for use. As long as it can be reproduced from the semantics of project truth, it can usually remain a generated result or cached result.

This article only defines what project truth is. How project truth enters the repository, and how it is reviewed, updated, deprecated, and governed, are outside the scope of this article.

## Objections

**Will project truth become a place where everything gets thrown in?**

This concern is valid. Once project truth lacks governance, it will degrade into an accumulation of materials. Therefore, project truth must have a governance mechanism: entry has standards, changes have review, and it is maintained together with the repository.

The content that enters project truth should be content that the current project actually follows. Content that the current version has stopped adopting should be modified and committed together with project changes, avoiding its continued mixture with the current truth.

**If project truth changes across versions, why call it truth?**

Truth here emphasizes current validity and allows change across versions.

A business rule, term, implementation approach, or product tradeoff may once have been project truth and may be replaced in a new version. This kind of change fits the versioned existence of software projects.

For any version, people and agents should understand, change, and judge the project according to what the project actually follows. The meaning of project truth lies precisely in making explicit the effective core of the current version.

## Conclusion

Project truth is the content that the current project actually follows. Part of it is expressed by code implementation, and another part is supplemented by natural language, glossaries, decision records, and necessary historical memory.

It focuses on how the current project runs, how it is understood, what must be respected in later changes, and where projection views in different task contexts can be generated from. Factual materials can serve as input, and projection views can serve as output; only content adopted by the current project and continuously affecting judgment needs to be captured as project truth.

Only after explaining what project truth is can the project truth architecture have a clear foundation.
