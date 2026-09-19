---
layout: post
title: "Model Parameters — Architecture Hyperparameters & Sampling Controls"
date: 2026-09-13
order: 17
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Model Parameters — Architecture Hyperparameters & Sampling Controls

### Two different senses of “model parameters” — disambiguate up front

This phrase is genuinely ambiguous in an interview setting, and it's worth clarifying (out loud, briefly) which sense is meant, since the two are quite different: architecture hyperparameters (what defines the model's size and shape, fixed at training time) versus sampling/inference parameters (knobs you control at inference time, per request, on an already-trained model).

### Architecture hyperparameters

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Hyperparameter</th><th scope="col">What it controls</th><th scope="col">Effect of increasing it</th></tr></thead>
<tbody>
<tr><td>Number of layers (depth)</td><td>How many stacked transformer blocks</td><td>More capacity for complex, compositional reasoning; more compute per token; risk of training instability at very high depth without careful residual/normalization design</td></tr>
<tr><td>Hidden dimension size</td><td>The width of each token's vector representation throughout the model</td><td>More representational capacity per layer; parameter count grows roughly quadratically with hidden dimension, since most weight matrices are dim × dim</td></tr>
<tr><td>Number of attention heads</td><td>How many parallel attention “views” per layer</td><td>More specialized relationship-tracking capacity; typically scales with hidden dimension so each head keeps a reasonable per-head dimension</td></tr>
<tr><td>Feed-forward expansion ratio</td><td>How much the FFN's intermediate dimension expands relative to hidden dimension</td><td>More capacity in the sub-layer that stores most factual/pattern knowledge; a major driver of total parameter count</td></tr>
<tr><td>Vocabulary size</td><td>Number of distinct tokens the tokenizer can produce</td><td>Larger vocabulary → shorter sequences for the same text, but a bigger embedding/output matrix</td></tr>
<tr><td>Context length</td><td>Maximum sequence length the model is trained/configured to handle</td><td>More usable context, at quadratic compute cost in attention</td></tr>
</tbody>
</table>
</div>

 The intuition for why parameter count scales roughly with hidden-dimension squared: most of a transformer's weight matrices — the Q/K/V projections, the feed-forward layers — are roughly hidden_dim × hidden_dim (or a multiple of it) in shape. Doubling the hidden dimension roughly quadruples the size of each of these matrices, which is why parameter count grows much faster than model “width” alone would suggest, and why architecture size classes (7B, 70B, etc.) tend to jump by large multiples rather than smooth increments.

### Scaling laws — the Chinchilla-style insight

For a fixed compute budget, there's an empirically-derived optimal balance between model size and training data volume — many earlier large models were, in retrospect, meaningfully undertrained relative to their parameter count (too many parameters, not enough training tokens for that size to be used well). This is part of why data quality and quantity have become as central a lever as raw parameter count in more recent model releases — including the “textbook-quality” curated data approach behind smaller models like Phi (covered in the SLM/LLMOps guide).

### Sampling / inference parameters

<ul>
  <li>Temperature: scales the logits before the softmax that converts them to a probability distribution. Near 0 makes the distribution sharply peaked around the single most likely token (closer to deterministic, greedy decoding); higher values flatten the distribution, increasing diversity/randomness at the cost of increased likelihood of less-plausible tokens.</li>
  <li>Top-p (nucleus sampling): rather than a fixed cutoff, sample only from the smallest set of tokens whose cumulative probability exceeds p (e.g. 0.9) — this adaptively narrows or widens the candidate set depending on how confident the model&#39;s distribution is at that specific step, unlike temperature which reshapes the whole distribution uniformly.</li>
  <li>Top-k: a simpler, non-adaptive cutoff — only ever consider the k highest-probability tokens, regardless of how much cumulative probability they actually represent.</li>
  <li>Repetition/frequency penalty: reduces the probability of tokens already used recently in the output, discouraging loops or unwanted repetition — relevant for open-ended generation, but should typically be reduced or disabled for structured extraction tasks where legitimate repetition (e.g., repeated field names across a JSON array) is actually correct output, not a defect. Practical guidance to have ready: structured extraction, NL2SQL generation, and invoice-field extraction all favor low temperature (near 0) — the goal is determinism and repeatability on a task with a genuinely correct answer, not creative diversity. Open-ended drafting or brainstorming favors higher temperature, where variety is actually valuable. </li>
</ul>

### The “is temperature=0 fully deterministic” trap

A very plausible, specific follow-up: even at temperature 0 (which should, in principle, always pick the single highest-probability token — pure greedy decoding), output can still vary slightly run-to-run in practice, due to factors below the sampling-parameter level entirely:

<ul>
  <li>Floating-point non-associativity: on GPUs, the order in which parallel operations are summed can vary slightly (e.g. depending on batch composition or hardware scheduling), producing tiny numerical differences that can occasionally flip which token has the (very marginally) highest logit when two tokens are extremely close in probability.</li>
  <li>Batching effects: in a production serving system, a request&#39;s exact numerical results can be influenced by what other requests happen to be batched alongside it, since batched matrix operations aren&#39;t always perfectly independent per-row at the floating-point level.</li>
  <li>MoE routing: in a Mixture-of-Experts model, the router&#39;s expert-selection decision can, in some implementations, be sensitive to batch composition too — a token routed to a slightly different expert due to batching effects can produce different output. Say this if asked directly: “Not quite guaranteed, in practice, even though it should be in theory. Temperature 0 removes the sampling randomness — it always selects the highest-probability token rather than sampling from a distribution — but production inference introduces other sources of nondeterminism below that level: floating-point summation order isn&#39;t perfectly associative on GPU hardware, and that can vary depending on batching and hardware scheduling, occasionally flipping the ranking between two very close logits. So temperature 0 gets you very close to deterministic, and it&#39;s the right choice when you want maximum reproducibility, but I wouldn&#39;t claim it as an absolute guarantee in a production serving environment, and I&#39;d design any system that depends on true determinism (e.g., caching identical requests) with that caveat in mind.”</li>
</ul>

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> For your NL2SQL agent, what temperature and sampling settings would you actually use, and why?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Low temperature — close to 0 — since SQL generation from a well-understood schema and question has a genuinely correct target, not a space of equally-valid creative variations; diversity here mostly just increases the chance of a subtly wrong query. I&#39;d also disable or minimize repetition penalty, since valid SQL frequently and correctly repeats tokens (column names, table aliases) that a repetition penalty would otherwise discourage for no good reason. If the agent needed to generate multiple candidate queries to self-consistency-check against each other, I&#39;d consider a moderate temperature specifically for that candidate-generation step, but the final selected/executed query path stays low-temperature.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> If a client complains that your voice or chat model gives noticeably different answers to the same question asked twice, how would you investigate?</p>
    <p class="interview-qa__answer"><strong>A.</strong> First check the actual sampling configuration — if temperature isn&#39;t explicitly set near 0, meaningful output variation between identical requests is expected behavior, not a bug, and the fix might just be tightening the sampling settings if determinism is actually the requirement. If temperature is already low/zero and variation still shows up, I&#39;d look at the serving-stack-level sources from the earlier discussion — batching-related floating-point effects, or (if it&#39;s an MoE model) potential router sensitivity to batch composition — since those can produce real variation even under nominally deterministic settings, and are worth ruling in or out explicitly rather than assuming the model itself is somehow unstable.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Does a model with more parameters always outperform a smaller one on a given task?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Not necessarily, and this connects directly to the SLM argument in the companion guide — per the Chinchilla-style scaling-law insight, a larger model that&#39;s undertrained relative to its size can underperform a smaller, well-trained, well-fine-tuned model, especially on a narrow task the smaller model was specifically adapted for. Raw parameter count is one input to capability, not the whole story — training data quality/quantity and task-specific fine-tuning both matter enormously, which is exactly why a fine-tuned 7-8B model can match or beat a much larger generalist model on its specific narrow slice, as covered in the SLM guide&#39;s the earlier discussion.</p>
  </div>
</section>
