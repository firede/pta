---
title: Project Text Should Use the Working Language
description: Project text that carries business meaning should use the working language, reducing translation loss, stabilizing terms, and improving retrieval efficiency.
dependsOn:
  - argument/what-is-project-truth
sourceHash: 8c28d44cabcb0fa6b69355cdd770a7506501d752cc21fac3e512caa65b79b990
---

Project text that carries business meaning should use the working language.

The working language is the natural language a project uses in practice to understand business meaning, name it, make judgments about it, record it, and maintain it over time. Its primary maintainers can keep using it continuously. It is formed by the stable wording used for business concepts, business rules, customer-facing explanations, product tradeoffs, and everyday records; it can appear in team collaboration or in an independent developer's personal work.

## Background

Part of project truth is expressed through implementation artifacts such as code, tests, and configuration; another part is supplemented by natural language, glossaries, decision records, and necessary historical memory. This article discusses the text in that second part that carries business meaning, including code comments that explain business meaning, domain rules, and product tradeoffs.

This kind of text carries the work of understanding and judgment. It records how business concepts are named, how rules hold, how customer-facing explanations are phrased, and how product tradeoffs are maintained over time. Its language choice directly affects how people, LLMs, and agents retrieve, understand, and update the project.

## Rationale

Project text should use the working language because that language is closest to how the project actually handles business meaning.

If a team, its customers, and its day-to-day business work use Chinese terms, but the project's natural-language records are kept in English over the long term, the project keeps paying a translation cost. LLMs can understand many languages, but cross-language rewriting still brings approximate translation, term drift, scattered wording, and weaker retrieval. When the same business concept appears under several names across business work, the glossary, requirement notes, code comments, and test descriptions, later maintainers must repeatedly judge whether those names point to the same thing.

Using the working language lets business concepts stay stable inside the project. The glossary can be built around the terms that are actually used. Full-text search, script-based retrieval, context extraction, and projection view generation can also find the target content more easily. When people, LLMs, and agents enter the project, they directly encounter the business meaning the project actually uses and rely less on approximate cross-language wording.

Implementation names and natural-language names can each remain stable. A project may have an English component name, function name, or table name that expresses the current program structure; the corresponding business concept in text can use the stable wording from the working language. After a refactor, implementation names may change while the business concept remains stable. Implementation names record implementation structure, project text records business meaning, and the two are connected through glossaries, references, and context.

Using the working language keeps business meaning stable while allowing implementation structure to evolve according to engineering needs.

## Boundaries

This article discusses project text that carries business meaning. To judge whether a piece of text falls under this principle, look at whether it helps the project understand concepts, explain rules, establish shared interpretations, and record tradeoffs. It may appear in documents, glossaries, test descriptions, or code comments; the carrier may differ, but the language principle is the same.

Implementation symbols follow engineering constraints. Program, data, interface, and third-party system names can follow the relevant ecosystem and team conventions. The key requirement is that the same business concept maintain a stable correspondence across the whole system, avoiding a split into multiple phrasings between natural-language explanations and implementation aliases that can no longer be matched.

Explanations that mainly serve technical maintenance can follow engineering collaboration habits. They concern engineering operations, framework constraints, build processes, and implementation details; their language choice is determined by the team's engineering practice.

## Objections

**If each project uses its own working language, will cross-project reuse become harder?**

Cross-project reuse is mainly semantic migration. An LLM can read domain knowledge, rule patterns, and term relationships from the source project, then combine them with the target project's glossary, existing project truth, code structure, and working language to generate a version that fits the target project's expression habits.

Content migrated in this way can participate in retrieval, review, and continuous maintenance as if it were written natively for the target project. What can be migrated includes domain knowledge, rule patterns, modeling experience, term relationships, and inspiration from historical decisions; only content that the target project confirms and adopts becomes project truth in the target project.

**Will differences between natural language and implementation names create confusion?**

Implementation names and natural-language names express different parts of project truth. Implementation names express program structure and are affected by component division, refactoring, framework conventions, database design, and symbol systems. Natural-language names express business meaning and need to stay stable with the working language.

After a project refactor, implementation names may change while business concepts can remain stable. The two are connected through glossaries, references, and context, supporting both code navigation and business understanding.

## Conclusion

Project text should use the working language. The working language carries how the project actually handles business meaning and can be reused continuously by the primary maintainers.

This principle keeps project truth expressed in text, glossaries, business rules, acceptance criteria, decision records, and comments that explain business meaning in the same semantic space, reducing translation loss and term drift while improving retrieval, extraction, and projection view generation. Implementation names can evolve under engineering constraints, while project text should carry business meaning in a stable way.
