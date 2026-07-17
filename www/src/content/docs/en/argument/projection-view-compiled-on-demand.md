---
title: Projection Views Should Be Compiled on Demand
description: A projection view is a compiled artifact of truth and implementation. It should be generated on demand for usage contexts rather than maintained as an external knowledge base; projections are read-only, and corrections land on the sources before the projection is regenerated.
dependsOn:
  - argument/what-is-project-truth
  - argument/truth-record-versioned-with-implementation
  - argument/project-truth-by-domain
sourceHash: 94e8693c0f364fdaa2f592dbe70789ae03c349fd932feda05b2257fd00e28a54
---

Projection views should be compiled on demand. A projection view targets a specific usage context and extracts, reorganizes, and presents content from project truth and the implementation. Its relationship to its sources resembles the relationship between build artifacts and source code: it is generated from the current sources when needed, can be cached and distributed, and can be discarded and rebuilt at any time.

Projection views are read-only. When content in a projection needs correction, the correction should land on the sources — a judgment's deviation lands on the truth record, an implementation defect lands on the implementation — and the projection should then be regenerated.

> This article builds on the definition of projection views as consumption results in [What Is Project Truth](/en/argument/what-is-project-truth/), and discusses how projection views should be produced and maintained.

## Background

A project serves many usage contexts. Taking on a new task calls for a digest of the relevant background, new members need an onboarding tour, audits need a cross-domain view of rules, and related projects may need background knowledge about one of this project's domains. These contexts require different ways of extracting and presenting content.

A common practice is to build an external knowledge base for the project: organizing project content into a separately maintained set of parallel materials for people and AI to query. As LLMs sharply reduced the cost of this organizing work, the practice spread further, and such knowledge bases can now be generated and continuously maintained by AI[^llm-wiki].

[^llm-wiki]: The representative practice is the LLM Wiki: an interlinked knowledge base generated and continuously maintained by an LLM from source materials. See Andrej Karpathy's proposal and the practical feedback in its comments: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f

The difficulty with external knowledge bases is synchronization. The knowledge base and the project do not share a version boundary, so staying in sync depends on extra maintenance work. The faster the project iterates, the more visible the lag and drift become. In reports from real use, silent staleness caused by under-updated cross-references is listed as the primary problem of such systems, and concurrent maintenance by multiple people lacks coordination mechanisms.

The central question is therefore: should presentations aimed at usage contexts exist as parallel materials that require continuous synchronization, or as consumption results that can be regenerated from the sources at any time?

## Rationale

**Truth and implementation are the only sources; projection views are compiled artifacts.**

Project truth carries the judgments currently followed, and the implementation carries the current behavior and state; together they already contain everything a projection needs. A projection view adds no truth; it only changes the presentation, extracting and reorganizing content that already exists in the sources for a usage context. This relationship mirrors that of source code and build artifacts: build artifacts can be cached, distributed, and discarded; when change is needed, the source is modified and the artifact rebuilt.

Treating projection views as compiled artifacts means every presentation consumed by people and AI can be traced to some version of the sources. Whether a presentation can be trusted comes down to whether the source is trustworthy and whether the version is current — both questions have definite answers.

**On-demand compilation turns a synchronization problem into a generation problem.**

A parallel knowledge base has to chase the project's state after every change. The chasing work misses things, runs late, and makes mistakes, and whatever it misses stays in the knowledge base as stale content that keeps being consumed.

On-demand compilation removes the chase. A projection is generated from the current sources at the moment it is consumed, so there is no stale state to catch up with, and contexts that are never consumed incur no maintenance cost. The cost structure of synchronization changes accordingly: a parallel knowledge base's cost grows with change frequency and is paid whether or not the content is ever consumed; on-demand compilation's cost grows with consumption frequency and, with caching, is paid once per version.

**Version boundaries make cache invalidation decidable.**

On-demand compilation does not rule out caching. Once the truth record is versioned with the implementation, the sources have a definite version identifier, and a projection view can record which version it was compiled from. Whether a cached projection is stale is decided mechanically by the version correspondence, without relying on anyone's feel for how fresh the content is.

Domain organization further narrows the scope of recompilation. When a change touches only certain domains, only the projections that depend on those domains need regeneration, while the remaining caches stay valid. Drift in external knowledge bases is hard to govern precisely because this version correspondence is missing: staleness can only be discovered by people, and catching up can only happen wholesale.

**Read-only projections keep the sources singular.**

While consuming projections, people and AI will find content that needs correction. If the correction lands on the projection, that projection leaves the regenerable state and starts evolving separately from the sources; later consumers face two diverging materials and cannot tell which one to follow.

If the correction lands on the sources, every subsequent projection receives it automatically. This discipline is the same one as not hand-editing build artifacts: problems found in the artifact are fixed at the source. It guarantees that the only objects needing maintenance are truth and the implementation; projections never join them.

## Boundaries

**This article discusses how projection views are produced and maintained, and does not prescribe the compiler's implementation form.**

Generation can be performed by people, scripts, or LLMs, and can happen in local tools, CI, or a standalone service. Interfaces, caching strategies, and incremental granularity belong to later specification design.

**On-demand compilation does not rule out pre-generation.**

Generating commonly used projections ahead of time, at change points or on a schedule, is a performance optimization. As long as the projection can still be regenerated from the sources and its staleness can still be decided by version, pre-generation does not change its identity as a consumption result.

**The read-only rule constrains the correction path; it does not require modifying the sources on the spot where the projection is consumed.**

Problems can first be recorded as process materials, and corrections can enter the sources through the normal change flow. What this article requires is that corrections eventually land on the sources.

**Whether a material is treated as a projection view is judged by whether it can be regenerated from the sources and its usage context.**

Final outputs that require independent authorship and carry independent delivery responsibility are outside the scope of this article.

**Cross-project background requests are usage contexts as well.**

When a related project requests background knowledge about one of this project's domains, what it receives is also a projection compiled from this project's sources. Cross-project mechanisms are not covered in this article.

## Objections

**Generating on every consumption — won't that cost more than maintaining a knowledge base?**

The two approaches have different cost structures. A knowledge base's maintenance cost grows with the project's change frequency and is paid whether or not the content is consumed. On-demand compilation's cost grows with consumption frequency, and with versioned caching, repeated consumption within the same version pays the generation cost once.

The more important difference is the failure mode. The generation cost a knowledge base saves is passed on to consumers in the form of stale content: an outdated presentation looks complete enough to stop people and AI from asking further, yet is wrong enough to skew judgment. On-demand compilation fails as a generation failure, visible on the spot; a knowledge base fails as silent staleness, discovered only after the damage is done.

**Won't the organizing work accumulated in a knowledge base be wasted?**

Organizing results fall into two kinds, each with its own destination. The way of organizing — the structures, templates, and tradeoffs for arranging material for a class of contexts — should settle into compiler configuration and be reused across versions. New conclusions discovered during organizing — a clearer statement of a rule, a constraint not previously made explicit — should flow back into the truth record if the project still follows them.

Neither kind of accumulation depends on keeping the projection itself as a long-term maintained object. What actually gets discarded is only the presentation that can already be regenerated at any time.

**Is read-only too absolute? Editing the generated material directly is faster.**

Faster now, expensive later. The moment a projection is edited, it enters a state that requires manual maintenance, and its divergence from the sources can no longer be decided by version. Allowing exceptions for individual edits forfeits the entire chain of decidability.

The need for fast correction should be met by lowering the cost of going back to the source: making it cheap to change the sources and regenerate the projection. Routing corrections through the sources also routes them through the normal review boundary, rather than scattering them across projection copies.

**Tools that auto-generate project knowledge bases already exist. Are they the external knowledge bases this article argues against?**

The distinction lies in how a tool is operated; identical tool forms do not imply identical operation. When the generated result is operated as an index that can be rebuilt at any version and the source remains the project itself, the tool is a projection compiler in this article's sense. When the generated result requires manual patching, accepts edits that never return to the source, or answers questions about the project on its own authority, it has become a parallel source of truth.

The same tool can slide between the two modes of operation. The criteria this article provides: can the content be regenerated from the sources, and do corrections return to the sources?

## Conclusion

Projection views should be compiled on demand. Truth and implementation are the only sources, and projection views are their compiled artifacts for usage contexts. On-demand generation removes the synchronization burden of parallel knowledge bases, version boundaries make cache staleness decidable, and domain organization allows regeneration to happen locally.

Projection views are read-only. Problems found in a projection are corrected at the sources, and the projection is then regenerated. This discipline keeps the sources singular: the presentation people and AI receive in any usage context can be traced to the current version of the sources.
