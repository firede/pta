---
title: Derivable Content Should Stay in the Tool Layer
description: Project truth records in the repository preserve only non-derivable judgments; derivable content and the process state of checks and adjudications stay in the tool layer, managed with cache semantics — loss only falls back to one round of re-derivation.
dependsOn:
  - argument/what-is-project-truth
  - argument/projection-view-compiled-on-demand
  - argument/project-truth-freshness-governance
sourceHash: 7496d6d86bfdb3caf4c2797cbfa5496dcdb7b047940812b951e7b113217927c9
---

Derivable content should stay in the tool layer. Derivable content is content that machines can re-derive from the truth record and the implementation, such as summaries, display names, type judgments, and reverse dependency relationships. The tool layer is storage outside the repository, managed by the tools that consume and govern project truth.

Staying in the tool layer means being managed with cache semantics: keyed by the content hash of the source, reused while the source is unchanged, invalidated and recomputed when the source changes; the storage can be cleared at any time, at the cost of paying for one round of re-derivation.

> This article builds on the distinction between project truth and derived results in [What Is Project Truth](/en/argument/what-is-project-truth/), and on the framing of compiled artifacts in [Projection Views Should Be Compiled on Demand](/en/argument/projection-view-compiled-on-demand/), to discuss where content outside the repository's records belongs and under what management semantics.

## Background

Once project truth enters the repository and is organized by domain, the design of its record format repeatedly faces the same family of proposals: add identifiers to records for referencing, add type labels for tiered checking, add titles for scanning, add status markers to preserve check results. Each field looks useful on its own; together they push the record toward an ever-widening table.

These fields share a common trait: their content can be re-derived by machines from the record body and the implementation, or they preserve the process state of some check or adjudication. Their usefulness is real; the problem is where they belong — written into the repository, they become part of the project truth record and begin participating in versioning, review, and governance.

With LLMs taking over maintenance and inspection, the need for precomputation is declining at the same time. Information that once required manual pre-organization and annotation can now be re-derived by machines at the point of consumption, at a cost that is manageable and still falling.

The core question is therefore: what is the admission criterion for a piece of content to enter the project truth records in the repository?

## Reasons

**The admission criterion for repository records is the non-derivable judgment.**

Project truth preserves what the current project actually follows, and each of its records carries a judgment that machines cannot re-derive from existing materials. Derivable content is the opposite: it is a processed result of judgments — a summary compresses them, a title restates them, a type classifies them. When processed results are written into the repository, what gets preserved is a snapshot of a derivation at some moment.

Snapshots expire. After the source is updated, the snapshot and the source evolve separately within the same repository, and consumers face two differing materials with no way to decide which governs. This is the same mistake as hand-editing a projection artifact: processed results of truth should point at a single source rather than sit beside it.

**Derivable content in the repository directly enlarges the governance surface.**

Every field that enters the repository must be covered by freshness governance: titles and bodies evolve separately, type labels fall out of step with content, status markers expire with the next change. This kind of drift produces no new judgment — it is purely the desynchronization of precomputation from its source — yet it consumes the check budget of change points and inspections all the same, and ultimately consumes human adjudication.

Kept in the tool layer, desynchronization is handled mechanically by cache invalidation: once the source's content hash changes, the derived result is invalidated and recomputed. The governance surface thus scales with the number of judgments rather than the number of fields.

**Cache semantics make loss affordable.**

The tool layer promises no durability. Its storage can be cleared at any time, and rebuilding costs one round of re-derivation — the baseline cost that would have been paid anyway without a cache. Loss causes only a cost fallback, never a loss of truth. This is the essential difference between tool-layer content and project truth records: once a project truth record is lost, the judgment itself is gone.

**Human adjudication results are managed with cache semantics as well.**

Freshness governance leaves adjudication to people: whether a judgment still holds is answered by the maintainer's intent, which machines cannot derive. But once an adjudication passes, the record remains in the repository, which already expresses the adjudication's conclusion; the remaining check metadata — when it was checked, against which content version — preserves process state and produces no new judgment.

This metadata stays in the tool layer, keyed by the hash of the adjudicated content: while the content is unchanged, the adjudication remains in effect and inspections stop re-escalating the same question; once the content changes, the adjudication is automatically invalidated and the record re-enters the check candidates. The cost of loss is asking a person to adjudicate once more — again a fallback to the baseline. New content produced during adjudication — the reason a rule still holds, a newly discovered boundary — is a genuine judgment and should be written into the record itself through the normal change flow.

## Boundaries

**This article rules on the admission of truth records.**

Which artifacts within the implementation enter the repository — such as build outputs and dependency lockfiles — is settled by the conventions of each engineering ecosystem, and this article does not re-adjudicate them.

**The criterion constrains both a record's structure and its body.**

Restating details the implementation already expresses clearly is likewise writing derivable content into the record; a judgment together with its binding force and reason cannot be derived from the implementation, so recording them explicitly is not restatement. The definition article already distinguishes the two, and this article gives the general form of the same criterion.

**The storage form of the tool layer is not prescribed here.**

A single-maintainer project may use local storage and a team may use a shared service; concrete forms, invalidation rules, and sharing mechanisms belong to the governance and integration specifications.

**Rebuild costs should remain affordable.**

When some piece of tool-layer content is extremely expensive to rebuild, this usually indicates that undeclared judgments are mixed into it; the correct move is to surface those judgments into project truth, not to move the entire processed result into the repository.

## Objections

**Precomputation saves cost at consumption time — why not save it?**

It should be saved — in the tool layer. What this article opposes is writing it into the repository, not caching itself. The tool layer provides reuse all the same: repeated consumption within the same version pays for derivation only once. The difference is the invalidation mechanism: the tool layer determines staleness mechanically by content hash; precomputed results in the repository have no invalidation mechanism, can only be chased by governance, and when the chase falls behind they become parallel material contradicting their source.

**Without identifiers and titles, how do people and machines reference a record?**

The need for referencing is real, and reference names can be derived on the spot: take the first sentence, truncate it, or have an LLM name it, with the result cached by content hash so the reference name is stable while the source is unchanged. When the content changes, the reference name is invalidated with it — which is exactly the correct behavior: the referenced judgment has already changed, and an old name that kept working would be a hazard. Identity is carried by the content itself; a name is merely one of its projections.

**If adjudication records are disposable, how does a team share check progress? What about audits?**

Sharing is a question of storage form: the tool layer can be a service shared by the team, and check progress is shared with it. Audit is another consumption scenario: projects that must retain check evidence long-term can configure durable storage and export for the tool layer according to their compliance requirements, with retention policy belonging to the project's governance conventions. Neither changes the identity of these records — they are still not project truth, do not enter the repository, and play no part in truth judgments.

**Could repeated adjudication of the same record, after cache loss, wear people out?**

What cache semantics promise is a floor at the baseline cost: the worst case equals what would have been paid without the mechanism. The repetition worth attention is a different one: the cache is intact, yet the same record keeps being flagged by inspections and keeps being confirmed by people. That pattern points at the record itself — its wording keeps making the machine uneasy, and the wording should be revised rather than adjudications accumulated.

## Conclusion

Project truth records in the repository preserve only non-derivable judgments. Derivable content and the process state of checks and adjudications stay in the tool layer, managed with cache semantics: keyed by content hash, invalidated when the source changes, with loss falling back only to the baseline cost of one round of derivation or adjudication.

This principle pins the governance surface to the number of judgments. Records carry no processed results that would need their own freshness upkeep, the budgets of change points and inspections are spent on the judgments themselves, and human adjudication is spent on genuine tradeoffs. Project truth thereby keeps its minimal record form, while every presentation consumption needs can be derived by the tool layer at any time.
