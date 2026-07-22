---
title: Domain Knowledge Should Be Shared Across Projects with Verifiers at the Core
description: When domain knowledge is shared across projects, the sharing unit has rules, normative data, and operation contracts as its normative content, with verifiers responsible for testing and a reference implementation optionally attached as informative content; package content enters the target project's truth only after being re-implemented and passing verification.
dependsOn:
  - argument/what-is-project-truth
  - argument/project-truth-by-domain
  - argument/truth-record-work-language
sourceHash: cde170aedc6622d67b4117265b2756f12eb5e749ca5fdb296311f4d4229935eb
---

Domain knowledge should be shared across projects with verifiers at the core. A domain knowledge package is a sharing unit of domain knowledge extracted from project truth after stripping project coupling and private information: the domain's term relationships, rules, edge cases, and the reasons behind tradeoffs — together with content in structural form such as normative data and operation contracts — form the normative content, and verifiers express the machine-verifiable part of it as executable verification; a reference implementation may optionally be attached as informative content.

A domain knowledge package is not project truth for any project. Only after the target project re-implements the packaged knowledge in line with its own structure, technology stack, and working language, passes the package's verifiers, and actually adopts the result, does that content enter the target project's truth.

> This article builds on the definition of project truth membership in [What Is Project Truth](/en/argument/what-is-project-truth/), the definition of domains in [Project Truth Should Be Organized by Domain](/en/argument/project-truth-by-domain/), and the judgment in [Natural-Language Expression Should Match the Working Language](/en/argument/truth-record-work-language/) that cross-project reuse requires re-expression, and discusses in what form domain knowledge should be shared across projects.

## Background

Knowledge of the same domain keeps being rediscovered in project after project. Rules, edge cases, and hard-won lessons could migrate from earlier projects, but usually stop at the project boundary.

Existing forms of sharing each have limits. Implementation-bound sharing — libraries, frameworks, templates — migrates code; the domain knowledge is implicit in the implementation and is lost whenever the technology stack or architecture is incompatible. Process-bound sharing — skills and operating manuals — fixes a way of doing a class of tasks; at the domain level it lacks shared criteria for judgment, so consumers cannot assess quality before adoption and can only pay the cost of trial. The two forms also share a problem: what is shared resists merging into the consumer's project structure, and either gets maintained around as a foreign dependency or gets modified beyond recognition.

The cost structure of re-implementation has changed. Cross-project reuse used to mean transplanting implementations, because re-implementing for one's own situation was too expensive. With AI carrying constrained rewriting, re-implementation becomes feasible — provided there is a reliable means of verification to safeguard quality.

The central question is therefore: when domain knowledge is shared across projects, what should the sharing unit have at its core, and what do consumers rely on for judgment before and after adoption?

## Rationale

**Verifiers are the most portable form of domain knowledge.**

The core of domain knowledge is what must still hold under a different implementation: invariants, rules, and edge cases. Verifiers express this content as executable verification — whether the knowledge is being followed is answered by the run's outcome.

Executable expression bypasses two kinds of loss. It does not pass through natural-language retelling: domain constraints run directly as tests, introducing no translation bias. And it verifies semantics rather than structure, binding to no particular implementation. Technical specifications being re-implemented across language ecosystems against conformance suites is the precedent that proves this path.

**The extraction criterion: must it still hold under a different implementation?**

The project truth facing the package author is interwoven with implementation. To judge whether a piece of content is domain knowledge, apply this criterion repeatedly: under a different implementation, must this still hold? What must hold enters the package's normative content; what could be otherwise is implementation accident, entering the informative layer at most.

The same criterion performs the stripping. Project-specific constraints, conventions, and private information do not satisfy "anyone implementing this domain must follow it," and are naturally excluded from the normative content.

**Normative content takes two forms: statement and structure.**

Not all domain knowledge exists as stated judgments. Normative data such as a complete correspondence table, and operation contracts expressed in domain language and laws, must equally hold under a different implementation; they enter the normative content in structural form. The mix of the two forms varies by domain: where knowledge is mostly tradeoffs and conventions, the package is mostly statements; where operational semantics are dense, structural form carries the main weight. Rewriting a table row by row into statements pays translation cost to obtain the same facts in a form harder to test. An operation contract states only semantics and laws, such as conversion round-trips being identity, or serialize-then-parse returning the original set; function signatures are implementation coordinates, left for the consumer to decide.

Definition and testing stay separate: normative data enumerates the facts, operation contracts state the laws, and verifiers do the testing; verification cases reference normative data rather than copy it, so authoritative content exists in exactly one place. The separation makes the package's range of assurance statable: which rules and data are backed by verifiers, and which are left to human adjudication. This boundary, like the cases themselves, can be reviewed before adoption.

**Normative and informative content must be layered.**

The value of a reference implementation is lowering the threshold of re-implementation: adapting against a runnable sample is far easier than designing from scratch. But a reference implementation is an example — it can be replaced wholesale and can be regenerated from the package's normative content. Its relationship to the package is that of a projection view to project truth.

Without this line, the consumer's default behavior is to copy the reference implementation, carrying the very implementation coupling the package tried to strip back into the project, and re-implementation degrades into a reskinned port. Verifiers must therefore test domain semantics, not similarity to the reference implementation. Layering also focuses package maintenance on what holds value: reference implementations depreciate fastest, normative content slowest.

**The verification loop lets consumption proceed along the capability gradient.**

Authoring a package requires high-level abstraction and distillation; the cost is paid once and amortized across all consuming projects. Consumption is constrained rewriting plus a verification loop: attempt, verify, revise, until the normative verification passes. With the loop safeguarding quality, consumption tasks can go to lower-cost executors, while high-capability models concentrate on package authoring and the genuinely hard judgments within projects.

Growing model capability keeps lowering the consumption threshold. A re-implementation that requires a high-tier model today will be within reach of lower tiers later; the authoring cost stays fixed, and the package becomes an asset that grows easier to reuse over time.

## Boundaries

**This article discusses the principles of the sharing unit's form.**

Package formats, distribution mechanisms, versioning policies, consumption workflows, and escalation after failed verification belong to later specification design.

**A domain knowledge package presupposes machine-verifiable semantics.**

Where domain semantics can be expressed as executable verification, the package's assurance is strongest; in domains whose acceptance depends on human judgment, verifiers degrade into scoring rubrics and the assurance weakens accordingly. Sharing practice should start from domains with machine-verifiable semantics.

**A package is no project's truth.**

The source project continues to maintain its own project truth, and the package is a shared extract from it; what the consuming project forms after adoption is its own project truth, which evolves independently of the package. Upstream package updates are external facts to the consuming project, and their effects are covered by the consuming project's freshness governance.

**The sharing scope determines the range over which normative content is tested.**

The "anyone implementing this domain" in the extraction criterion is bounded by the package's sharing scope: for public sharing, organizational preferences are project coupling to be stripped; for sharing within an organization, the organization's interaction rules, aesthetics, and taste hold for every project in scope and may enter the package as normative content. Project truth can be shared selectively and with intent, and the same domain can yield different packages for different sharing scopes.

**Stripping during authoring treats privacy and compliance as the baseline.**

Incomplete stripping of project coupling harms the package's quality; incomplete stripping of private information causes leakage. Review mechanisms for the latter belong to specification design and in principle happen before sharing.

## Objections

**How is this different from an open-source library?**

A library shares an implementation; consumers call it through interfaces, the domain knowledge stays implicit inside, and reuse depends on a compatible language ecosystem. A domain knowledge package shares knowledge and verification; consumers re-implement, the result merges into the project's own structure and is maintained as project truth.

The two complement rather than replace each other. For capabilities with stable semantics, clean interfaces, and no need for per-project customization, a library remains the better choice; domains where the knowledge outweighs the code and the implementation must fit the project's own situation suit a domain knowledge package. A package can also list a mature library as one of its reference implementations.

**Isn't re-implementation duplicated labor?**

Most of the cost of re-implementation is now carried by AI, with verifiers safeguarding quality. What gets underestimated is the hidden cost of direct reuse: adapting to mismatched abstractions, accepting unneeded dependencies, maintaining a foreign system outside the project's structure, and the ongoing cost of understanding paid on top of it.

More decisive is identity. Domain knowledge must merge with the project's own execution structure, terminology, and working language before it can be understood and maintained as project truth; a transplanted foreign implementation remains a black box outside project truth.

**Without shared standards, why trust a package?**

The verifier itself is auditable. Before adoption, consumers can read the cases, examine the coverage, and run the verification against the reference implementation — judgment happens before adoption. This is precisely the property process-bound sharing lacks: a skill's quality is known only by trying it, while a package's normative content can be reviewed in advance.

The package's provenance provides another layer of trust: it is extracted from a real project's truth and keeps standing the test of use in the source project. Rating and recommendation mechanisms can be built on top of this, and belong to ecosystem design.

**Domain knowledge expires too — will packages replay the drift of knowledge bases?**

They will expire, but depreciation is layered. Implementation accidents depreciate fastest, and they sit in the informative layer, regenerable. Common practices abundant in training data will be acquired by models for free as capability grows, and are not worth packaging. What holds value is content beyond the training data — edge cases settled by real projects, industry constraints, and the reasons behind tradeoffs. Package maintenance should focus on this layer.

The package's own freshness rests on the source project: when the source project's truth is updated, the package can be re-extracted. On the consuming side, adopted content enters that project's own truth and is maintained by its own freshness governance, with upstream package changes covered by inspection as external facts.

## Conclusion

Domain knowledge should be shared across projects with verifiers at the core. A domain knowledge package's normative content takes both statement and structural form, with verifiers doing the testing and a reference implementation as a rebuildable example; the extraction criterion is what must still hold under a different implementation, and the consumption path is re-implementation plus a verification loop.

A package is not project truth for any project. Only through re-implementation, verification, and adoption does domain knowledge become part of the target project's truth. This path turns domain knowledge into a reusable asset: the authoring cost is paid once, the consumption threshold keeps falling with model capability, and the knowledge itself is always maintained by each project as its own project truth.
