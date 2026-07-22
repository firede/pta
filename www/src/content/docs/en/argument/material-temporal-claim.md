---
title: A Material's Temporal Claim Must Be Explicit
description: Every material makes a claim about its own window of validity — valid now, true as of a moment, or regenerable from sources. The three claims correspond to three ways of maintaining, and decay comes from the mismatch between claim and maintenance. The claim cannot be read from the content and needs to be expressed explicitly as a property of the material itself.
dependsOn:
  - argument/what-is-project-truth
  - argument/projection-view-compiled-on-demand
  - argument/project-truth-freshness-governance
  - argument/history-still-in-effect
sourceHash: a9411321bfd3bd1b8f4ad4781f8a12d28737697d7df95d7bcbe8f48c47f4c542
---

A material's temporal claim must be explicit. Beyond stating its content, a material also makes a claim about its own window of validity: it may claim to be valid right now, to be true only as of the moment it was recorded, or to be regenerable from its sources at any time. The match between claim and maintenance forms a material's three stances: current claim, point-in-time snapshot, and regenerable. When claim and maintenance are mismatched, the material begins to decay — its content stops at the moment of writing while its voice keeps asserting the present. A temporal claim cannot be read out of the content; it needs to be expressed explicitly as a property of the material itself.

> This article builds on the delineation of truth records and process materials in [What Is Project Truth](/en/argument/what-is-project-truth/), and of regenerable content in [Projection Views Should Be Compiled on Demand](/en/argument/projection-view-compiled-on-demand/), naming the temporal principle they share; the checking of current claims follows the framework of [Project Truth Needs Freshness Governance](/en/argument/project-truth-freshness-governance/); the anchor treatment of residue is covered in [History Still in Effect Belongs to Project Truth](/en/argument/history-still-in-effect/).

## Background

Long-lived projects keep producing materials as they iterate: explanations, lists, meeting notes, reports, handoff notes. All of them are true when written; whether they are still true afterward depends on what each one claims. A dated meeting note makes a claim that still holds tomorrow; a document describing in the present tense how the system works makes a claim that grows one day more questionable with every day that passes.

Consumers cannot tell the difference from the content. The same present-tense description may be an authoritative document someone has committed to maintain, or a relic left behind by some handoff; the text itself is identical. People discount old materials with out-of-band experience: who wrote it, how long it has sat untouched, why it was written at the time. AI has none of this out-of-band memory; it reads everything in the repository alike and consumes every material with the same trust.

The result is a family of failures with different shapes and the same cause: a note written for one handoff keeps being treated as authoritative by later tasks; a question list whose items have all been settled goes on displaying them in a to-do voice; an organized knowledge base goes silently stale after its sources change. The core question is: how should a material's claim about time be matched with the maintenance it receives?

## Reasons

**Every material carries a temporal claim, and most claims are implicit.**

A present-tense description claims current validity; a dated record claims truth as of a moment; a presentation generated from sources claims regenerability. The claim is usually never written down — it hides in tone, location, and convention. Implicit claims are honored by the memory of whoever is present: on a small team, everyone knows that document is old and that list has been dealt with. As participants turn over and AI enters, out-of-band memory no longer covers every occasion of consumption, and the implicit claim becomes a default no one is responsible for.

**Decay comes from the mismatch between claim and maintenance, not from the passage of time.**

A dated meeting note never decays: it claims only that these things were discussed that day, and the claim stays true as time passes. Decay happens to materials that claim current validity with no maintenance commitment to honor the claim. The cost of the mismatch is paid by consumers, and it surfaces late: the material looks complete and trustworthy, enough to stop people and AI from asking further, carrying content that has already fallen out of truth into present judgments.

**Each of the three stances has a self-consistent validity mechanism.**

A current claim is honored by continual checking: falling out of truth is a signal that needs adjudication, and maintenance is an obligation promised at the moment of writing. A point-in-time snapshot carries its own anchor, and being maintenance-free follows from its definition: it says nothing about the present, so it never falls out of truth. A regenerable material's validity is decided by its correspondence to the sources: staleness can be decided mechanically, and validity is restored by regeneration.

The three mechanisms cover all the ways claim and maintenance can match. A material that fits none of them has a claim and a maintenance arrangement that have not been reconciled — and the most common shape of this is a material that speaks in a current voice while being shelved like a snapshot.

**A stance cannot be read from content, so it needs to be explicit.**

The same text can sit in any of the three stances: an architecture description may be a maintained current claim, a snapshot of some version, or a projection regenerable at any time. Deciding the stance takes information beyond the content: who has committed to maintain it, which moment it is anchored to, what it is generated from. When this information is not explicit, every consumer guesses, and the guesses drift with the person, the task, and the model. Explicit marking turns the stance from out-of-band knowledge into a property of the material itself, and every consumer reads the same answer.

**A stance transition is a change of claim, and it too needs to be explicit.**

A material's stance changes over its life: a material born as a current claim stops being maintained once its mission is done; content in a snapshot may be needed again as a current basis. The substance of the transition is that the claim has changed — the commitment to speak about the present is withdrawn, or made anew. When the commitment has changed but the expression has not caught up, the material falls back into mismatch: a question list still displaying its items in a to-do voice after the adjudications have landed, or a historical record treated in place as a current basis. Both directions need explicit acknowledgment: stepping down lets consumers read that the material no longer speaks about the present, and stepping up passes through the adjudication a current claim deserves.

## Boundaries

**This article does not prescribe how stances are marked or how transitions are performed.**

What marker, directory convention, or container default expresses a stance, and what action carries out a transition, belong to the specification layer; this article only argues that stances need to be readable and transitions need to be visible.

**Truth records and projection views are existing carriers; this article does not change their definitions.**

Truth records are the governed core of current claims; projection views are the general form of the regenerable stance; process materials are kept as snapshots. This article names the principle each of them already follows, and extends the same determination to all other materials.

**Handoff materials are point-in-time snapshots by birth.**

A handoff note claims the state at the moment of handoff and the suggestions for what comes next. Judgments in it that need to stay valid enter the carriers of current claims; a whole handoff left on display in a current voice is exactly the failure source described in the background.

**Maintenance-free does not mean storage-free.**

Maintenance-free means the content is not updated as iteration proceeds; where snapshots are stored and how they are retrieved belong to the tool layer and the specification layer. Residue is a reminder about stance determination: while a past consequence remains in effect, it is a current claim and is checked by inspection points — the determination rests on what is claimed, not on how old the content is.

**Temporal stance is orthogonal to truth membership.**

Whether a piece of content belongs to project truth is decided by the two conditions of the definition article; temporal stance answers a different question: what this material claims about time and what maintenance it needs. That snapshots and regenerable materials do not enter the truth record in no way prevents them from being well kept and well consumed.

## Objections

**Isn't marking every material's stance a new burden?**

The cost of marking is paid once; the cost of mismatch compounds with every consumption. Most marking happens at the container level: materials in one location default to snapshots, another location defaults to regenerable, and per-material declarations are needed only when deviating from the default. Implicit claims have their cost too — it is simply spread across every consumer and paid late, in the form of misjudgments.

**Won't maintenance-free snapshots become an excuse to avoid maintenance?**

A snapshot's freedom from maintenance is bought by shrinking its claim: it claims truth only as of its anchor moment and gives up speaking about the present. Wanting to speak about the present without committing to maintenance is precisely the mismatch this article names; re-marking such a material as a snapshot amounts to admitting it has nothing to say about the present, and consumers treat it as history from then on — which is exactly what making things explicit is meant to achieve.

**Freshness governance already handles staleness — what does this article add?**

Governance answers how current claims stay true: how drift is discovered and how signals are handled. This article answers which materials need to enter governance: only materials claiming current validity need checking; snapshots are exempt by definition, and regenerable materials are decided by source correspondence. Without this division, checking is either spread thin across all materials or misses current claims lingering in the guise of snapshots.

**If current claims should be squeezed to a minimum, why not eliminate them altogether?**

A project needs at least one place that speaks about the present. With no carrier for current judgments, every consumer has to excavate from history and implementation what the project follows right now, and the answers drift from person to person. Current claims cannot be eliminated, only made to converge: write in only what the project cares about, and every write is a maintenance commitment — precisely the admission direction of truth records.

## Conclusion

A material's temporal claim must be explicit. Every material claims its own window of validity: valid now, true as of a moment, or regenerable from sources. Each of the three claims has its own self-consistent maintenance mechanism, and decay comes from the mismatch between claim and maintenance. The claim cannot be read out of the content and needs to be expressed as a property of the material itself; stance transitions — a current claim stepping down into a snapshot, snapshot content speaking about the present again through adjudication — should happen explicitly.

Once temporal claims are explicit, maintenance commitments have clear boundaries: checking concentrates on the few materials that speak about the present, snapshots are maintenance-free, and projections are synchronization-free. In front of any material, people and AI can answer the same question: what does it claim, and how far should I trust it?
