---
title: Content Structure
description: 'Defines the content structure inside domain declaration files: judgment entries in the TRUTH.md body — form, admission, expression, and structural constraints — plus term entries in GLOSSARY.md and residue entries in RESIDUE.md.'
dependsOn:
  - argument/what-is-project-truth
  - argument/grounding-part-work-language
  - argument/project-truth-freshness-governance
  - argument/derivable-content-in-tool-layer
  - argument/history-still-in-effect
sourceHash: 3425e7a61bd671c60ba3b44a702d4f38dfe5a9aacf5bb0ed4eb9980d0b92d182
---

Content structure defines how domain declaration files are organized internally. The existence, location, and frontmatter fields of the files are defined by the domain declaration specification; this specification defines the body.

> This specification implements the framing of grounding-part content in [What Is Project Truth](/en/argument/what-is-project-truth/), the expression principle of [Natural Language Expression Should Match the Working Language](/en/argument/grounding-part-work-language/), and the admission criterion of [Derivable Content Should Stay in the Tool Layer](/en/argument/derivable-content-in-tool-layer/), and provides the minimal content unit for the checks and adjudication of [Freshness Governance](/en/argument/project-truth-freshness-governance/).

## Terminology

This specification expresses requirement levels with the following words: **must** — implementations allow no exceptions; **should** — followed by default, and deviation requires an explainable reason; **may** — left to the project's own decision.

## Judgment Entries

The `TRUTH.md` body is a flat list consisting of judgment entries. A judgment entry is a list item stating, in natural language, one judgment the project currently follows — a rule, a constraint, or a tradeoff. The body begins with the first entry, with no preamble.

An entry **should** carry only one independently adjudicable judgment: when a person adjudicates whether an entry still holds, there should be only one answer. When the reason behind a judgment still affects later adjudication, it **should** be written in the same entry as the judgment, so the reason is present at adjudication time.

```markdown
- When a primary tooth and its permanent successor occupy the same position, the permanent tooth is displayed over the primary one. Reason: during the mixed dentition stage, parents care most about the eruption progress of permanent teeth.
- Tooth positions use FDI notation, and the display stays consistent with the internal data.
- Missing teeth do not hide their positions; an empty outline is kept, so parents do not misread a vanished position as a data error.
```

## Admission and Removal

A judgment written into the body **must** be content the project currently follows and that the execution part cannot reliably carry. Details the execution part already expresses clearly **should not** be restated. The test is deletion: if removing an entry would not change any later iteration's judgment, it does not belong in the body.

A judgment no longer followed **should** be deleted or revised in the change that confirms it invalid, with the revision entering the repository through the normal change flow.

## Expression

Judgments **should** be expressed in the working language and in project concepts. Implementation coordinates derivable from the execution part, such as file paths, directory names, and symbol names, **should not** be written into judgments: coordinates break when the implementation is refactored, while project concepts stay stable. Engineering proper names can remain in their original language.

## Structural Constraints

Judgment entries **must not** be given titles, identifiers, type labels, or status markers, and the variant of using a bold lead as a title **must not** be used either. Such content can be derived from the judgment itself and belongs in the tool-layer cache.

Inside an entry, block-level structure such as nested lists, tables, or code fences **should not** be used, and the body **should not** place paragraphs or headings outside the list. Content outside the list is directly discoverable by syntax checking; when a judgment seems to need block-level structure to express, that is a check signal — it usually should be split into several judgments, condensed into a term entry, or sunk into the execution part's verification.

## Entries and the Tool Layer

The entry is the body's minimal content unit. Check signals, human adjudications, and cross-domain references anchor to entries; tools identify an entry by the hash of its content, so a change in content is a change in identity, invalidating the derived results and adjudications attached to it. The storage form and invalidation rules of the cache are defined by the governance specification.

## Term Entries

The `GLOSSARY.md` body is likewise a flat list consisting of term entries. An entry begins with the term name in bold, followed by its definition; the term name is the canonical word the project has chosen. Tools extract the term name from the bold node that leads the entry; the punctuation joining the term name and the definition follows the working language's writing habits and is not prescribed by this specification.

```markdown
- **Permanent Teeth**: teeth that remain in long-term use after replacing the primary teeth, rendered in solid color in the chart.
- **Primary Teeth**: the first set of teeth in childhood, replaced as permanent teeth erupt.
```

The glossary records affirmatively only. Consistency checks against confusable words are derived by tooling from the term names and definitions and cached, and belong to the governance specification; when the rejection of a particular word itself carries decision weight, it enters `TRUTH.md` as a judgment entry with its reason.

## Residue Entries

The `RESIDUE.md` body is likewise a flat list consisting of residue entries. A residue entry states, in natural language, one consequence still in effect, together with what it requires of later judgments. An entry **should** carry only one independently adjudicable consequence: when adjudicating whether it is still in effect, there should be only one answer.

The time or version clue is expressed within the entry's text, and this specification prescribes no separate structure for it: the clue provides people and LLMs an entry point into the change record and needs no machine parsing.

```markdown
- Before 2024-03-17, tooth-position expression covered single positions only, and interproximal caries could not be distinguished in earlier data from two teeth each having its own caries; reports involving data from that period must factor in this limitation.
- Share links issued before v2.0.0 carry no signature, and old links already distributed remain accessible within their validity period; invalidate them before tightening access control.
```

Entries are written in the working language. Unlike judgment entries, historical coordinates in residue — the version numbers, field names, or format names of the time — are frozen and do not break with later refactoring, and **may** be kept to locate the consequence precisely.

The provisions of "Structural Constraints" and "Entries and the Tool Layer" apply equally to residue entries.

## Out of Scope

The admission criterion and deletion requirements for residue are given by the domain declaration specification. The craft of writing judgments — how to phrase them concisely, which reasons to keep — is not prescribed by this specification. How checkpoints consume judgment entries and term-consistency signals, and the concrete mechanics of the tool-layer cache, belong to the governance specification. How projection views present body content belongs to the compilation specification.
