---
title: Compilation
description: 'Defines how projection views are compiled on demand from project truth: the inputs and sources of compilation, the traceability obligation of projections and when it triggers, the read-only and return-to-source discipline, and the key and invalidation of the projection cache.'
dependsOn:
  - argument/projection-view-compiled-on-demand
  - argument/project-truth-by-domain
  - argument/derivable-content-in-tool-layer
sourceHash: fac2764ec436d22a4bcd423e0c93b30f68650b0610abf085c82cb96c670eed6d
---

Compilation defines how projection views are produced: what the inputs are, what obligations a projection carries, and how the cache is invalidated.

> This specification implements the production discipline of [Projection Views Should Be Compiled on Demand](/en/argument/projection-view-compiled-on-demand/), and manages projection artifacts with the cache semantics of [Derivable Content Should Stay in the Tool Layer](/en/argument/derivable-content-in-tool-layer/). The arguments answer why; this specification answers how.

## Terminology

This specification expresses requirement levels with the following words: **must** — implementations allow no exceptions; **should** — followed by default, and deviation requires an explainable reason; **may** — left to the project's own decision. Negative forms correspond to the levels: **must not** is the must-level prohibition, and **should not** is the should-level prohibition.

## Compilation Inputs

The input to compilation is project truth in some state, plus a usage context. The state is usually a version in the repository; it can also be a working tree containing uncommitted changes.

Sources may be the grounding part, the execution part, or both, and are not required to be covered by any domain: an explanation obtained by asking ad-hoc questions against a piece of code is as much a projection view as a tour generated from domain declarations.

The expression and origin of a usage context are open: tool built-in configuration, team-shared compilation configuration, and ad-hoc prompts can all carry the context. Where configuration is stored follows engineering-ecosystem conventions, and this specification does not adjudicate it. Configuration is not project truth: iteration does not depend on it, and losing it only re-pays one round of organizing cost. A tradeoff in configuration that carries decision weight enters `TRUTH.md` as a judgment entry, with the configuration merely implementing it.

## Traceability Obligation

A projection view is a compiled artifact and adds no truth; every retained projection can answer what it was compiled from.

The obligation attaches at the moment a projection leaves the site of generation: when a projection is cached, retained, bookmarked, or distributed, it **must** carry identification sufficient to decide its sources and whether it is stale; a projection generated on the spot, consumed on the spot, and discarded carries no obligation. The identification decides the correspondence between the projection and its sources; whether the source records themselves are still true is maintained by governance, and the identification makes no such guarantee.

Identification is content-addressed. When the sources are committed state, a version identifier expresses it; when uncommitted content is involved, the base version is attached together with hashes of the content involved — such identification can verify source consistency but does not guarantee the sources can be rebuilt, which is how a recipient knows the projection came from uncommitted state.

A retained projection **should** record its source scope — domains, paths, or entries — for partial invalidation and partial recompilation. With only a version identifier, any change makes the projection count as stale: the decision remains mechanical, at the cost of cache efficiency.

## Read-Only and Return to Source

Projections are read-only and **must not** accept corrections that do not return to the source. Returning to the source splits by cause: when the projection disagrees with its sources — omissions, alterations, or claims absent from the sources — fix the compiler or the usage context; when the sources themselves are no longer true, fix project truth. Both paths regenerate the projection after the correction. A projection **must not** enter the repository, an existing provision of the domain declaration specification.

When a suspected deviation found while consuming a projection can be anchored to a project truth record, a check signal is submitted per the governance specification; discovery is decoupled from repair, and consumption is not interrupted. A discovery that cannot be anchored to a record does not constitute a check signal and is not disposed of through the governance loop: implementation defects are fixed in the execution part, and whether a new judgment enters the records is decided by the admission criteria of the content structure specification.

## Projection Cache

Projection artifacts are derivable content, managed as tool-layer cache. Every input that affects the artifact enters the key: the usage context, the source content, and the identity of the transformation implementation — after a compiler or model change, old artifacts no longer hit. Repeated consumption under the same inputs pays the generation cost once; when sources change, the cache is invalidated and recompiled. Domain organization makes invalidation locally decidable: when a change touches only certain domains, only the projections whose source scope covers those domains need recompilation.

The cache is stored outside the repository, and loss only re-pays one round of generation cost; the form and mechanics of sharing are defined by the integration specification.

## Pre-generation

Generating commonly used projections ahead of time, at change points or on a schedule, is a performance optimization and **may** be adopted. As long as the projection can still be regenerated from project truth and its staleness is still decided by source identification, pre-generation does not change its identity as a derived result.

## Surfacing Freshness

The value of compilation rests on records being true. When a source entry carries undisposed check signals, the compiler **may** surface a notice in the projection, letting consumers know the content is in check candidacy; surfacing **must not** block compilation.

Notices are overlaid when the projection is read and enter neither the projection artifact nor the cache key: creating or closing a signal does not change the body of project truth and does not invalidate the projection cache, and the notice state is always fetched live.

## Out of Scope

The implementation form, interfaces, and incremental granularity of compilers, as well as how cross-project background requests are compiled and delivered, are not prescribed by this specification. The carrier formats of source identification and freshness notices, the sharing mechanics of the cache, and the landing of concrete projection targets such as AGENTS.md belong to the integration specification.
