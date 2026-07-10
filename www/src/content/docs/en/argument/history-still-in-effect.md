---
title: History Still in Effect Belongs to Project Truth
description: Project truth emphasizes what is currently in effect, and the present includes history that still takes effect — the reasons for the present state are anchored in past changes, and the consequences of past versions acting on the real world persist into the present. This content cannot be derived from the current snapshot; it must be recorded explicitly as judgments and deleted as its influence fades.
dependsOn:
  - argument/what-is-project-truth
  - argument/project-truth-freshness-governance
  - argument/derivable-content-in-tool-layer
sourceHash: 1e4af9311229d3b31514fd85d46d473925ad362108087601ba73358d7e8f310d
---

History still in effect belongs to project truth. Project truth emphasizes what is currently in effect, but not everything currently in effect originates from the current version: the reasons for some present judgments are anchored in past changes, and the consequences left by past versions acting on the real world may persist into the present. Both kinds of content still influence later iterations, and neither can be read out of the current version's snapshot.

> This article builds on the treatment of necessary historical reasons in [What Is Project Truth](/en/argument/what-is-project-truth/) and gives it its general form; the judgment of expiry follows the drift-and-check framework of [Project Truth Needs Freshness Governance](/en/argument/project-truth-freshness-governance/); the division of labor with the complete change record follows the admission criterion of [Derivable Content Should Stay in the Tool Layer](/en/argument/derivable-content-in-tool-layer/).

## Background

Project truth is bounded by the current version: the execution part determines the current result, the basis part influences later judgments, and truth updates as versions change. This definition fixes its gaze on the present.

But a project does not exist only in the repository. Every released version acts on the real world; after versions change, the behavior disappears from the execution part, while the results it left in the world remain in effect and continue to constrain the project's later judgments.

The current version's snapshot cannot answer questions of this kind. The execution part only describes present behavior; the repository preserves the complete change record but cannot tell which changes left behind things still in effect. The core question is: how does project truth carry content that remains valid along the time dimension?

## Reasons

**The side effects of past versions are present facts.**

Consequences still in effect exist in the present. For example, an early storage model could only express a single tooth position: interproximal caries across two neighboring teeth could not be distinguished in the data from each tooth having its own caries. Later modeling added an adjacent-teeth expression, but the data written before the change can no longer be distinguished retroactively. This limitation appears nowhere in the current execution part, yet it still constrains later judgments — any report involving data from that period must factor it in. Deleting the record would distort those judgments, which is precisely project truth's admission criterion. So the time dimension is not an exception carved out of "currently in effect": the current state of the world already contains the residue of the project's past states, and recording it is what makes "current" complete.

**The distinguishing mark of a consequence is having no anchor in the present state.**

Most records in the basis part hold together around the current execution part: rules explain current behavior, constraints bound the current implementation, and history the execution part still accommodates is carried by the accommodating rules and their reasons. The consequences this article points to lie outside all of that — the historical state that produced them no longer exists, no rule accommodates them, and no position in the current execution chain points to them. Without explicit recording, they exist only in maintainers' memory, rediscovered when some iteration steps on them. AI participation in maintenance amplifies this risk: AI can only read what has been made explicit, and unexpressed history is entirely invisible to it.

**The reasons for the present state are the other half of the same dimension.**

The definition article points out that some current rules cannot be fully understood from the present state alone, and necessary historical reasons need to be kept. Reasons answer why the present is the way it is; consequences answer how the past persists into the present. The two share the same selection criterion — whether they still influence later judgments — and the same way of exiting: deletion once they no longer do. They belong to the same time dimension of awareness and should be argued and governed by the same criterion.

**Selecting from history is a non-derivable judgment.**

The repository preserves every change and answers what changed and when. That record is complete but unadjudicated: which past states still constrain the present can only be judged against the world outside the repository, and no machine can derive it from the sequence of changes. This selection is exactly the non-derivable judgment the admission criterion calls for. Entries carry a time or version clue, providing an entry point into the complete change record: the judgment is recorded explicitly, and the details remain queryable at any time.

**Expiry is driven by the world, and deletion is a governance action.**

The expiry of temporal entries is not triggered by changes inside the repository: a migration completes or a contract ends outside the repository — this is external drift. Patrol checkpoints take on this checking, adjudicating whether the consequence still exists; entries that no longer influence later judgments should be deleted. Deletion keeps the window small and trustworthy — every remaining entry is still in effect, and consumers need not sort out for themselves which items are expired exhibits.

## Boundaries

**This article does not prescribe the carrying form.**

What file carries the content of the time dimension, what it is named, and how entries are written belong to the specification layer. This article only argues that such content belongs to project truth and needs explicit carriage; the carrying form should let its structural feature (a time or version anchor) and its expiry mechanism (world-driven) be expressed.

**It is not a release log.**

A release log faces a release audience, grows by appending, and pursues completeness. The temporal window faces later iterations, keeps selectively, and encourages deletion. The two run in opposite directions in audience, growth mode, and completeness, and cannot substitute for each other.

**Process materials remain excluded.**

How a change was discussed and how a decision took shape belong to process materials. Only settled conclusions enter the temporal window: a consequence still in effect, or a reason that still matters.

**The complete history stays in the repository's change record.**

This article does not ask for history to be duplicated into project truth. The complete sequence of changes is carried by the repository; project truth keeps only the adjudicated results about it.

## Objections

**The repository already records all history — why record separately?**

The change record answers what changed and when; it does not answer which changes left behind things that still constrain the present. The latter depends on the state of the world outside the repository and is an adjudication no machine can derive. The adjudicated results enter project truth, the complete sequence stays in the change record, and the entries' time or version clues connect the two.

**Won't this become an ever-growing running log?**

A running log comes from treating the window as a mirror of the release log. The criterion that controls it is the same as project truth's general criterion: if deleting an entry leaves the judgments of later iterations unaffected, it should not stay in the window. Clearing expired entries is taken on by governance, adjudicated along the way as patrols check external drift. The window's size tracks the history still in effect, not the whole history.

**The consequences live outside the repository — how do the records stay accurate?**

This is precisely the defining scenario of external drift: no event appears inside the repository, so the records' loss of accuracy is checked periodically by patrol checkpoints. This article introduces no new governance need; it only names explicitly a class of external-drift objects that already existed.

**Necessary historical reasons are already in the definition article — what does this article add?**

The definition article, while delimiting the basis part, points out that necessary historical reasons need to be kept, answering "why the present is the way it is." This article supplies the other half: the consequences of past states acting on the world may still be in effect even when they explain no present rule. Only with both halves together is the time dimension complete — one half explains the present, the other persists into it. The shared selection criterion and deletion criterion show that they are two halves of the same dimension and should be argued together.

## Conclusion

History still in effect belongs to project truth. The reasons for the present state are anchored in past changes, and the consequences of past versions acting on the world persist into the present; both still influence later iterations, neither can be read out of the current version's snapshot, and both need to be recorded explicitly as non-derivable judgments.

Entries carry a time or version clue pointing into the repository's complete change record; expiry is driven by the world and entries are deleted after patrol adjudication. The temporal window thereby stays small and trustworthy: every item it presents is still in effect, supplying later iterations with awareness along the time dimension.
