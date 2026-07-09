---
title: Domain Declaration
description: Defines how domains are delimited and declared in the repository — the TRUTH.md domain marker, the optional GLOSSARY.md and CHANGELOG.md companion files, the expression of domain hierarchy and relationships, and external domain declarations under .pta/.
dependsOn:
  - argument/what-is-project-truth
  - argument/project-truth-by-domain
  - argument/project-truth-freshness-governance
sourceHash: f3f648aa97cdf6a935764b6bafd0c53ab884a95887c6be2721a19e6f23f869ea
---

Domain declaration defines how domains are delimited, marked, and connected in the repository.

> This specification implements the organizing principles of [Project Truth Should Be Organized by Domain](/en/argument/project-truth-by-domain/), and provides machine-decidable domain boundaries for the checks of [Freshness Governance](/en/argument/project-truth-freshness-governance/). Arguments answer why; this specification answers how.

## Terminology

This specification expresses requirement levels with the following words: **must** — implementations allow no exceptions; **should** — followed by default, and deviation requires an explainable reason; **may** — left to the project's own decision.

## Domain Marker

A directory constitutes a domain by carrying `TRUTH.md`. This is the only criterion for a domain's existence: people and machines identify domains by the same marker, without inference from conventions.

`TRUTH.md` records the main content of the domain's grounding part: concepts, rules, constraints, and tradeoffs with their reasons. Details already expressed clearly by the execution part are not duplicated.

A domain is identified by the directory path it claims. For an in-directory `TRUTH.md`, its location is the domain boundary, and the path **must not** be declared in frontmatter. A domain declares no name or description; the human-readable display name is derived on demand by consuming interfaces. All frontmatter is optional:

```markdown
---
dependsOn:
  - path: src/components/screening-form
    reason: The display rules depend on the screening form's entry conventions
---

……
```

**`dependsOn` (optional)** declares grounding dependencies that cannot be derived from existing structure: this domain's basis content depends on the content of the referenced domain, and when that domain changes, this domain becomes a check candidate. Each item contains `path` and `reason`, stating from this domain's perspective what it depends on.

Dependencies are directional and **must** be declared on the affected side; reverse relationships (who depends on this domain) are derived by tooling scanning all domain declarations, and **must not** be mirrored on the depended-upon side. When an undeclared dependency is discovered, whoever the discoverer is, the declaration is added to the affected domain.

Relationships derivable from execution-part dependencies, references between basis content, or directory hierarchy **should not** be written into `dependsOn`: the declaration file is itself a grounding record subject to freshness governance, and the fewer the fields, the smaller the surface that must be kept fresh.

## Domain Hierarchy

A domain's parent is the domain formed by the nearest ancestor directory carrying `TRUTH.md`. Hierarchy is given by the directory structure, and `TRUTH.md` **must not** declare parent-child relationships separately.

The parent domain's basis content forms the background of its child domains. A child `TRUTH.md` does not restate what already holds at the parent level; it records only the basis content specific to its own domain.

When the repository root carries `TRUTH.md`, it forms the root domain, holding project-level basis content, with all other domains ultimately holding within its background; when it does not, top-level domains have no parent domain.

## Companion Files

**`GLOSSARY.md` (optional)** maintains the domain's terms. Terms share background along the hierarchy: a child domain **must not** redefine a parent glossary's terms in conflicting ways, and a conflict constitutes a check signal. `GLOSSARY.md` may be drafted and maintained by an LLM, with adoption adjudicated by maintainers; it is part of project truth, not a projection view.

**`CHANGELOG.md` (optional)** records the domain's necessary historical reasons: explanations of changes not visible in the execution part but still affecting truth judgments and future decisions. Each entry **should** be brief and carry a time or version clue, providing an entry point for browsing commit history. The criterion for inclusion is that it still affects later judgment; entries that no longer do **should** be deleted. `CHANGELOG.md` is not a release log, nor a place to store process materials.

## External Domain Declarations

When a domain cannot appear as a single directory, or files cannot be placed in the target directory, an external domain declaration **may** be used.

External declarations are collected under `.pta/` at the repository root, organized as a single level of directories by domain name, with **no** nesting allowed. Each external domain's entry point is `.pta/{name}/TRUTH.md`, whose frontmatter **must** include `path` pointing to a real directory; `files` is optional and used only when the domain needs to be limited to some of the directory's files:

```markdown
---
path: internal/dsl
files:
  - lexer.go
  - parser.go
  - lexer_test.go
  - parser_test.go
---

……
```

`files` is the expression ceiling of external declarations: a domain delimited by a file list should stay small, explicit, and enumerable, and exists as a terminal domain unit providing no space for children. Companion files are placed under `.pta/{name}/`, the same as for in-directory domains.

External declarations are subject to the following constraints:

- A directory is claimed by at most one domain declaration. When the directory an external declaration points to carries its own `TRUTH.md`, this constitutes a conflict, and the conflict is a check signal.
- External declarations **should** exist as transitions or exceptions. When the structure can be rearranged, the domain should preferentially return to an in-directory declaration.

## Multi-Package Repositories

When a single `.pta/` cannot serve a multi-package repository, `pta.toml` **may** be placed at the repository root, declaring multiple external declaration roots via `externalRoots`:

```toml
externalRoots = ["packages/web/.pta", "packages/client/.pta"]
```

This specification only reserves this extension point; its fields and resolution rules are defined by the integration specification.

## Relationship to Projection Views

Domain declarations and their companion files are records of project truth and **must** enter the repository. Projection views generated from domains are derived results and **must not** enter the repository; their generation and cache locations are defined by the compilation specification.

## Out of Scope

The content structure of the `TRUTH.md` body (section organization, writing conventions) belongs to the content structure specification; how checkpoints consume domain declarations and `dependsOn` relationships belongs to the governance specification; the relationship between domain declarations and existing engineering files such as AGENTS.md belongs to the integration specification.
