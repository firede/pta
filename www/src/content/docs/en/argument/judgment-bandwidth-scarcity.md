---
title: Human Judgment Bandwidth Is the Scarce Resource
description: Machine generation and execution keep growing, while the human channel for explicit expression, continuous judgment, and accountability stays nearly constant; the bottleneck of collaborative systems therefore shifts to human judgment. Collaboration arrangements should be accounted for in judgment bandwidth — judgments made explicit once and reused, steps machines can take on kept off the human channel, and matters that need human adjudication arriving in adjudicable form at the cheapest moment.
sourceHash: 003fddd5c828fb1fb92fcd746629309338292226cec6d61b7b8977fb69bba9a3
---

Human judgment bandwidth is the scarce resource. Judgment bandwidth is the channel for what a person can explicitly express, continuously judge, and take responsibility for. Human perception and intuition are far wider than this channel, and machine generation and execution grow far faster than it does; the channel itself stays nearly constant. Once the output of collaboration exceeds what a person can read in full, the scarce resource of the system shifts from machine capability to human judgment.

The scarce resource determines the accounting. Whether a collaboration arrangement holds up should be evaluated by how it spends judgment bandwidth: the same span of attention returns vastly different value spent on judgments only a person can provide than spent on retelling, searching, and course correction. The directions for economizing judgment bandwidth follow from this — make a judgment explicit once and keep reusing it; hand the steps machines can take on to machines; and let matters that must be adjudicated by a person arrive in adjudicable form, at the cheapest moment.

> This article shares one root with the mini-book [Human Bandwidth Design](https://bandwidth.ren/en/): the mini-book unfolds this proposition into a program-level treatment of the general design of human–machine collaboration, and the project truth architecture is one practice of that program. This article distills its core reasoning to the altitude of these arguments, as the economic premise the later articles share.

## Background

Every act of communication between a person and a machine is a lossy compression. The intent in a person's head carries goals, preferences, no-go zones, and a mass of background taken for granted; what gets said is a few sentences. The receiver fills the gap: machines guess along prevailing patterns, and the wrong guesses come back to the person as rework. Expressing in finer detail reduces the guessing, but expression consumes the same channel — at any granularity, the person is making trade-offs within a limited bandwidth.

Once machines became executors, the structure of this account changed. When machines waited to be operated, how human attention was allocated was a question of interaction efficiency; now machines produce continuously, and human expression, understanding, judgment, and accountability become the limiting factor of system output. Once output exceeds what can be read in full, line-by-line verification stops adding up, and people turn to sampling and gut-feel approval — a rational strategy under a resource shortage, not a lapse of discipline. How reliable is approval by gut feel? It has been measured once: in a randomized controlled trial in early 2025, experienced developers using AI tools in familiar, mature projects took 19% longer to finish, yet still believed afterward that they had been faster[^metr]. Task boundaries determine the direction of the gains, and the subjective sense of speed cannot replace measurement.

[^metr]: The experiment was run by METR (Model Evaluation & Threat Research) and published in 2025 (https://arxiv.org/abs/2507.09089); its 19% slowdown reflects the tools, mature open-source projects, and senior developers of early 2025, and METR's later rerun has seen speedup signals with no reliable magnitude due to selection bias: https://metr.org/blog/2026-02-24-uplift-update/

The core question, therefore, is: when human judgment becomes the bottleneck of a collaborative system, how should information and judgments be organized so that limited judgment bandwidth goes to what only a person can provide?

## Reasons

**The scarcity of judgment bandwidth is structural.**

Expression, understanding, adjudication, and accountability all pass through the same serial channel, whose width is set by human cognitive architecture. One measurement for reference: the effective information rate of explicit human expression and continuous judgment is about 10 bits per second, eight orders of magnitude below the rate of sensory intake[^10bits]. Training improves the technique at either end of the channel, and interfaces improve the peripherals of input and output; the channel itself grows no wider with any generation of tools, while the machine side keeps growing. The gap widens with time and the scarcity deepens — this is not a phase tied to any generation of models, but a structural fact that holds as long as machines keep improving.

[^10bits]: The measurement comes from a 2025 article by Zheng and Meister in _Neuron_; the figure describes the effective information rate of high-level behavior and explicit judgment, not an upper bound on the brain's overall processing: https://www.sciencedirect.com/science/article/pii/S0896627324008080

**Some judgments can only come from a person.**

Human contribution in collaboration falls into two kinds. One is stopgap: people covering what machines cannot yet do, such as watching for common errors and cleaning up after unstable tools. Every advance in machine capability takes over a batch of stopgap work, and this substitution deserves to be welcomed. The other is constitutive: these judgments define the goal of the collaboration itself — what is wanted, what is cared about, what risk is acceptable, in whose name commitments are made; remove the person, and the questions lose their answering subject. What machine progress converges is the stopgap contribution; constitutive judgments always need to pass through the human channel.

**Judgments not made explicit keep occupying bandwidth as repeated retelling.**

Once a judgment is made, if it exists only in someone's head or in a single conversation, every later occasion of consumption requires it to pass through the channel again: re-explained to new participants, re-stated to machines, or simply absent — left for the receiver to guess along prevailing practice. Retelling is paid on every consumption, relays drift, and guesses stray from intent. Machine participation multiplies the occasions of consumption, and this repeated expense multiplies with them.

**Making a judgment explicit turns a one-time expense into a reusable asset.**

Written down once together with its reason, a judgment is drawn on directly at every later consumption, without passing through the human channel again; the expense is paid once and amortized across consumption, more economical the more it is consumed. The asset brings a maintenance obligation with it: judgments fall out of truth as circumstances change, and maintaining a record that has fallen out of truth costs bandwidth too. So making explicit needs admission — what deserves it are the judgments whose accumulated retelling cost exceeds the cost of maintaining the record; content that prevailing practice stably supplies, and choices nobody cares about, are not worth the price.

**Steps machines can take on should not occupy the human channel.**

These steps share a trait: their results can be re-derived from existing materials, or their correctness has criteria a machine can execute. Summaries and presentations can be regenerated, checks can be re-run; human presence adds nothing, and withdrawal loses nothing. The range machines can take on keeps expanding with capability, and collaboration arrangements should cooperate with that expansion, continually withdrawing people from the posts they can leave.

**Matters that must be adjudicated by a person should arrive in adjudicable form, at the cheapest moment.**

Bandwidth is not only exhausted by volume; it is also wasted by form. When questions are scattered through long material, a person pays the cost of searching before real judgment can begin; a focused form brings the question, the evidence, and the candidate dispositions to the person together, and attention lands directly on the trade-off. Timing is a cost as well: the later the same deviation is discovered, the dearer the correction and the wider its reach. The form and the timing of delivery decide how much value the same adjudication returns.

## Boundaries

**Where the person is not the bottleneck, this article's accounting does not apply.**

Where correctness can be verified by machines in a closed loop, where errors are cheap and reversible, where the bottleneck lies in compute or data — what needs fixing is the machine and the environment. The accounting of judgment bandwidth holds in one kind of place only: where human expression, understanding, judgment, or accountability begins to limit the system's output.

**Economizing judgment bandwidth does not aim to reduce human participation.**

The aim is to raise the value per judgment. The number of occasions may stay the same or even grow; what changes is the content of each occasion: away from searching, rereading, and course correction, toward the trade-offs only a person can provide.

**This article does not depend on any specific bandwidth number.**

The argument needs only one directional fact: the human channel of explicit judgment does not grow along with machine capability. Measuring the channel and its numbers belongs to empirical research, and revisions to the numbers do not shake the structure.

**The carrier, organization, and governance of judgments belong to later design.**

How judgments are recorded, what unit organizes them, how falling out of truth is discovered, and how adjudication is delivered are developed by the later arguments and the specification layer; this article supplies the economic premise they share.

## Objections

**As models keep getting stronger, will human judgment stop being scarce?**

What the strengthening takes over is stopgap contribution. Constitutive judgments exist with the definition of collaboration: who sets the goal, who accepts the risk, in whose name the commitment is made — questions that need a person's answer at any level of capability. The stronger the machine, the larger the output, and the more output each human judgment leverages — scarcity is not relieved by machine progress; it deepens as the leverage grows.

**Recording judgments consumes bandwidth too — will it cost more than it saves?**

Recording is a one-time expense; retelling is an expense repeated with every consumption — the more occasions there are, the better recording pays. The admission criterion caps the total: only judgments whose retelling cost exceeds their maintenance cost are made explicit. Nor does making explicit require writing everything out in advance — load-bearing judgments often surface only when deviated from; record them once discovered, and the record converges through iteration.

**Attention scarcity is an old topic — what is new here?**

The role changed. When machines were operated by people, attention research asked how people understand and command machines, optimizing the smoothness of operation; once machines became executors, human judgment became the limiting factor of output, and what needs economizing shifted from operating attention to judgment and accountability. The experience accumulated around the old constraint remains valid, but it needs to be reorganized around the new one.

**Isn't this a topic for interface design?**

Interfaces optimize the efficiency of a single consumption; organization decides which consumptions need to happen at all. The cheapest review is the one that need not happen: judgments already made explicit need no retelling, regenerable presentations need no manual upkeep, and questions already adjudicated need no repeated escalation. Interface and organization complement each other, and organization sits beneath the interface.

## Conclusion

Human judgment bandwidth is the scarce resource: machine generation and execution keep growing, the human channel for explicit expression, continuous judgment, and accountability stays nearly constant, and the bottleneck of collaborative systems shifts to human judgment accordingly.

There are three directions for economizing it: make judgments explicit once and keep reusing them, so retelling stops at the first telling; hand the steps machines can take on to machines, withdrawing people from the posts they can leave; and let matters that must be adjudicated by a person arrive in adjudicable form, at the cheapest moment. The three directions serve one goal — that every judgment passing through the narrow channel goes to what only a person can provide.
