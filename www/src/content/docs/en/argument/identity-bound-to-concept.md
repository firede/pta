---
title: The Identity of Truth Should Be Bound to Concepts
description: Identity answers whether content is still the same one - dependencies, references, adjudications, and caches attach to it, and accumulation survives only as long as identity does. Coordinates move with the implementation's convenience while concepts change with what the project cares about, so a good identity expires in step with that caring; identity should therefore be bound to explicitly named concepts, with coordinates demoted to revisable claims.
dependsOn:
  - argument/what-is-project-truth
sourceHash: 1822824250f30713d248213ed3393d7a61cb17607d0bf2ea38d5698923a23b75
---

The identity of truth should be bound to concepts. Identity answers whether a piece of content is "still the same one": dependencies and references between records, people's adjudication confirmations, and tools' derived results all attach to an identity. While the identity survives, the accumulation survives; when the identity breaks, the accumulation is wiped. A concept is a stable unit of understanding the project has explicitly named. Coordinates are a content's current location and wording. A claim is a statement of which coordinates a concept currently corresponds to. When identity is bound to concepts, coordinate movement is absorbed by claims: when coordinates change, the claim is revised, and the identity, together with everything attached to it, is untouched.

> This article builds on the definition of naming judgments and consumption results in [What Is Project Truth](/en/argument/what-is-project-truth/), and discusses what should carry the identity that accumulation attaches to.

## Background

The payoff of making judgments explicit comes from accumulation: a judgment is written down once, and dependencies, references, and adjudications keep stacking on top of it. Accumulation must attach to an identity. The prevailing convention uses coordinates as identity: files are identified by path, records by their literal wording. When people consume, out-of-band memory covers coordinate movement: after a move they know where to look, and after a rewrite they still recognize the same sentence. When machines consume, attachment becomes mechanical: once coordinates change, the attachment breaks.

The flow of coordinates is accelerating. In the era when structural change was expensive, directory organization roughly sedimented the actual maintenance boundaries, so locations seemed reliable; once agents carry the implementation, structure is increasingly the product of the executor's defaults. The change is directly observable: hand the same requirement to different agents to initialize, and you get different directory layouts; the cost of a repository-wide restructuring has dropped from person-days of expense to one round trip within an agent session. Wording follows the same pattern: records are maintained by people and LLMs together, and editorial rewriting has become routine.

The core question is therefore: what should accumulation attach to, so that it survives the flow of coordinates?

## Rationale

**The criterion for a good identity is expiry in step with caring.**

An identity is bound to expire; the question is when. The ideal identity expires when the concept changes, which is exactly the moment the accumulation needs re-adjudication. Expire earlier than the caring, and assets are wiped by noise; expire later, and old accumulation silently vouches for new content. To evaluate an identity scheme, look at how closely its expiry timing aligns with what the project cares about.

**Coordinate identity misaligns with caring in both directions.**

Both failures of path identity are observable: when a directory is renamed, the concept is unchanged but the identity breaks, and the dependencies and adjudications attached to it are wiped wholesale; when a directory is repurposed, the concept has been replaced but the path stays, and old references keep vouching for content that has already gone stale. Literal-wording identity fails the same way: polishing the wording voids the identity, while semantic drift under unchanged wording escapes its notice. Both misalignments shift the cost onto consumers: on one side, paying again and again to rebuild; on the other, silently trusting the expired.

**The lifespan gap between concepts and coordinates is structural.**

Coordinates change with the implementation's convenience; concepts change with what the project cares about. Concepts like "account" and "session" survive one restructuring after another, while the files that carry them are renamed, split, and merged many times over. Cheaper restructuring accelerates only the coordinate side. Bind identity to concepts, and the accumulation's lifespan follows the judgment itself; bind it to coordinates, and the lifespan follows the intervals of implementation convenience. Making a judgment explicit is a one-time expense exchanged for a reusable asset, and lifespan decides how deeply it amortizes; the expense of naming is paid once, while the lifespan gap compounds with every consumption, so the [economic premise](/en/argument/judgment-bandwidth-scarcity/) demands choosing the longer one.

**Concept identity cannot be derived; it must be explicitly named.**

After a directory migration, the answer to "is this still the same scope" lives in the maintainer's intent; machines cannot derive it from the sequence of coordinate changes. Naming is therefore a naming judgment the project pins down, of the same kind as its terms; it meets both admission conditions: reasonable practice cannot derive it, since more than one qualified partition and naming exists; and the project does not accept deviation from it, since once partitions or names are swapped casually, people and AI lose their shared semantic space. So the identity name belongs in the truth record. Display names for people to skim can be derived from content on demand and kept as consumption results. The one word "name" thus splits in two: the identity name is a judgment; the presentation name is a consumption result.

**Once coordinates are demoted to claims, changes fork.**

When coordinates change, the claim is revised, and identity and accumulation survive. A claim falls out of truth in two halves: pointing at coordinates that no longer exist is machine-decidable and becomes a signal sent for checking; coordinates that still exist while the content has changed hands is beyond machine judgment, travels the same road as any other record falling out of truth, and is discovered by checks and adjudicated by people. The identity layer does not eliminate the second mismatch; it changes the mismatch's price: the revision lands only on the claim, and the accumulation attached to the identity is untouched. Hence the fork: changes the project cares about go through identity replacement, passing adjudication; relocations it does not care about go through claim revision.

**Concepts precede coordinates, so truth can precede structure.**

The definition article establishes that a judgment can hold before the implementation does; with identity bound to coordinates, that statement is discounted: truth has nowhere to land until structure appears. Bound to concepts, two adoption scenarios open at once. A new project names its concepts and pins its judgments before the first line of code, such as how users are modeled or what form login takes; mature judgments brought in from outside land in named concepts rather than in directories that do not yet exist. An existing project organizes truth by concept, with claims mapping onto the current implementation coarsely at first and more finely later; the judgments identified do not shake as the structure converges, and restructuring instead takes the declared concepts as its blueprint. Structure turns from truth's prerequisite into one of truth's consumption scenarios.

## Boundaries

**This article does not prescribe the carrier or form of naming.**

What unit organizes concepts, where names are declared, how uniqueness is constrained, and in what field claims are stated belong to later arguments and specifications.

**Concept identity does not abolish coordinates.**

Consumption still goes through coordinates: reading needs a location, retrieval needs text. This article only lifts identity off the coordinates; the correspondence is carried by claims.

**The identity layer answers only sameness.**

A concept's meaning can shift gradually while its name stays still, and a record can fall out of truth while its identity is unchanged; such drift is not discovered by the identity layer, and remains handled by the checking of divergences and human adjudication. What the identity layer promises is that when checks and adjudication happen, the accumulation sits on the right object.

**Different levels approach concept identity at different costs.**

Organizational units are few, long-lived, and attached to from many places, so explicit naming is worth it; record entries are many and their wording changes often, so naming each one may cost more than it returns. How to approach an entry's concept identity by derivation, such as semantic-equivalence judgment, belongs to later design. This article only fixes the direction: the closer the attachment is to the concept, the longer the accumulation lives.

**Renaming is concept change.**

Explicit naming does not promise immortal identity. A name change is a deliberate concept replacement; the accumulation expires with it and is re-adjudicated, which is precisely expiry in step with caring.

## Objections

**Explicit naming is a new maintenance burden, and names drift too?**

The naming burden is of the same order as the number of named units and is paid once; the glossary already maintains judgments of this kind. Name drift is concept drift, a change that should be seen and adjudicated; coordinate drift is mostly noise that should never implicate identity. Separating the two is exactly what making things explicit is for: coordinate identity hides the same cost inside every post-breakage rebuild, spread across consumers.

**Repositories already track renames; can tools not follow the moves?**

Tracking is heuristic: within similarity thresholds, single-repository in scope, valid commit by commit. Attachment across branches, shared stores, and tools requires that two implementations compute the same identity for the same content, a guarantee heuristics cannot give. Tracking also answers only where a file went, not concept sameness: when a directory is repurposed, tracking connects the identity straight to content that has already gone stale.

**Why not meaningless identifiers? Surrogate keys were invented for exactly this.**

Surrogate keys serve machine-to-machine references, at the price that nobody recognizes the key itself. The identity of truth is consumed by people and AI alike: references must be readable, adjudications must be speakable; on top of meaningless keys, colloquial names inevitably grow, and the semantic space splits into a layer of keys and a layer of what things are called. Naming judgments are already a kind of project truth; carrying identity with working-language names makes identity coincide with the semantic space.

**Most content stays put for years; is the naming cost worth paying for rare migrations?**

The frequency premise has changed; the background section gives the observable phenomena. Even at low frequency, one breakage wipes the whole accumulation: dependencies, references, confirmations, and shared keys, an expected loss that grows with the assets. And in both adoption scenarios, unstable coordinates are the initial condition rather than the exception: a new project has no structure yet, and an existing project's structure is still converging.

## Conclusion

The identity of truth should be bound to concepts. The criterion for a good identity is expiry in step with what the project cares about: concept identity expires when the concept changes, while coordinate identity misaligns with caring in both directions. Concept identity cannot be derived from coordinates and must be pinned down explicitly as a naming judgment. Coordinates are demoted to claims and their movement is absorbed by revision; a claim pointing at coordinates that no longer exist is decided by machine, and content changing hands goes to checks and adjudication.

With identity bound to concepts, dependencies, references, adjudications, and caches gain a lifespan of the same order as the judgments themselves; truth can exist before structure, and survive structure's convergence.
