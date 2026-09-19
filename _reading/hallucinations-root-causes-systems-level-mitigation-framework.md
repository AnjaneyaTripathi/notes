---
layout: post
title: "Hallucinations — Root Causes and a Systems-Level Mitigation Framework"
date: 2026-09-03
order: 7
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Hallucinations — Root Causes and a Systems-Level Mitigation Framework

### Why this deserves a causal framework, not just a technique list

Most candidates answer “how do you reduce hallucination” with a flat list of techniques — RAG, lower temperature, structured output. That's not wrong, but it reads as memorized rather than understood. The stronger answer explains why hallucination happens in the first place, and maps each mitigation to the specific cause it addresses — which is what this section builds toward.

### Root cause 1 — next-token prediction optimizes for plausibility, not truth

The core training objective (the earlier discussion) rewards producing a statistically likely continuation given the training distribution — and a fluent, confident-sounding wrong answer is frequently more statistically plausible under that objective than an awkward “I don't know,” especially since SFT and alignment data (the earlier discussion) rarely contain rich examples of well-calibrated uncertainty. The model was never directly optimized to know what it doesn't know — it was optimized to sound like a helpful assistant, and sounding confident is part of that learned pattern, independent of whether the underlying content is actually correct.

### Root cause 2 — parametric knowledge is compressed and lossy

Facts learned during pretraining are encoded as statistical patterns distributed across billions of weights (largely in the feed-forward layers, per the earlier discussion) — not stored and retrieved the way a database stores a record. This means the model can genuinely “misremember,” blend two similar facts together, or extrapolate a plausible-sounding but incorrect value when its compressed representation of a fact is imperfect or when two facts are close enough in its learned representation to interfere with each other. This is directly relevant to numeric hallucination in extraction tasks (like invoice processing) — a model “correcting” a number to something more plausible-looking is this exact failure mode in action.

### Root cause 3 — distribution shift at inference time

If a query touches something rare in the training data, genuinely recent (post-training-cutoff), or narrowly domain-specific/proprietary (an internal schema, a client's specific terminology), the model has weak or no real signal for it — and, per root cause 1, its learned behavior is still to produce a fluent-sounding answer regardless, filling the gap with its best statistical guess rather than reliably recognizing and flagging the gap itself.

### Root cause 4 — exposure bias and error compounding in long generations

Because generation is autoregressive (the earlier discussion) — each token conditions on every token generated before it — a small error early in a long generation or multi-step reasoning chain can compound, since every subsequent token is now conditioning on that earlier mistake as if it were true. This is especially relevant to long tool-use chains or multi-step agentic reasoning (the earlier discussion), where an early wrong assumption can steer many subsequent steps further off course before anything catches it.

### Mitigations, mapped to the cause they actually address

Root cause Mitigation Why it addresses that specific cause (1) Miscalibrated confidence Alignment (RLHF/DPO) specifically tuned for calibrated refusal/uncertainty; confidence thresholds + human-in-the-loop review for consequential outputs Directly targets the model's learned tendency to sound confident regardless of correctness, by either training against it or adding an external check that doesn't rely on the model's self-reported confidence (2) Lossy parametric knowledge RAG/grounding — give the model the actual fact instead of relying on its compressed memory of it; execution-based validation (e.g., actually running generated SQL and checking it executes correctly and returns a sane result, rather than trusting fluency as a correctness proxy) Removes the need for the model to reconstruct a fact from lossy internal representation at all — it's reading the fact, not remembering it (3) Distribution shift Domain-specific fine-tuning or RAG over current/proprietary data; explicit “insufficient information, I don't know” fallback paths built into prompting and, ideally, reinforced during alignment Closes the specific knowledge gap (via fine-tuning/RAG) or at least makes the absence of reliable knowledge something the system can act on instead of silently guessing (4) Error compounding Reflection/self-critique passes (the earlier discussion); shorter, more structured reasoning chains; grammar-constrained decoding (the earlier discussion) to prevent format-level drift from compounding into content-level drift Interrupts the chain before an early error can propagate unchecked through many subsequent conditioned generations This causal framing is the single highest-leverage thing in this whole document. It turns “how do you reduce hallucination” from a list-recall answer into a genuine systems answer — and it's exactly the register a technical director-level interviewer is listening for: not “here are five techniques,” but “here's why the model fails, and here's which technique addresses which failure.” ### 11.7 Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> If you had to pick one single highest-leverage intervention to reduce hallucination in a production system, what would it be and why?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Grounding via retrieval/RAG plus execution-based validation, together — because root cause 2 (lossy parametric knowledge) and root cause 3 (distribution shift) are, in my experience, the two most common sources of hallucination in real production systems, especially anything touching domain-specific or proprietary data, which is most enterprise use cases. RAG addresses both directly by giving the model the actual current fact instead of asking it to reconstruct one from imperfect memory. Execution-based validation — actually running generated SQL, or checking that extracted invoice totals reconcile — closes the loop by catching cases where grounding was imperfect or the model still deviated from the retrieved context, rather than trusting fluency as a signal of correctness. Confidence-based techniques (root cause 1) and reflection (root cause 4) both add real value, but I&#39;d consider them a second layer on top of solid grounding and validation, not a substitute for it.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Can hallucination ever be fully eliminated?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — not with current architectures, and I&#39;d be direct about that rather than overselling any technique. Every mitigation reduces the probability of a specific failure mode; none of them structurally guarantee correctness the way, say, grammar-constrained decoding structurally guarantees syntactic validity. This is exactly why, for consequential outputs — a generated SQL query about to run against production data, a financial figure extracted from an invoice — I&#39;d always pair model-side mitigations with an external, nonmodel check (execution validation, reconciliation, or human review) rather than treating “we reduced hallucination” as equivalent to “we eliminated the risk.”</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you distinguish, when debugging a specific hallucination in production, which root cause was actually responsible?</p>
    <p class="interview-qa__answer"><strong>A.</strong> I&#39;d look at what kind of error it was. If the model confidently answered something it plausibly had little or no real training signal for — an obscure or very recent fact, or something specific to the client&#39;s proprietary data — that points to distribution shift (cause 3), and the fix is better grounding for that specific gap. If the error looks like two similar facts got blended or a specific detail got subtly “corrected” toward something more generic-sounding, that points to lossy parametric compression (cause 2), and grounding is again the fix, though the diagnosis is different — the knowledge is more mainstream but still got garbled in reconstruction. If the error only appears deep into a long multi-step generation or tool-use chain, and traces back to an earlier, smaller misstep, that&#39;s error compounding (cause 4), and the fix is more about adding intermediate validation/reflection checkpoints than about grounding at all. Treating “hallucination” as one undifferentiated problem, rather than diagnosing which of these it actually is, is exactly what leads to applying the wrong fix.</p>
  </div>
</section>
