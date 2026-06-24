---
title: What Is Project Truth
description: Project truth is the content the current project actually relies on. It consists of the execution part and the reference basis, supports continuous project iteration, and provides the basis for generating projection views.
sourceHash: ac24d96d495e229503fef049d26bfc4dbf8c429d4bddefa4495698f40b73d2bd
---

Project truth is the content the current project actually relies on. It determines how the project runs now, how it is understood, what later changes and judgments must take into account, and provides the basis for generating projection views in different task contexts.

Project truth primarily serves continuous project iteration. As long as a project will continue to be understood, changed, explained, audited, or used to generate projection views, it needs a current basis. This basis may be used by people or by AI; project truth is meant for understanding and judgment while the project keeps changing.

Project truth consists of the execution part and the reference basis. The execution part is the part of project truth that participates in the current execution flow and determines the current version's result; the reference basis is the part of project truth that does not participate in the current execution flow, but affects later iteration judgments and results.

In a new iteration, the project truth available to people and AI is determined by both the execution part and the reference basis. Both affect later iteration judgments and results; the distinction is whether they are part of the current execution flow: the execution part is, and the reference basis is not.

## Background

The phrase project truth emphasizes current validity. It refers to the content the project actually relies on in the current version. When the version changes, the content actually adopted by the project and still in effect may also change, and project truth changes with it.

In long-lived projects, project-related information is scattered across files, tools, collaboration records, and the context formed during a particular task. Without a clear distinction, project truth can easily expand into all related materials, or shrink into the context needed for one task.

Therefore, when defining project truth, the central question is: what does the current project actually rely on? Which content, once changed, would affect the project's operation, understanding, maintenance, judgment, or projection view generation?

## Rationale

**The execution part carries project truth that has already landed.**

Whether the current version can produce a valid result depends first on the execution part. After the structures, rules, processes, and verification methods adopted by the project enter the execution flow, they directly constrain how results are produced, checked, and delivered. In code projects, this usually takes the form of runnable, verifiable objects in the repository; in other projects, it appears as the objects that actually drive production and verification in their own workflows.

Therefore, the execution part itself carries project truth that has already landed. Later iterations need to treat the execution part as part of the current basis for understanding the project.

**The reference basis supplements the current basis that the execution part cannot reliably carry.**

The reference basis preserves the current basis that later iterations must follow when that basis cannot be reliably carried by the execution part. This basis usually concerns project semantics, real-world constraints, product tradeoffs, and necessary historical reasons.

It records rules, constraints, tradeoffs, and necessary reasons that the project has adopted and that will continue to affect iteration.

Details already expressed clearly by the execution part are not duplicated in the reference basis.

**A stable glossary is also part of project truth.**

A project needs to be understood and changed within the same vocabulary. The role of a glossary is to reduce ambiguity caused by synonyms, near-synonyms, industry colloquialisms, and incorrect spellings. When AI handles project-level tasks, this is especially important: AI builds contextual associations from vocabulary. If a project has no stable glossary, the same object may be written as "account" or "user account" across code, interfaces, and explanations; in business contexts, "lead" and "customer" may also be conflated, though they usually correspond to different lifecycle stages and process rules.

The value of unified vocabulary is that it lets people and AI work in the same semantic space.

**The reference basis needs to preserve a small number of necessary historical reasons.**

Some current rules cannot be fully understood from the current state alone; the reasons behind key changes also matter. Necessary historical reasons explain changes that still affect later judgments: why a rule was kept, why a constraint exists, and why a tradeoff holds.

It preserves only the reasons that can guide later iterations, not the full discussion process. Version history can usually answer what changed and when it changed; historical reasons in project truth answer why the change still matters.

This kind of content needs to be written carefully and deleted carefully. If a single task does not need it right now, that is not enough to show that it has become invalid. Deletion or compression should depend on whether it still affects later understanding and judgment.

## Boundaries

**Project truth is judged by the current reliance relationship.**

To judge whether some content belongs to project truth, the key question is whether it has already become content the current project actually relies on, and whether it affects the current result or later iteration.

**Facts themselves are not project truth.**

Facts are objective statements about specialized knowledge or the real world. Project truth does not list facts themselves; it records how the project relies on these facts to form the current basis. Facts need to enter project truth only when they are adopted by the current project and affect the current result or later iteration.

**Process materials are not project truth.**

Process materials document fact-finding, discussion, and decision-making. Full ADRs, meeting notes, research materials, issue discussions, agent conversations, and user feedback are all process materials; project truth records only the content the current project actually relies on.

**Final outputs are judged by their relationship to later iterations.**

A final output does not automatically become project truth. It should be maintained as project truth only when it continues to affect later versions, quality judgments, or external delivery explanations.

**Context and projection views are derived from project truth.**

Context is a session projection formed from project truth, the task goal, and the current conversation state, used for a specific act of understanding or execution. A projection view targets a specific usage context and extracts, reorganizes, and presents content from project truth. They can be generated, displayed, cached, and passed to AI for use. Content that can be regenerated from project truth and the usage context can usually remain a derived result.

This article only defines what project truth is. How project truth enters the repository, and how it is reviewed, updated, deprecated, and governed, are outside the scope of this article.

## Objections

**Will project truth become a place where everything gets thrown in?**

This risk exists. Project truth contains only the content the current project actually relies on, and that content affects the current result or later iteration. Related materials, process records, and one-off context may all be valuable, but that does not automatically make them project truth.

Content that the current version has stopped adopting should not remain in the current project truth.

**If the execution part already contains business logic, why is the reference basis still needed?**

The reference basis is needed because the execution part cannot reliably carry the entire current basis. Business logic already expressed clearly by the execution part should remain in the execution part. When business semantics, real-world constraints, product tradeoffs, and necessary historical reasons cannot be reliably obtained from the execution part, the reference basis should supplement them.

**Will the reference basis become an accumulation of ADRs and discussion records?**

This risk comes from treating process materials as project truth. ADRs, meeting notes, issue discussions, and agent conversations record discussion and decision-making processes. They are not project truth. The reference basis records only the content the current project actually relies on.

**If project truth changes across versions, why call it truth?**

Truth here emphasizes current validity and allows change across versions.

A business rule, term, implementation approach, or product tradeoff may once have been project truth and may be replaced in a new version. This kind of change fits the versioned existence of long-lived projects.

For any version, people and AI should understand, change, and judge the project according to what the project actually relies on. The value of project truth is that it makes the effective core of the current version explicit.

## Conclusion

Project truth is the content the current project actually relies on, consisting of the execution part and the reference basis. It supports continuous iteration and helps people and AI judge how the current project runs, how it is understood, and what later changes must be based on.

Facts, process materials, final outputs, context, and projection views all need to be distinguished from project truth. Only content adopted by the current project and affecting the current result or later iteration belongs to project truth.

Defining project truth clearly gives project truth architecture a stable foundation.
