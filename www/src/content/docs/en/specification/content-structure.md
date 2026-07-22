---
title: Content Structure
description: 'Defines the content structure inside domain declaration files: judgment entries in the TRUTH.md body — form, admission, expression, and structural constraints — plus term entries in GLOSSARY.md, residue entries in RESIDUE.md, and pending entries in PENDING.md.'
dependsOn:
  - argument/what-is-project-truth
  - argument/truth-record-work-language
  - argument/project-truth-freshness-governance
  - argument/derivable-content-in-tool-layer
  - argument/history-still-in-effect
sourceHash: 64e3080c941748e5858f576998234faebf846e6f52bd5c33e053734985d59d75
---

Content structure defines how domain declaration files are organized internally. The existence, location, and frontmatter fields of the files are defined by the domain declaration specification; this specification defines the body.

> This specification implements the framing of truth record content in [What Is Project Truth](/en/argument/what-is-project-truth/), the expression principle of [Natural Language Expression Should Match the Working Language](/en/argument/truth-record-work-language/), and the admission criterion of [Derivable Content Should Stay in the Tool Layer](/en/argument/derivable-content-in-tool-layer/), and provides the minimal content unit for the checks and adjudication of [Freshness Governance](/en/argument/project-truth-freshness-governance/).

## Terminology

This specification expresses requirement levels with the following words: **must** — implementations allow no exceptions; **should** — followed by default, and deviation requires an explainable reason; **may** — left to the project's own decision. Negative forms correspond to the levels: **must not** is the must-level prohibition, and **should not** is the should-level prohibition.

## Judgment Entries

The `TRUTH.md` body is a flat list consisting of judgment entries. A judgment entry is a list item stating, in natural language, one judgment the project currently follows — a rule, a constraint, or a tradeoff. The body begins with the first entry, with no preamble.

An entry **should** carry only one independently adjudicable judgment: when a person adjudicates whether it still holds, there should be only one answer. When the reason behind a judgment still affects later adjudication, it **should** be written in the same entry as the judgment, so the reason is present at adjudication time.

```markdown
- When a primary tooth and its permanent successor occupy the same position, the permanent tooth is displayed over the primary one. Reason: during the mixed dentition stage, parents care most about the eruption progress of permanent teeth.
- Tooth positions use FDI notation, and the display stays consistent with the internal data.
- Missing teeth do not hide their positions; an empty outline is kept, so parents do not misread a vanished position as a data error.
```

## Admission and Removal

A judgment written into the body **must** meet project truth's admission conditions: the project currently follows it, reasonable practice cannot derive it, and the project does not accept deviation from it. Entries that restate implementation details **should not** be written. The test is deletion: if, after an entry is removed, later iteration handled by reasonable practice still yields an acceptable result, it does not belong in the body.

A judgment no longer followed **should** be deleted or revised in the change that confirms it invalid, with the revision entering the repository through the normal change flow.

## Expression

Judgments **should** be expressed in the working language and in project concepts. Coordinates derivable from the implementation, such as file paths, directory names, and symbol names, **should not** be written into judgments: coordinates break when the implementation is refactored, while project concepts stay stable. Engineering proper names can remain in their original language.

When a judgment depends on an external fact to hold, a review clue — a date or a decidable expiry condition — **may** be attached to the entry. The clue internalizes the verifiable part of external drift into the record itself; the substance of the clue is expressed within the entry's text, with no separate structure and no reliance on any habitual phrase. When the clue needs to be consumed by inspection on schedule, the entry declares itself into the inspection set with an inspection marker.

## Inspection Marker

A judgment entry whose external validity needs periodic checking **may** open its content with an inspection marker: `[?] ` immediately after `- ` — a single half-width question mark wrapped in square brackets, followed by a single space.

```markdown
- [?] Risk grading stays aligned with the association's current guideline. Check for guideline updates in 2027-01.
- [?] The service runs on a single server, so sessions can live in memory. Recheck when the deployment topology changes.
```

The marker declares a maintenance commitment: the external fact the entry depends on needs periodic checking by inspection. The inspection set can therefore be delimited by machine directly — membership is decided without recognizing any wording in the text, and does not vary with the work language. The marker expresses a commitment, not a result: whether a check passed, and when it ran, are tool-layer process state and **must not** be written back into the entry.

The marker is part of the entry's content and participates in normalization and the content hash: adding or removing the marker changes the entry's identity, and the derivations and adjudications attached to the old identity expire with it.

This specification defines only one status character, `[?]`. Entry content that opens with a single character wrapped in square brackets followed by a space, where the character is not defined, constitutes a check signal. Status characters express maintenance commitments — each character corresponds to one machine-executable difference of behavior in the governance loop; the classification and grading of content can be derived from the judgment itself, belong in the tool-layer cache, and **must not** be expressed as status characters. New characters enter through revisions of this specification.

The inspection marker is defined only for judgment entries in `TRUTH.md`. Residue entries expire by the world's doing and belong to the inspection scope as a whole kind, without per-entry marking.

## Structural Constraints

Judgment entries **must not** be given titles, identifiers, type labels, or check statuses, and the variant of using a bold lead as a title **must not** be used either. Such content can be derived from the judgment itself and belongs in the tool-layer cache. The inspection marker is not among these: the maintenance commitment it declares cannot be derived from the judgment, and is defined in "Inspection Marker".

An entry opens with `- ` at the start of the line — a hyphen followed by a single space — and ends at the end of the line, with no leading indentation, and **must not** span multiple lines: the source-text boundary of an entry can therefore be recomputed identically by every implementation, and any non-blank line in the body that does not open with the entry marker is content outside the list.

The body **must not** place content outside the list, and the single-line boundary rule makes violations directly discoverable by syntax checking. A single-line entry also has no room for block-level structure such as nested lists, tables, or code fences; when a judgment seems to need block-level structure to express, the body cannot legally carry it — it usually should be split into several judgments, condensed into a term entry, or sunk into the implementation's verification.

## Entries and the Tool Layer

The entry is the body's minimal content unit. Human adjudications and cross-domain references anchor to entries, while the anchoring and disposition of check signals are defined by the governance specification; an entry is identified within its container — the domain it belongs to and the file it sits in — by its content hash, and the full anchor consists of the container identity together with the content hash, so a change in content is a change in identity, invalidating the derived results and adjudications attached to it. Within one file, duplicate entries with identical content **must not** appear; duplication is directly decidable by normalized comparison. The storage form and invalidation rules of the cache are defined by the governance specification.

## Term Entries

The `GLOSSARY.md` body is likewise a flat list consisting of term entries. An entry begins with the term name in bold, followed by its definition; the term name is the canonical word the project has chosen. Tools extract the term name from the bold node that leads the entry; the punctuation joining the term name and the definition follows the working language's writing habits and is not prescribed by this specification.

```markdown
- **Permanent Teeth**: teeth that remain in long-term use after replacing the primary teeth, rendered in solid color in the chart.
- **Primary Teeth**: the first set of teeth in childhood, replaced as permanent teeth erupt.
```

A term entry likewise opens with `- ` at the start of the line and ends at the end of the line, and **must not** span multiple lines; the constraints on block-level structure inside the entry and outside the list are the same as for judgment entries. Within one `GLOSSARY.md`, term names **must** be unique: comparison follows entry normalization with no case folding, and a duplicated name constitutes a machine-decidable conflict.

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

## Pending Entries

The `PENDING.md` body is likewise a flat list consisting of pending entries. A pending entry states one choice awaiting adjudication: the unsettled part **should** be phrased as a question, followed by the disposition the discoverer has taken and its reason. The question keeps the space awaiting adjudication and the disposition already in place distinct within the entry, so the adjudicator need only answer the question itself. The disposition's reason explains why acting this way is sound while adjudication is pending — it argues from reasonable practice and does not presume the project's intent.

An entry **should** carry only one independently adjudicable question, and several questions are split into several entries even when they share an origin: a bundled entry is stuck after a partial adjudication — deleting it loses the unadjudicated questions, while keeping it goes on displaying the already-adjudicated parts in a pending voice.

```markdown
- Does a verification-code request from an unregistered email create an account automatically? Currently implemented as automatic creation; merging login and signup is the common form for verification-code flows.
- Does the session list include expired sessions? Currently returns only active sessions: the list serves the kick-out operation, and an expired session has no credential to revoke.
```

Entries are written in the working language. How the question and the disposition are joined follows the working language's writing habits and is not prescribed by this specification; splitting question from disposition within an entry is tool-layer derivation.

The provisions of "Structural Constraints" and "Entries and the Tool Layer" apply equally to pending entries.

## Out of Scope

The admission criteria and deletion requirements for residue and pending entries are given by the domain declaration specification. The craft of writing judgments — how to phrase them concisely, which reasons to keep — is not prescribed by this specification. How checkpoints consume judgment entries, the inspection set, and term-consistency signals, and the concrete mechanics of the tool-layer cache, belong to the governance specification. How projection views present body content belongs to the compilation specification.
