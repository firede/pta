---
title: Governance
description: 'Defines the operating loop of freshness governance: the qualifications and categories of check signals, the triggering and consumption semantics of checkpoints, human adjudication and where it lands, and the key and invalidation rules of the adjudication cache.'
dependsOn:
  - argument/project-truth-freshness-governance
  - argument/project-truth-by-domain
  - argument/derivable-content-in-tool-layer
sourceHash: 62d5d96d804a855b2de888bd92d9fa83b9a71c625d42e15d801e4971b2ab6f59
---

Governance defines the operating loop of freshness checks: how deviation becomes a signal, at which points signals are consumed, and how adjudication lands back on the records.

> This specification implements the checkpoint arrangement and division of labor of [Project Truth Needs Freshness Governance](/en/argument/project-truth-freshness-governance/), and manages the process state of checks with the cache semantics of [Derivable Content Should Stay in the Tool Layer](/en/argument/derivable-content-in-tool-layer/). The arguments answer why; this specification answers how.

## Terminology

This specification expresses requirement levels with the following words: **must** — implementations allow no exceptions; **should** — followed by default, and deviation requires an explainable reason; **may** — left to the project's own decision. Negative forms correspond to the levels: **must not** is the must-level prohibition, and **should not** is the should-level prohibition.

## Check Signals

A check signal is one deviation suspicion awaiting disposition. A signal **must** meet three qualifications: it has an anchor, pointing to a specific entry or domain declaration; it has evidence, stating the grounds for the suspicion; and it is actionable — the anchor's maintainer can adjudicate or revise based on it. A discovery that fails qualification stays with its discoverer and does not enter the loop — qualification keeps vague alarms away from adjudication.

Signal sources have no fixed list: tooling's structural checks, models during inspection, agents consuming projection views, and people can all submit signals. A signal **must** be labeled with its source: human submissions are not absorbed by the cache, which depends on telling sources apart; the source only affects how a signal is presented and consumed, and does not constitute a signal type.

The carrier in which signals are submitted and flow is defined by the integration specification; the two examples below only illustrate the three qualifications and prescribe no format. A machine-submitted drift suspicion, naming no specific entry, anchored to the domain declaration:

- Anchor: the domain declaration of the `src/billing` domain
- Evidence: this change modified five files in the domain's implementation, and the truth records were not updated along with them
- Source: structural check at an event-triggered point

A human-submitted external drift, anchored to a specific entry:

- Anchor: the entry "Caries risk is assessed on a three-level scale of low, medium, and high, consistent with the association's guideline" in the `src/assessment` domain
- Evidence: the association published a new guideline on 2026-06-15, adjusting risk grading to four levels
- Source: a person

Discovery is decoupled from repair: submitting a signal does not require the discoverer to take on the revision. When the discoverer is able to draft the revision on the spot, the revision enters the repository through the normal change flow, and the signal is disposed of along with the change.

## Signal Categories

The category list is open: as machine detection expands, new categories join under the qualifications above. The signals already minted by the specifications fall into six categories:

- **Conflict**: two declarations make mutually exclusive claims, and both holding at once violates the uniqueness constraints of the domain declaration or content structure specification. Machine-decidable.
- **Violation**: content appears where the content structure specification forbids it. Machine-decidable.
- **Term inconsistency**: a lower-level glossary's conflicting redefinition of a higher-level term, or body wording deviating from the glossary — confusable words are derived by tooling from term names and definitions. The suspicion is produced by machine comparison; whether it holds requires human adjudication.
- **Drift suspicion**: a change touches a domain's implementation without touching its truth records, or changes only records without touching the implementation; also suspected contradictions between records and what is actually followed, found by inspection. Whether it holds requires human adjudication.
- **Propagation**: when a domain's truth records change, the domains related to it through `dependsOn`, hierarchy, or references enter check candidacy. Propagation produces candidates; whether a candidate holds requires human adjudication.
- **Expiry**: a review clue attached to an entry expires. Clues are extracted from the entry text, and the extraction is tool-layer derivation; expiry is machine-decidable, while whether the entry still holds requires human adjudication.

## Checkpoints

Checkpoints divide into two kinds by trigger: event-triggered points attach to change actions and handle internal drift; time-triggered points run independently of changes and cover deviation that produces no version events.

The trigger kinds are fixed; lifecycle positions are open. An event-triggered point **may** be placed anywhere in the change lifecycle, from pre-commit assistance to pre-merge team gates; the earlier the position, the cheaper the discovery, and the later the position, the more reliable the enforcement. The same signal **may** be consumed at multiple positions, and whichever position disposes of it first ends the loop.

The consumption semantics of a point: starting from the domain of the signal's anchor, delimit the check candidate scope along hierarchy, `dependsOn`, and derived reverse dependencies; machines assemble evidence and draft candidate revisions; escalation goes to a person for adjudication.

A signal anchored to a domain declaration is a candidate awaiting expansion: the point screens the domain's entries against the evidence, escalating them as entry-level signals or drafting revisions directly; when screening finds no affected entries, the signal concludes with the screening. Screening answers whether a change touches the records; it does not stand in for adjudicating whether a record holds. Human adjudication and the adjudication cache always anchor to entries.

Inspection points carry what structure cannot delimit: consuming the review clues of entries, and reading across domains to find contradictions beyond structural relationships. The input of external change events depends on people — the system has no sensor for external drift that carries no clue and that no one notices; inspection narrows this blind spot, and eliminating it depends on review clues and human submissions.

## Adjudication

Whether a record still holds **must** be adjudicated by a person. For machine-decidable conflicts and violations, machines **may** draft revisions that enter the change flow directly, with adjudication taking place in change review.

Adjudication lands in two places: when the record needs revision or deletion, the revision enters the repository through the normal change flow; when the record is confirmed to still hold, the confirmation is written into the adjudication cache. New content produced during adjudication — the reason a rule still holds, a newly discovered boundary — enters the record itself through the normal change flow.

A signal **must not** be silently dropped: every signal ends in one traceable disposition — a revision entering the repository through the change flow, a confirmation written into the adjudication cache, conclusion by screening at a point, or closure when its anchor is invalidated. Disposition records belong to tool-layer process state.

## Adjudication Cache

Confirmation adjudications are kept in the tool-layer cache, keyed by three parts: the full identity of the anchor entry — container plus content hash — the signal category, and the hash of the evidence source — whatever content or event the evidence was derived from, the source hash is taken from there. Same-category suspicions derived from the same sources are absorbed by the cache and no longer escalated; a new change event, updated source content, and human submissions all form new keys and are not intercepted by old adjudications. When the anchor entry's content changes, the key is invalidated and the record re-enters check candidacy.

Key invalidation applies equally to undisposed signals: after the anchor entry is revised or deleted, the signals attached to it are invalidated along with it, and when the suspicion still applies to the new content, the point produces a new signal. Whether already-assembled evidence is re-attached to the new content belongs to the tool layer.

The cache is stored outside the repository and **must not** enter it; the cost of loss is asking a person to adjudicate once more. A single-person project **may** use local storage; the form and mechanics of shared storage are defined by the integration specification.

## Enforcement Levels

Machine-decidable signals whose checks are cheap **may** be configured to block changes; drift suspicion, propagation, and expiry signals default to candidate prompts, allowing adjudication to lag. A project **may** adjust levels according to risk and adoption pace, including setting a strong gate uniformly at a later point.

Enforcement levels **should** match check cost: expensive enforcement gets bypassed, and a bypassed point exists in name only.

## Out of Scope

The hook forms of points, inspection frequency, the submission entry for signals and the presentation interface for candidates, and the sharing mechanics of the cache belong to the integration specification. The expression of review clues inside entries belongs to the content structure specification. Consistency between projection views and records is guaranteed by on-demand compilation and belongs to the compilation specification.
