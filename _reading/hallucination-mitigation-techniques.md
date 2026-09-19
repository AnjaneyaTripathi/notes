---
layout: post
title: "Hallucination Mitigation Techniques (Prompting, RAG, Fine-Tuning)"
date: 2026-09-02
order: 6
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Hallucination Mitigation Techniques (Prompting, RAG, Fine-Tuning)

RAG, Fine-Tuning)

### What “hallucination” actually is (precise definition, not just “the model makes

things up”) A hallucination is when an LLM generates output that is fluent and confident but factually incorrect, unsupported by any given context, or logically inconsistent — the danger is specifically that it's stated with the same confidence as correct information, so it's not self-flagging. Two useful sub-categories to distinguish in an interview (shows nuance):

<ul>
  <li>Intrinsic hallucination: the output directly contradicts the source/context it was given (e.g., context says “founded in 1998,” model says “founded in 1989”).</li>
  <li>Extrinsic hallucination: the output can&#39;t be verified from the given source at all — it&#39;s not necessarily contradicted, just fabricated/unsupported (e.g., inventing a statistic, a citation, or a plausible-sounding but nonexistent API method). Say this if asked to define it: “Hallucination is when a model produces fluent, confident-sounding output that&#39;s factually wrong, unsupported by the provided context, or internally inconsistent — the risk isn&#39;t just that it&#39;s wrong, it&#39;s that it&#39;s indistinguishable in tone from correct output, so downstream users or systems can&#39;t easily tell.”</li>
</ul>

### Why hallucination happens at all (root cause — good to have ready)

LLMs are trained to predict the statistically most plausible next token, not to verify truth. They have no built-in mechanism to distinguish “I actually know this” from “this sounds like something that could complete this sentence.” Contributing factors:

<ul>
  <li>Parametric knowledge limits/staleness: the model only “knows” what was in its training data, up to its cutoff, and can conflate/misremember facts (especially long-tail, rarely-seen facts).</li>
  <li>Training objective mismatch: next-token prediction and even RLHF reward “sounding helpful and confident” more directly than they reward “admitting uncertainty,” which can bias models toward fabricating rather than declining to answer.</li>
  <li>Context underor mis-utilization: even when correct information is provided (e.g., via RAG), the model can still misweight, ignore, or misread it — “lost in the middle” effects mean models sometimes pay less attention to information in the middle of a long context window than at the start/end.</li>
</ul>

### Mitigation via Prompting (cheapest, fastest to implement, first line of defense

)

<ul>
  <li>Explicit grounding instructions: directly instruct the model to answer only using provided context, and to explicitly say “I don&#39;t know” or “this isn&#39;t in the provided information” if the</li>
</ul>

answer isn't there — rather than letting silence-avoidance drive it to guess.

<ul>
  <li>Chain-of-thought / reasoning prompts: asking the model to reason step-by-step before answering reduces certain classes of errors (especially logical/arithmetic ones) by giving it “space” to work through the problem rather than jumping straight to an answer.</li>
  <li>Few-shot examples with explicit “don&#39;t know” cases: showing examples in the prompt where the correct behavior is to decline/hedge, not just examples of confident correct answers, calibrates the model toward appropriate uncertainty.</li>
  <li>Citation-forcing prompts: require the model to cite the specific source/chunk for every factual claim it makes — this both makes fabrication harder (there&#39;s no chunk to point to) and gives a human a way to verify.</li>
  <li>Structured output constraints: for factual extraction tasks, constraining output to a schema (e.g., “extract exactly these fields, or null if absent”) reduces the model&#39;s room to freely improvise.</li>
  <li>Self-consistency / self-critique prompting: ask the model to review its own answer against the provided context afterward (“does every claim above appear in the source? flag anything that doesn&#39;t”) as a second pass before finalizing.</li>
  <li>Lower temperature / more deterministic decoding for factual tasks — higher temperature sampling increases creative diversity but also increases the chance of drifting from grounded facts (tradeoff: too low can also make answers overly rigid/repetitive for genuinely open-ended tasks). Limitation to acknowledge (shows honesty/depth): prompting alone can reduce but never fully eliminate hallucination — it&#39;s steering the model&#39;s behavior, not giving it new verified knowledge or a way to actually check facts.</li>
</ul>

### Mitigation via RAG (grounding in retrieved facts — covered in depth in

the earlier discussion)

<ul>
  <li>The core mechanism: instead of relying purely on parametric (memorized) knowledge, the model is given retrieved, verifiable context at inference time and instructed to answer from it — turning a closed-book task into an open-book one.</li>
  <li>Why RAG helps specifically with hallucination: it directly addresses the “stale/uncertain parametric knowledge” root cause by supplying current, specific, sourced information instead of asking the model to recall it from training.</li>
  <li>Why RAG alone isn&#39;t sufficient (the connection back to the earlier discussion faithfulness point): the model can still ignore or misweight the retrieved context and hallucinate anyway — retrieval quality problems (irrelevant/insufficient context, per the earlier discussion failure modes) directly cause hallucination even when the mechanism of RAG is working as designed. This is why faithfulness/groundedness checking (verifying every claim traces back to retrieved context, often via a second LLM call or NLI-style entailment model) is treated as a separate, necessary layer on top of RAG itself, not a redundant one.</li>
  <li>Citation-forcing in RAG specifically: requiring inline citations to specific retrieved chunks is one of the most effective practical techniques — it&#39;s much harder for a model to fabricate a claim and correctly cite a real chunk that supports it than to just fabricate the claim alone.</li>
</ul>

### Mitigation via Fine-Tuning (most expensive, but structurally different fix)

<ul>
  <li>Domain-specific fine-tuning: training on curated, domain-accurate data reduces hallucination within that domain by making correct, specific knowledge part of the model&#39;s parametric knowledge rather than something it has to guess at or retrieve — most useful when the domain has consistent terminology/facts the base model handles poorly (e.g., a company&#39;s internal product taxonomy).</li>
  <li>RLHF / preference fine-tuning specifically targeting honesty: reward models can be trained to explicitly reward “admits uncertainty when appropriate” and penalize confident fabrication — this directly counteracts the “RLHF rewards sounding helpful/confident” root cause mentioned earlier. This is roughly the mechanism behind why newer model generations tend to hallucinate less than older ones on ambiguous/unknown questions.</li>
  <li>Fine-tuning on retrieval-augmented behavior itself: some approaches fine-tune the model specifically to better use retrieved context faithfully (i.e., to improve the “does the model actually leverage what RAG gives it” problem from the earlier discussion), rather than fine-tuning it to know more facts directly. Important limitation to state clearly (a very likely follow-up trap): fine-tuning is not a good tool for injecting frequently-changing or very specific factual knowledge — it&#39;s slow, expensive, requires retraining/redeployment for every update, and models can still hallucinate confidently even on fine-tuned domains if a query falls outside the fine-tuning data&#39;s coverage. RAG is generally the better tool for volatile or highly specific facts; fine-tuning is better for teaching style, format, domain reasoning patterns, or behavior (like calibrated uncertainty) — not for being a live factual database. This distinction is extremely likely to be probed directly (see the following discussion below), so have it crisp.</li>
</ul>

### The “if you had to prioritize” answer — layered defense framing

The strongest answer treats these as complementary layers, not alternatives — this is the framing to lead with: “I'd think of hallucination mitigation as a layered defense rather than picking one technique. RAG addresses the root cause of stale or uncertain parametric knowledge by grounding answers in retrieved, verifiable facts. Prompting — explicit grounding instructions, citation-forcing, allowing `I don't know' — shapes how the model uses that context and is the cheapest lever to pull first. Finetuning is the right tool when the issue is domain reasoning style or calibrated confidence rather than volatile facts — I wouldn't fine-tune to inject facts that change often, since that's exactly what RAG is better suited for. And on top of all three, I'd add a verification layer — faithfulness/groundedness checking — because even with good retrieval and good prompting, you still need to catch the cases where the model didn't actually use what it was given correctly.”

### Evaluation — how you'd actually measure hallucination (ties back to RAGAS

from the earlier discussion)

<ul>
  <li>Faithfulness score (RAGAS or similar): does every claim in the output trace back to the provided context?</li>
  <li>Human evaluation / red-teaming: especially for high-stakes domains, sampling outputs for manual fact-checking against ground truth remains the gold standard, since automated</li>
</ul>

metrics have their own blind spots.

<ul>
  <li>NLI-based automated checking: using a natural-language-inference model to check whether each generated sentence is “entailed by,” “contradicted by,” or “neutral to” the source context — a scalable proxy for faithfulness that can run in production as a guardrail.</li>
  <li>Benchmark datasets (good to name if pressed): TruthfulQA (tests susceptibility to common misconceptions), HaluEval, FActScore — useful for comparing models, less useful for evaluating your specific application&#39;s outputs, where task-specific eval (like RAGAS on your own data) matters more.</li>
</ul>

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Can you completely eliminate hallucination?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — it&#39;s a structural property of how these models are trained (predicting plausible text, not verifying truth), so the goal is risk reduction and detection through layered defenses — grounding, prompting, verification — not elimination. Any claim of “zero hallucination” should be treated skeptically.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Would you use fine-tuning or RAG to reduce hallucination on frequently-changing factual data (e.g., product pricing)?</p>
    <p class="interview-qa__answer"><strong>A.</strong> RAG — fine-tuning bakes knowledge into model weights at a point in time, so any update requires retraining and redeployment, which doesn&#39;t scale for volatile data. RAG retrieves current data at query time, so updating the underlying documents is enough; no retraining needed.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s “lost in the middle,” and why does it matter for hallucination?</p>
    <p class="interview-qa__answer"><strong>A.</strong> It&#39;s the observed tendency of LLMs to attend more strongly to information at the very start or end of a long context window than information buried in the middle, even when that middle information is directly relevant. Practically, it means simply retrieving the right chunk isn&#39;t sufficient — where it&#39;s placed in the prompt, and how much total context is stuffed in, affects whether the model actually uses it, which is a hallucination risk factor independent of retrieval quality itself.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you build a hallucination detection system for a production RAG app?</p>
    <p class="interview-qa__answer"><strong>A.</strong> I&#39;d add a verification step after generation — either an NLI-style entailment check or a second LLM call — that checks each claim in the output against the retrieved context and flags unsupported claims, combined with requiring inline citations so flagged claims are easy to audit. I&#39;d track a faithfulness metric like RAGAS&#39;s over time as a production quality signal, not just at initial evaluation.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Does a bigger/more capable model hallucinate less?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Generally yes on broad knowledge and reasoning tasks, but it&#39;s not guaranteed on narrow or fast-changing domains — a bigger generalpurpose model can still confidently hallucinate specifics it was never trained on, which is exactly the gap RAG is meant to close regardless of base model size.</p>
  </div>
</section>
