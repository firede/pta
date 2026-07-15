---
title: Project Truth Needs Freshness Governance
description: The recorded project truth in the repository drifts away from what the project actually follows. Freshness needs to be maintained by change points and inspection points together, with machines detecting drift and drafting revisions, and people adjudicating whether judgments still hold.
dependsOn:
  - argument/what-is-project-truth
  - argument/truth-record-versioned-with-implementation
  - argument/project-truth-by-domain
sourceHash: 310639f718ca1a6a1735c74a87243e943e4e17632d0f6f25cfe582e1f3484b9c
---

Project truth needs freshness governance. Freshness is the degree of consistency between the project truth recorded in the repository and what the project actually follows. Records do not track reality on their own; governance assigns them fixed checkpoints: change points handle internal drift triggered by changes inside the repository, and inspection points handle external drift that produces no version events.

The division of labor in governance follows verifiability: detecting drift and drafting revisions goes to machines as much as possible, while adjudicating whether a judgment still holds stays with people.

> This article builds on [The Truth Record Must Be Versioned with the Implementation](/en/argument/truth-record-versioned-with-implementation/) and [Project Truth Should Be Organized by Domain](/en/argument/project-truth-by-domain/), and discusses how project truth stays currently valid once it lives in the repository and is organized by domain.

## Background

Project truth emphasizes being currently valid. Versioning lets truth records share a version boundary with the implementation, so drift can be discovered within the same boundary — but discoverable does not mean discovered. Discovery and revision are actions that someone, or some mechanism, has to perform.

Drift has two sources. Internal drift comes from changes inside the repository and takes two forms: the implementation is updated while the same domain's records are not re-checked; or a domain's records are updated while the related domains that reference them are not re-checked. External drift comes from outside the repository: the real-world constraints the project follows change, such as a regulation being revised or a business definition being adjusted, and no event appears in the repository as a result.

AI participation amplifies the damage of stale records. AI consumes truth records at scale and acts on them; an outdated rule or constraint is accepted as currently valid and flows directly into judgments and outputs. A person might still sense from memory that a record is off; AI trusts the record more completely.

The central question is therefore: what maintains freshness — the maintainers' diligence and memory, or fixed checkpoints arranged by the architecture?

## Rationale

**A stale record is more dangerous than a blank.**

Where there is a blank, people and AI know they lack information and go ask, search, or verify. A stale record looks complete and authoritative, and stops further questioning; the more specific its error, the more precisely it skews judgment. The entire value of the truth record rests on being currently valid — a record that loses freshness loses its value and starts producing negative value.

Governance is therefore the precondition for the project truth architecture to have positive net returns. An ungoverned architecture accumulates stale records over time and eventually becomes worse than not having the architecture at all. Freshness governance is a component of the architecture, not an optional add-on.

**Signals of internal drift live within the version boundary and should be handled at change points.**

Once truth records share a version boundary with the implementation, what a change touched can be answered mechanically. A change that touches a domain's implementation without touching that domain's records constitutes a check signal; changing only records without touching the implementation works the same way. This signal is cheap only at the moment of change: people and AI performing a task consume records within the task's scope and do not reconcile them along the way; when the change point is absent, a divergence can pass through iteration after iteration unnoticed, until a dedicated review finally recovers it at a far higher cost. Domain organization lets signals be attributed by scope, so checks need not scan the whole repository.

The scope of checking should also extend along domain relationships. Domains form hierarchies and dependencies: a lower-level domain holds within the background of its upper-level domain, and one domain's implementation and records may reference another domain's terms, rules, or interfaces. When a domain's records change, related domains' records may be invalidated even though nothing in them changed in this commit. Change points should include the domains that depend on or reference the changed domain in the scope of checking; relationships are derived from existing structures first, such as dependencies in the implementation, references between records, and the scope containment expressed by directory hierarchy.

Change points fold freshness checks into the normal change flow. Commits, reviews, and merges happen anyway; checks enter these points as additional verification, adding no separate process. A signal is a candidate, not a conclusion — most changes need no record update at all, and the point's job is to pick out the few that do.

**External drift produces no version events and needs inspection points to cover it.**

Regulatory changes, platform policy shifts, dependency ecosystem evolution, business definition adjustments — when the real-world constraints the project follows change, there is no trigger inside the repository. Waiting for a change point to catch this kind of drift means waiting for the next change that happens to be relevant; in the meantime, the drifted content keeps being consumed.

This kind of drift can only be covered by time-based triggers independent of changes. Inspection proceeds by domain: domains declare the scope their records apply to, so inspection can check domain by domain whether the external facts the records cite still hold, and whether contradictions have appeared between domains. Domain relatedness that no structure expresses produces no check signal at change points, and is likewise taken over by the inspection of cross-domain contradictions. Change points check what moved; inspection points check what did not move. Only together do they cover both sources of drift.

**Machines draft; people adjudicate.**

The criterion for dividing the work is verifiability. Broken references, inconsistent terminology, contradictions between implementation and records — this kind of drift has objective criteria; machines can detect it and can draft revisions. Whether a rule should still be followed, whether a tradeoff still matches the project's intent — the answers live in the maintainers' intent, and that adjudication cannot be outsourced to machines.

The job of the governance interface is to make adjudication cheap. Machines submit candidate revisions with evidence, replacing vague alarms; people do not patrol, and concentrate their attention on adjudication. As model capability grows, machine drafting covers more and candidate quality rises; the set requiring human adjudication shrinks, but the adjudication step remains.

## Boundaries

**This article discusses the arrangement of checkpoints and the division of labor, and does not prescribe concrete mechanisms.**

The form of check hooks, inspection frequency, enforcement levels, and tool implementations belong to later specification design.

**The object of governance is the record of project truth.**

Process materials are not project truth and do not enter freshness governance.

**Freshness governance does not require instant consistency.**

Lag is allowed between detecting drift and completing the revision, and revisions enter the repository through the normal change flow. What governance requires is that drift can be discovered at the checkpoints, not that it never occurs.

**Enforcement levels need to match their cost.**

Blocking checks must be cheap enough; expensive enforcement gets bypassed, and a bypassed checkpoint exists in name only. This article establishes only this constraint; concrete levels are agreed per project according to risk.

**Responsibility for adjudication is agreed per project.**

Who has the authority to judge that a judgment still holds, and who answers for the consequences of a stale record, belong to project governance agreements and are not prescribed here.

## Objections

**Will freshness governance become a burden that discourages maintaining project truth?**

Governance trades hidden costs for explicit actions. Without governance the costs do not disappear: every usage context bears its own verification cost, and errors caused by stale records are paid for by downstream rework. These expenses are scattered, repeated, and accumulate with every consumption.

The governance actions themselves are designed to be light: checks hang on change points that happen anyway, detection and drafting are carried by machines, and people adjudicate only when there is a candidate revision. The feeling of burden usually comes from over-enforcement — which is exactly why enforcement levels must match their cost.

**Models keep getting stronger — can governance be handed to AI entirely?**

Machine-verifiable parts will keep moving to machines, a trend worth welcoming; governance design should cooperate with it rather than resist it. But the truth record carries the project's tradeoffs and intent, and the final verifier of whether a judgment still holds is the holder of that intent. Growing model capability narrows the range people must adjudicate; it does not eliminate the adjudication step.

Fully automated governance also has a structural problem: it substitutes the model's inference about project intent for the maintainers' confirmation. The drift detection itself starts to drift, and no checkpoint can discover that.

**Projection views are already compiled on demand, so consumers always get the latest content — why is governance still needed?**

[On-demand compilation](/en/argument/projection-view-compiled-on-demand/) guarantees that projections match the recorded project truth; governance guarantees that the record matches what the project actually follows. The two handle correspondence at different layers.

Without governance, on-demand compilation merely projects stale records faithfully into every usage context — spreading them faster, farther, and more credibly. The value of compilation presupposes truthful records, and that presupposition is maintained by governance.

**Change review already checks consistency — is inspection redundant?**

Review covers what the current change touched and answers whether this change is correct. Content that is not changed enters no review, and external drift happens precisely where nothing is changed.

Governance with change points alone is blind to external drift. Inspection points fill this blind spot. The two kinds of checkpoints answer two different questions: whether what moved is consistent, and whether what did not move still holds.

## Conclusion

Project truth needs freshness governance. Change points handle internal drift, and inspection points handle external drift; machines detect drift and draft revisions, and people adjudicate whether judgments still hold.

Governance turns "currently valid" from a definition into a fact. Versioning, domain organization, and on-demand compilation all rest on the premise that the record is still truthful; freshness governance maintains that premise, and the returns of the project truth architecture persist because of it.
