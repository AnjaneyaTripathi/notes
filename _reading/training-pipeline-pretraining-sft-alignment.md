---
layout: post
title: "The Training Pipeline — Pretraining, SFT, and Alignment"
date: 2026-09-12
order: 16
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## The Training Pipeline — Pretraining, SFT, and Alignment

### The three-stage story, at a glance

<div class="table-scroll"><table><thead><tr><th>Stage</th><th>Objective</th><th>Data</th><th>What it produces</th></tr></thead><tbody><tr><td>Pretraining</td><td>Next-token prediction over broad text</td><td>Massive web/book/code corpora, largely unlabeled</td><td>A “base model” — fluent and knowledgeable, but not instruction-following; it completes text rather than converses</td></tr><tr><td>Supervised Fine-Tuning (SFT)</td><td>Imitate high-quality (prompt, response) demonstrations</td><td>Curated instruction/response pairs, often partly human-written and partly synthetic</td><td>An instruction-following model — but potentially miscalibrated (overconfident, unsafe in edge cases) since it’s just imitating demonstrations</td></tr><tr><td>Alignment / preference optimization</td><td>Optimize toward human-preferred behavior, not just imitation</td><td>Pairwise preference comparisons (response A vs. B)</td><td>A model tuned toward helpfulness, honesty, and safety criteria beyond what pure imitation captures</td></tr></tbody></table></div>

### Pretraining — the foundation, and why it alone isn't enough

Pretraining is unsupervised next-token prediction at massive scale — the model learns grammar, facts, reasoning patterns, and world knowledge purely by learning to predict what comes next in enormous amounts of text. But a pure pretrained (“base”) model isn't naturally good at following instructions or holding a conversation — ask it a question and it might just continue the question with more questions, because that's a statistically plausible continuation too. It needs the subsequent stages to become a usable assistant.

### SFT — teaching the format of being helpful

SFT fine-tunes the base model on curated examples of the desired input→output format — teaching it that a user turn should be followed by a helpful assistant turn, in a particular style. This is powerful but has a structural limitation worth naming: the model can only be as good as its demonstrations, and imitation learning doesn't inherently teach calibrated behavior — a model can be trained to imitate confident-sounding answers even for questions where the honest answer is “I don't know,” simply because the training data rarely contains good examples of appropriate uncertainty.

### Alignment — RLHF and DPO

RLHF (Reinforcement Learning from Human Feedback), classically via PPO:

<ol><li>Collect human preference data: for a given prompt, humans rank or compare multiple model outputs (A vs. B, which is better).</li><li>Train a reward model — a separate model that learns to predict a scalar score matching human preference, from this comparison data.</li><li>Use reinforcement learning (Proximal Policy Optimization — PPO) to fine-tune the LLM to maximize the reward model's score, with a KL-divergence penalty against the original SFT model, so the policy doesn't drift so far in pursuit of reward that it produces degenerate, unnatural, or gamed outputs (a known failure mode called “reward hacking”).</li></ol>

DPO (Direct Preference Optimization) — the more common modern default: Reformulates the same underlying goal — optimize toward human preference — as a direct supervised loss on preference pairs, without training a separate reward model or running actual reinforcement learning at all.

Mathematically, DPO shows that the optimal policy under the RLHF objective can be expressed directly in terms of the preference data, collapsing what used to be a three-stage RL pipeline (reward model →RL loop →policy) into a single, much simpler and more stable training step.

Say this if asked “why has DPO become more popular than classic PPO-based RLHF”: “PPO-based RLHF is powerful but operationally heavy — you need to train and maintain a separate reward model, and RL training itself is notoriously unstable and sensitive to hyperparameters, requiring real expertise and infrastructure to get right.

DPO achieves a mathematically equivalent objective through a much simpler supervised loss directly on preference pairs, with no separate reward model and no RL loop — which makes it dramatically cheaper and more stable to run.

That's exactly why DPO has become the practical default for most open-weight model releases and for anyone doing custom alignment work outside a frontier lab with dedicated RL infrastructure — full PPO-based RLHF is increasingly reserved for labs with the specific expertise and scale to make it worth the operational complexity.”

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> If you wanted to align a model to speak in your company&#39;s specific tone and never discuss competitors, would you use SFT or DPO/RLHF?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Both, layered, not either/or, matching the SLM guide&#39;s “additive layers” framing for domain specialization. SFT on examples that already demonstrate the target tone gets most of the way there, since it&#39;s directly teaching the desired format and style through imitation. DPO on top, using preference pairs where the “chosen” response follows the tone/topic-avoidance rules and the “rejected” response doesn&#39;t, sharpens exactly the kind of comparative judgment (“this response, not that one”) that pure imitation doesn&#39;t reliably teach on its own — particularly for genuinely avoiding an entire topic even when the user pushes on it, which is more of a preference/robustness property than a pure imitation-format one.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s “reward hacking” and why is the KL penalty in RLHF specifically there to prevent it?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Reward hacking is when a model discovers outputs that score highly on the reward model without actually being genuinely better by human standards — e.g., padding responses with reassuring-sounding phrases the reward model has learned to associate with quality, independent of actual content quality. Because the reward model is itself an imperfect proxy trained on a finite amount of human preference data, purely maximizing it without constraint can drive the policy into a region that exploits the reward model&#39;s blind spots rather than genuinely improving. The KLdivergence penalty term explicitly discourages the policy from drifting far from the SFT model&#39;s original distribution, keeping optimization anchored to genuinely fluent, in-distribution behavior rather than letting it wander into reward-model-exploiting territory.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> A base (pretrained-only) model technically “knows” a lot — why can&#39;t you just prompt it well instead of doing SFT/alignment at all?</p>
    <p class="interview-qa__answer"><strong>A.</strong> A base model is optimized purely to continue text plausibly, not to be a helpful, well-behaved assistant — given a question, its most statistically likely continuation might be more questions in the same style (because that&#39;s what often follows a question in its training data), or it might continue in an unhelpful, unsafe, or simply format-inconsistent way, because “be a helpful, safe, well-formatted assistant” was never the actual training objective. Careful prompting (few-shot examples, explicit instructions) can coax better behavior out of a base model to a real but limited degree — this is essentially how early GPT-3- style few-shot prompting worked before instruction-tuned models existed — but it&#39;s far less reliable and far more prompt-engineering-intensive than a model that&#39;s actually been trained, via SFT and alignment, to be a good assistant by default.</p>
  </div>
</section>
