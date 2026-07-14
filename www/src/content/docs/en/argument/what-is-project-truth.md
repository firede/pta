---
title: What Is Project Truth
description: Project truth is the set of judgments the current project actually follows — decisions and premises that reasonable practice cannot derive and the project does not accept deviating from. The implementation conforms to truth without carrying it, and truth grounds continuous iteration and projection view generation.
sourceHash: b2add8291d457b27367325102cbd02bb321e1486dc2fac9205d773f632f23123
---

Project truth is the judgments the current project actually follows: the decisions the project has made, and the premises the project has adopted. It answers why this project is the way it is now, rather than some other qualified way.

A piece of content belongs to project truth only when it meets two conditions: reasonable practice cannot derive it — projects of the same kind facing the same problem have multiple qualified approaches, or it deviates from the prevailing default; and the project does not accept deviation from it — swap in another qualified approach, and the result is no longer this project. Both conditions are necessary: content that reasonable practice reliably supplies is, when written down, merely a restatement of common knowledge; pinning a choice the project does not care about only constrains later iteration.

Project truth primarily serves continuous project iteration. As long as a project will continue to be understood, changed, explained, audited, or used to generate projection views, it needs project truth. It may be used by people or by AI, and it is meant for understanding and judgment while the project keeps changing.

Maintaining project truth is also an economy of maintainers' attention. A substantial share of the judgments a project follows exists only in maintainers' heads; when those judgments are not made explicit, people must restate them in every task, and restating consumes attention and introduces drift in retelling. Human attention is a limited resource, and once AI participates, the occasions that require restating multiply, amplifying this cost. Project truth makes these judgments explicit once and keeps them in effect; everything outside the judgments is explicitly delegated to reasonable practice, which likewise saves repeated explanation.

The project's implementation — the codebase in a code project, and the objects that actually drive production and verification in other projects — determines the current version's result, but it cannot carry truth: an implementation expresses pinned judgments and incidental choices in the same material, and nothing in it reveals which parts are this project's load-bearing structure.

## Background

The phrase project truth emphasizes current validity. It refers to the judgments the project actually follows in the current version. When the version changes, the judgments actually adopted and still in effect may also change, and project truth changes with them.

In long-lived projects, project-related information is scattered across files, tools, collaboration records, and the context formed during a particular task. Without a criterion, project truth can easily expand into all related materials, shrink into the context needed for one task, or be equated with the implementation itself. The first two confusions cost truth its boundary; the third costs truth its shape — an implementation contains thousands of choices, of which only a few carry the project's judgments, while most are what any qualified implementation would produce.

Therefore, when defining project truth, the central question is: which judgments make this project itself? Which content, once lost or deviated from, would make the project no longer the one its maintainers want?

## Rationale

**Project truth consists of judgments: the decisions the project has made, and the premises it has adopted.**

Decisions are choices the project has pinned down among multiple qualified options: the wording of business rules, the boundaries of product capability, designs that deviate from prevailing defaults. Premises are the real-world conditions the project has adopted: external constraints such as user scale, deployment environment, and compliance requirements. Premises mark out the room where the implementation may simplify, and bring the requirements the implementation must satisfy. Decisions and premises together answer why the project is the way it is; making them explicit lets later iteration and rebuilding proceed under the same judgments.

**The two conditions jointly draw the boundary of truth.**

The first condition keeps common knowledge and prevailing practice out of truth. Security conventions, industry norms, and engineering common sense are reliably supplied by reasonable practice; writing them into the truth record is mere restatement, and the restatement itself then has to be maintained.

The second condition keeps choices the project does not care about out of truth. For most choices in an implementation, swapping in another qualified option yields an equally acceptable result, and pinning them gains nothing. What the project cares about is itself the project's call: the same technology choice is not truth in a project that only cares about functional correctness, and is truth in a project that treats technical taste as part of the product. Membership is determined by the relationship between the project and the content, and the judgment rests with the maintainers.

**The implementation conforms to truth; it does not carry truth.**

An implementation can fully express behavior; it cannot express a judgment's standing. An implementation in which one-time passwords are only six characters and case-insensitive reads exactly like a security oversight; only the truth record can state that this is a deliberate tradeoff for reading mail on a phone. When judgments stay implicit in the implementation, sharing and reuse require extraction through interpretation, and iteration tends to treat them as details available for optimization.

Therefore, project truth needs to be explicitly recorded outside the implementation. Writing down a judgment the implementation already embodies is different from restating the implementation: the record carries the judgment together with its binding force and its reason, and neither can be derived from the implementation. When record and implementation diverge, either the implementation has strayed from the judgment or the judgment has changed; both cases call for adjudication — divergence thus becomes a signal sent for review, rather than rot that no one owns.

**Everything outside the judgments is handled by reasonable practice.**

Reasonable practice is what qualified practitioners, facing a problem of the same kind, can adopt without any project-specific information. For the parts truth has not pinned down, any handling consistent with reasonable practice is acceptable.

This explicit delegation is what keeps maintenance cost under control: the size of the truth record tracks the number of the project's judgments, not the number of implementation details. The baseline of reasonable practice also rises as practitioners and tools grow more capable, and the judgments that need explicit pinning shrink accordingly.

**A stable glossary is also part of project truth.**

A project needs to be understood and changed within the same vocabulary; terms are naming judgments the project has pinned down. The role of a glossary is to eliminate ambiguity caused by synonyms, near-synonyms, industry colloquialisms, and incorrect spellings. When AI handles project-level tasks, this is especially important: AI builds contextual associations from vocabulary. If a project has no stable glossary, the same object may be written as "account" or "user account" across code, interfaces, and explanations; in business contexts, "lead" and "customer" may also be conflated, though they usually correspond to different lifecycle stages and process rules.

The value of unified vocabulary is that it lets people and AI work in the same semantic space.

**Judgments need to carry their reasons.**

Judgments that deviate from prevailing defaults especially need reasons: when the reason is absent, later iteration reads only a suspicious deviation, and correcting it back to the default looks like an improvement. The reason answers why the judgment holds — why a rule was kept, why a constraint exists, why a tradeoff is worth it.

Reasons keep only what still guides later iteration, not the full discussion process. Version history can answer what changed and when; a judgment's reason answers why it is still worth following. This kind of content needs to be written carefully and deleted carefully: that a single task does not need it right now is not enough to show it has become invalid.

## Boundaries

**Project truth is judged by what is currently followed.**

To judge whether some content belongs to project truth, the key is whether it is a judgment the current project actually follows. A judgment that has been replaced exits project truth with the version.

**Facts themselves are not project truth.**

Facts are objective statements about specialized knowledge or the real world; they belong to the baseline of reasonable practice. Project truth does not list facts; it records only the judgments the project has made on top of them: which premise was adopted, and what was given up because of it.

**Implementation content not bound by any judgment constitutes the current state, not truth.**

The current state is the default starting point for later iteration; carrying it forward saves repeated decision-making. But it has no binding force of truth, and improving the current state within reasonable practice requires no adjudication at the truth level.

**Process materials are not project truth.**

Process materials document fact-finding, discussion, and decision-making. Full ADRs, meeting notes, research materials, issue discussions, agent conversations, and user feedback are all process materials; what enters project truth is only the judgments these processes settle into and the project still follows.

**Final outputs are judged by their relationship to later iterations.**

A final output does not automatically become project truth. Only when the judgments around it continue to affect later versions, quality judgments, or external delivery explanations do those judgments need to be maintained as project truth.

**Project truth holds relative to the baseline of reasonable practice.**

The baseline shifts with time and with participants' capability: a judgment that needed pinning yesterday may be today's prevailing default. Project truth exists per version, and the additions and removals caused by baseline shifts land with version updates.

**The truth record does not promise completeness.**

Load-bearing judgments often surface only when deviated from: a change overturns a choice the maintainers care about, and a judgment that was never made explicit comes into view. Record it once discovered; the record converges through iteration rather than being written out in full at the project's start.

**Context and projection views are consumption results of project truth.**

Context is a session projection formed from project truth, the task goal, and the current conversation state, used for a specific act of understanding or execution. A projection view targets a specific usage context and extracts, reorganizes, and presents content from project truth and the implementation. They can be generated, displayed, cached, and passed to AI for use. Content that can be regenerated from project truth and the usage context can usually remain a consumption result.

This article only defines what project truth is. How project truth enters the repository, and how it is reviewed, updated, deprecated, and governed, are outside its scope.

## Objections

**Will project truth become a place where everything gets thrown in?**

This risk exists. The test for controlling it is the two conditions applied in reverse: if, after a piece of content is deleted, later iteration handled by reasonable practice still yields an acceptable result, it does not belong to project truth. Related materials, process records, and one-off context may be valuable, but most of them fail this test.

The other restraint is bookkeeping cost. Every judgment requires later iteration to follow it and requires deviations to be adjudicated; writing one in is a commitment, not a memo. Pin only what the project cares about, and attach the reason when pinning.

**Isn't "the project does not accept deviation" too subjective?**

This subjectivity sits in the right place. What a project cares about is the project's own call, and the judgment should rest with the maintainers; that the same content has different membership in different projects is precisely the definition working as intended. What restrains it is bookkeeping cost and the obligation to give reasons: reasons leave an anchor for future re-adjudication, and when what the project cares about changes, judgments can be explicitly replaced or deleted.

**The implementation already embodies these judgments. Why record them separately?**

An implementation expresses behavior, not binding force. Extracting judgments from an implementation makes every extraction a fresh interpretation, and interpretations drift across tasks, people, and models; pinned choices and incidental choices are indistinguishable in the implementation, so the judgments most in need of protection are exactly the ones most likely to be changed away as details. The record makes judgments explicit once: later iteration draws on them directly, and divergence can be discovered and adjudicated.

**How is this different from a continuously maintained design document?**

The selection criterion is opposite: a design document aims to cover how the system is built, while the truth record aims at the minimal set of judgments, deliberately excluding whatever any qualified implementation would produce. The direction of authority is also opposite: a design document describes the implementation, goes stale when the implementation changes, and chases it; the truth record constrains the implementation, and divergence is a signal calling for adjudication.

A continuously maintained design document is, under this definition, a projection view: generated from truth and the implementation for a usage context, with corrections landing back on truth. A sentence in a design document that cannot be regenerated from truth and the implementation is precisely a judgment missing from the record.

**If project truth changes across versions, why call it truth?**

Truth here emphasizes current validity and allows change across versions.

A business rule, term, premise, or product tradeoff may once have been project truth and may be replaced in a new version. This kind of change fits the versioned existence of long-lived projects.

For any version, people and AI should understand, change, and judge the project according to the judgments it actually follows. The value of project truth is that it makes the effective core of the current version explicit.

## Conclusion

Project truth is the judgments the current project actually follows: decisions and premises that reasonable practice cannot derive and the project does not accept deviating from. It makes this project itself. The implementation conforms to truth without carrying it; everything outside the judgments is handled by reasonable practice, and implementation content not bound by judgments constitutes the current state.

Facts, process materials, final outputs, context, and projection views all need to be distinguished from project truth. Only judgments the project actually follows, meeting both conditions, belong to project truth.

Defining project truth clearly gives project truth architecture a stable foundation.
