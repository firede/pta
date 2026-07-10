---
title: Integration
description: 'Defines how the architecture connects to the engineering environment: the relationship with existing engineering files such as AGENTS.md, the pta.toml project configuration, the attachment of checkpoints, and the minimum requirements for sharing caches and signals.'
dependsOn:
  - argument/project-truth-freshness-governance
  - argument/projection-view-compiled-on-demand
  - argument/derivable-content-in-tool-layer
sourceHash: 30ac97b0db7efd19950395ebfcd14d9b884b5dfe1ae7f852c457cfac1364030d
---

Integration defines how the architecture plugs into an existing engineering environment: how the truth entry point coexists with ecosystem files, where project-level configuration lives, which facilities checkpoints attach to, and what sharing must satisfy at minimum.

> This specification implements how the checkpoints of [Project Truth Needs Freshness Governance](/en/argument/project-truth-freshness-governance/) land on engineering facilities, and delimits the relationship with ecosystem files according to the critique of parallel truth in [Projection Views Should Be Compiled on Demand](/en/argument/projection-view-compiled-on-demand/). The arguments answer why; this specification answers how.

## Terminology

This specification expresses requirement levels with the following words: **must** — implementations allow no exceptions; **should** — followed by default, and deviation requires an explainable reason; **may** — left to the project's own decision.

## Existing Engineering Files

AGENTS.md and similar engineering instruction files are ecosystem artifacts, governed by their own ecosystem conventions, and are not objects of the project truth architecture.

Tools **must not** treat such files as a source of project truth: the entry point of truth is the domain declaration, and the source stays unique. A project **should** keep judgment content recorded in domain declarations, with engineering instruction files carrying no project truth — carrying it creates ungoverned parallel material that drifts apart from the records.

Migration **may** proceed gradually: content not yet migrated is still consumed by ecosystem tools as usual and does not stop working because of this architecture; the project converges the duplication at its own adoption pace, and engineering instruction files slim down as migration proceeds.

A project **may** place a reference to project truth in engineering instruction files, such as `[Project Truth](./TRUTH.md)`, so that tools and agents not connected to this architecture can discover it by following the link; consumers connected to this architecture obtain truth content through compiled projections, not through engineering instruction files.

## Project Configuration

`pta.toml` sits at the repository root and is the single entry point for project-level integration configuration. `externalRoots` is a reserved field declaring the list of external declaration roots; each item is a directory path in the written form of the identity specification, pointing to one external declaration root:

```toml
externalRoots = ["packages/web/.pta", "packages/client/.pta"]
```

Implementation-defined configuration such as checkpoint attachment and inspection arrangements **may** go into `pta.toml`, and **must** be housed under a namespace distinguished by implementation name, such as `[tool.{name}]`; the top level keeps only the public fields defined by this specification, so implementations never contend for the same field name. An implementation encountering an unrecognized namespace **should** ignore it rather than error, so that multiple tools can coexist in one configuration.

## Checkpoint Attachment

Event-triggered checkpoints attach to existing facilities in the engineering lifecycle — local hooks, code review, continuous integration — adding no separate process; the concrete form of attachment is implementation-defined. Time-triggered points are carried by scheduled tasks, with the period agreed by the project according to how fast its external constraints change.

Enforcement levels are configured per position, with defaults and adjustment following the governance specification; this specification prescribes no level for any position.

## Minimum Requirements for Sharing

When caches and signals are used locally, their form is entirely up to the implementation. When shared across people or tools, participants **must** follow the same version of the identity specification, so that the same content computes to the same identity; they **must** preserve the required information of records — a signal's anchor, category, evidence, and origin, and a disposition's manner and object; the composition and serialization of keys and the carrier format are agreed among the participants.

Shared storage may be a file, a directory, or a service; this specification does not prescribe it. Loss semantics split by object: projection artifacts, confirmation adjudications, and disposition records follow the tool-layer cache, and loss falls back to one round of derivation or adjudication; signals that have entered the loop and not yet reached a disposition **must** be persisted until disposed, regardless of origin — signals raised by events cannot reappear once the event has passed, and losing them is silent dropping. Discoveries that have not entered the loop are tool-internal and free of this constraint. An implementation that recovers by replay **must** restore the original signal's identity and disposition chain rather than produce an unrelated new signal.

## Out of Scope

How candidate revisions and check signals are presented to people is a tool's product design and is not prescribed by this specification. Concrete hook commands and inspection period values are decided by implementations and projects respectively. Cross-project sharing and delivery belong to the domain knowledge package specification.
