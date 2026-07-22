---
title: Judgments Lossy to Transcribe Should Be Carried by Exemplars
description: Some judgments are established by pointing - the exemplar itself is the judgment's content, and transcribing it into words is lossy compression. Consumers can now take in the native form directly, so transcription is no longer necessary; yet a bare exemplar pins every perceptible dimension by default, so the record takes a composite form - a statement delimits the pinned dimensions, the exemplar carries what is pointed at, and the reason travels with the judgment.
dependsOn:
  - argument/what-is-project-truth
sourceHash: 2cc7caf645c4453d99f2e8322b9387fd1a7e00aea8a54f53006bb45a23638445
---

Judgments lossy to transcribe should be carried by exemplars. Some judgments are established by pointing: bring out an exemplar, declare it the standard, and the exemplar itself is the judgment's content; transcribing it into words is lossy, and language cannot say everything it means to pin down. An exemplar is a piece of native-form material pointed to as the standard, such as a character design sheet, an interface baseline mock, or a timbre sample. The record of such a judgment takes a composite form: a statement delimits the pinned dimensions and the delegated ones, the exemplar carries what is pointed at, and the reason is recorded with the judgment.

> This article builds on the definition of judgments and admission conditions in [What Is Project Truth](/en/argument/what-is-project-truth/), and discusses in what form judgments established by pointing should be recorded.

## Background

Most of a project's judgments are established in language: rules, policies, tradeoffs — a sentence says it all. Another kind of judgment has perceptual content: the density and whitespace of an interface, the timbre of a product, the texture of print, the rhythm of motion. Such content lies on continuous, interwoven dimensions that language's discrete vocabulary can only sample and approximate; philosophy of language calls "pointing at it and saying this is the standard" an ostensive definition, and these judgments are established the same way.

Prevailing practice takes two forms, each with its own disease. One is transcribing into words: the writer has the picture in mind, each reader reconstructs their own, and the deviation surfaces late — "rebuilt from the doc, it doesn't look right" is a common failure in cross-team handoffs. The other is scattering exemplars in the implementation: the baseline screenshots of visual regression tests are exemplars living in the repository, yet they are indistinguishable from casual screenshots, and baseline updates are routinely accepted with one click. Pinned choices and incidental choices cannot be told apart in the implementation, and the problem that opens the definition article replays itself on perceptual material.

Transcription used to be mandatory: retrieval, comparison, and machine consumption took only text, and transcription was a tax paid to the toolchain. Once multimodal models take images and audio directly into context, that premise is gone, while the loss is still being paid. The core question is: in what form should judgments established by pointing enter the truth record?

## Rationale

**Some judgments are established by pointing, and language can only approximate them.**

The content of such a judgment is a whole over continuous dimensions: silhouette, palette, temperament, expression — vocabulary samples them discretely. The same written character brief, "silver-haired, aloof, boyish", yields ten different characters from ten artists; hand over the design sheet, and the output converges at once. The stock phrase of art review is "follow the sheet", not a string of adjectives. Pointing has long been how such judgments are established in practice; all that was missing is the carrier.

**Transcription is lossy compression, and the loss compounds with consumption.**

What transcription drops, every consumer fills in with their own imagination, and the filling drifts with each person and each model. However fine the parameters, it is the same: hair color can be given as a color code, body proportions can be given as numbers, yet temperament and expression are still not in the words. An exemplar enters the repository once, and consumption checks against it directly, so the loss stops at the first time; carriage by transcription pays a compression loss at writing, plus a reconstruction deviation at every consumption.

**The consumer side's premise has changed, and transcription is no longer necessary.**

Transcription is a tax paid to the toolchain: retrieval, comparison, and context assembly long accepted only text. Multimodal models can now take images and audio directly into context, and people have always consumed with eyes and ears. Consumption is not only understanding but also execution: an agent takes the finalized character design and directly produces portraits, skins, and promotional art — the exemplar is the basis of generation. The form of carriage should upgrade with the capability of consumption; keeping everything transcribed is paying for a limitation that no longer exists.

**A bare exemplar over-pins; the statement delimiting dimensions is a requirement of the admission criteria.**

On a character design sheet, everything perceptible is pinned by default: silhouette, palette, costume, pose, art style — while what the project cares about is silhouette and palette, and pose and composition should be delegated to each scene. Pinning choices the project does not care about only shackles iteration; that is the definition article's admission criterion, not a style suggestion. So the record of such a judgment must be composite: the statement declares which dimensions are pinned and which are delegated, the exemplar carries what is pointed at, and the reason says why the project cares. Mature design sheets already come with annotations — what must not change, what varies with the scene — the craft prototype of statements delimiting dimensions. The statement is also the degradation path for text-only consumers: a consumer who cannot take in the exemplar at least reads what is pinned and where to look.

**Only when exemplars enter the truth record can the pinned look be told from the incidental look.**

With the exemplar in the truth record, carrying its statement and reason, the baselines in the implementation finally have grounds for adjudication: a baseline update consistent with the exemplar is implementation evolution, while one that deviates needs adjudication — is the implementation wrong, or has the judgment changed? The divergence becomes a signal sent for checking, isomorphic with statement records. A record with an exemplar gains a comparator that statement records lack: deviation between the implementation and the exemplar can be compared perceptually, so suspicions are cheaper to discover. The cheapness stops at discovery: the comparator is dimension-blind — it reports whether there is a difference, not whether the difference falls within the pinned dimensions; filtering out-of-scope differences requires reading the statement's delimitation, and that judgment, together with adjudicating whether the exemplar still represents intent, stays with people.

## Boundaries

**This article does not prescribe the exemplar's file form, placement, or identity computation.**

In what format exemplars are saved, where they are placed, and how they participate in a record's identity belong to the specification layer.

**Content that transcribes losslessly needs no exemplar.**

Precisely enumerable parameters such as color values, font sizes, spacing, and durations are already lossless as text and structured data, and switching to an exemplar adds nothing. The criterion is whether transcription is lossy: if lossy, use an exemplar; if lossless, keep the statement.

**Statements and reasons remain under the working language.**

The linguistic part of a composite record is expressed per the working-language principle; the exemplar is not language and lies outside its jurisdiction.

**An exemplar is a record, not the implementation's verification.**

Visual regression baselines and listening-test samples are the implementation's verification facilities; the exemplar provides them with grounds for adjudication. Verification consumes judgments; it does not carry them.

**Cross-project sharing is not covered here.**

How exemplars enter the sharing unit of domain knowledge belongs to the design of sharing forms.

## Objections

**Binary assets in the repository — unreadable diffs and ballooning size?**

The means to review perceptual material already exist: review interfaces render images and play audio, and perceptual comparison tools present differences. Size is an engineering matter, handled by large-file facilities, and does not change where the content belongs. The real cost lies in keeping exemplars out of the repository: half of the judgment stays in cloud drives and design tools, drifting apart from the record — the versioning article's detachment argument holds here unchanged.

**Words plus parameters are enough — professional teams have always written it this way?**

What can be enumerated should indeed be words; the boundary section has drawn that line. The remainder is exactly why design handoffs never dare omit the visual mock: the impression that words suffice comes from the writer being present, the picture in their head filling in the text. Change the person, change the model, and each filling drifts its own way, with failures surfacing late.

**Models' understanding of images and audio is still unstable — is repository entry premature?**

The exemplar's value does not depend on perfect model understanding: people can always check against it, machine suspicions from perceptual comparison are already usable, and growing model capability only raises the quality of consumption. The carrier takes its place before the capability, isomorphic with judgments holding before the implementation does. Nor is transcription any more reliable: it freezes the reconstruction deviation at the moment of writing, and no capability growth recovers what was dropped.

**Exemplars expire too — who maintains them?**

An exemplar that enters the truth record claims current validity; writing it in is a promise to maintain it, under the same governance as statement records: implementation deviating from the exemplar is a divergence awaiting adjudication, and when the exemplar no longer represents intent, it is updated or deleted through adjudication. Historical material kept only for the archive is preserved as a snapshot per its temporal claim and does not enter the truth record. The exemplar also has one convenience over prose entries: deviation can be compared perceptually, and suspicions are cheaper to discover.

## Conclusion

Judgments lossy to transcribe should be carried by exemplars. Such judgments are established by pointing; transcription is lossy compression whose loss compounds with consumption, and consumers can now take in the native form directly, so transcription is no longer necessary. A bare exemplar pins every perceptible dimension by default, so the record takes a composite form: the statement delimits the pinned and delegated dimensions, the exemplar carries what is pointed at, and the reason travels with the judgment.

With exemplars in the truth record, the pinned look is told from the incidental look, deviation can be compared perceptually, and adjudication has its object. The expressive power of the truth record is thereby completed: what words can say, statements carry; what words cannot exhaust, pointing does.
