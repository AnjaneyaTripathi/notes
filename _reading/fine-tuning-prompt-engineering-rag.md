---
layout: post
title: "Fine-Tuning vs. Prompt Engineering vs. RAG — When to Use Which"
date: 2026-09-04
order: 8
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Fine-Tuning vs. Prompt Engineering vs. RAG — When to Use Which

When to Use Which This topic is the natural synthesis of the earlier discussion and 6 — you already have most of the raw material. What's new here is the decision framework: given a business problem, which lever do you actually pull, and why. This is very likely asked as a direct, standalone question (“if a client wanted to improve their chatbot's accuracy, would you fine-tune or use RAG?”) — so the framework below is worth memorizing as a reusable answer template.

### The three levers, defined against each other

Prompt Engineering RAG Fine-Tuning What it changes How you ask — instructions, examples, format, given to a frozen, unmodified model What the model has access to at inference time — external, retrievable knowledge What the model knows/how it behaves — its actual weights are updated Modifies model weights? No No Yes Speed to implement Minutes to hours Days (needs pipeline: chunking, embedding, indexing, retrieval) Days to weeks (data curation, training runs, evaluation, deployment) Cost Lowest — just inference calls Medium — indexing/storage/retrieval infra + slightly more tokens per call (context injection) Highest — compute for training, plus MLOps to serve/version a custom model Best for injecting new factual knowledge Poor — limited to what fits in-context, doesn't scale to large corpora Best fit — retrieves exactly what's needed, corpus can be arbitrarily large Poor — bakes a snapshot in time into weights; stale immediately after any data change Best for changing style/tone/format Good for simple/consistent cases Not directly relevant Best fit — can durably shift how the model writes without needing instructions every time

Prompt Engineering RAG Fine-Tuning Best for teaching a new skill/reasoning pattern Limited (few-shot can help a little) Not applicable Best fit — e.g., teaching a model a company-specific reasoning process, a proprietary output schema, or domain-specific classification behavior Handles frequently-changing data N/A Best fit — update the source documents, no retraining needed Poor — every update requires retraining/redeployment Data requirements None (or a handful of examples) A document corpus (unstructured is fine) A curated, often labeled dataset of example input/output pairs — quality and volume both matter Explainability/auditability High (you can literally read the prompt) High (can cite the exact retrieved source) Low (knowledge is implicit in weights, no way to point to “why” it said something) Risk if done wrong Low — easy to iterate/rollback Low-medium — bad retrieval degrades quality but is diagnosable (the earlier discussion) High — can cause catastrophic forgetting (degrading capabilities the base model already had), needs careful evaluation before shipping

### The decision framework — this is the actual reusable answer

<div class="table-scroll">
<table>
<thead><tr><th scope="col">Choice</th><th scope="col">When to use</th><th scope="col">Why</th></tr></thead>
<tbody>
<tr><td>Prompt engineering</td><td>The knowledge is already in the model or supplied in the prompt, and the need is instruction, tone, format, or reasoning approach</td><td>Cheapest and fastest lever; try it first</td></tr>
<tr><td>RAG</td><td>Knowledge is current, private, large, or changes frequently</td><td>Grounds answers in retrieved documents without retraining</td></tr>
<tr><td>Fine-tuning</td><td>The need is behavioral consistency or a specialized skill that prompting cannot reliably guarantee at scale</td><td>Changes model behavior, but is the most expensive and least flexible lever</td></tr>
</tbody>
</table>
</div>

Step 1: Is it a knowledge problem or a behavior problem?

<ul>
  <li>Knowledge problem (“the model doesn&#39;t know X, or doesn&#39;t know current X”) →RAG, almost always. This is the large majority of enterprise use cases (internal docs, policies, product catalogs, client-specific data).</li>
  <li>Behavior problem (“the model knows the facts but responds in the wrong style, format, tone, or reasoning approach”) →prompt engineering first, fine-tuning if prompting can&#39;t achieve it reliably/durably enough. Step 2: If it&#39;s a knowledge problem, how volatile is the knowledge?</li>
  <li>Frequently changing (prices, policies, live status, anything updated more than, say, monthly) →RAG — fine-tuning would be stale on arrival.</li>
  <li>Truly static, foundational domain knowledge (e.g., deep understanding of a stable regulatory framework, a specialized technical vocabulary the base model handles poorly) →fine-tuning can be justified, but RAG is still usually cheaper and equally effective, so the bar for choosing</li>
</ul>

fine-tuning here should be high. Step 3: If it's a behavior problem, can prompting solve it reliably?

<ul>
  <li>Try prompt engineering first — it&#39;s nearly free to iterate on. Push on system prompts, few-shot examples, structured output constraints, chain-of-thought scaffolding.</li>
  <li>If prompting is inconsistent at scale, or the desired behavior needs to be invisible/implicit (you don&#39;t want to spend context-window budget re-explaining the same instructions on every single call, or need it to reliably hold under adversarial/edge-case inputs) → that&#39;s when fine-tuning earns its cost. Step 4: These aren&#39;t mutually exclusive — the real answer is usually “prompting + RAG,” sometimes “+ fine-tuning too”</li>
  <li>The overwhelmingly common production pattern is RAG with well-engineered prompts (grounding instructions, citation-forcing, output format constraints) — this alone solves the large majority of enterprise GenAI use cases.</li>
  <li>Fine-tuning is added on top, not instead, when you specifically need durable behavioral/stylistic change or domain-specific reasoning patterns that prompting can&#39;t reliably achieve — e.g., fine-tuning a model to reliably output a specific structured schema a client&#39;s downstream system depends on, or to adopt a very specific analytical reasoning style consistently.</li>
</ul>

### A concrete example to have ready (interviewers like a worked scenario, not

just a table) “Say a client wants an internal chatbot that answers HR policy questions. The policies update periodically (leave policy, benefits, WFH rules), so I'd lead with RAG — index the policy documents, retrieve relevant sections per query, and use prompt engineering to enforce grounded, cited answers and an appropriate tone. I wouldn't fine-tune on the policy content itself, since it changes and fine-tuning would need to be redone every update. I'd only consider fine-tuning if, say, the client needed the bot to always respond in a very specific structured format their ticketing system parses, and prompting alone wasn't holding that format reliably across edge cases — and even then, I'd try harder on prompting and structured-output constraints before reaching for fine-tuning, since it's the most expensive and least flexible lever.”

### Cost/complexity ordering — a simple heuristic to state directly

“Try prompt engineering first (cheapest, fastest to iterate) → layer in RAG when the problem is a knowledge gap the prompt can't solve → reach for fine-tuning only when neither solves a genuine behavioral/stylistic/format consistency problem, since it's the most expensive and hardest to maintain.” This ordering itself — cheapest/most-reversible lever first — is a good thing to state explicitly, since it signals cost-conscious engineering judgment, which matters a lot in a consulting context where you're managing client budgets.

### A nuance worth having in your back pocket: RAG and fine-tuning are not

actually mutually exclusive

<ul>
  <li>RAFT (Retrieval-Augmented Fine-Tuning) and similar approaches specifically fine-tune a model to better use retrieved context (distinguishing relevant from irrelevant retrieved documents, citing correctly) — this is fine-tuning in service of better RAG behavior, not a competing alternative to it. Mentioning this shows you understand these techniques compose rather than compete.</li>
  <li>Similarly, you can fine-tune embeddings themselves (domain-adapting the retrieval model) without touching the generator LLM at all — a cheaper, more targeted form of fine-tuning that improves RAG&#39;s retrieval stage specifically (ties back to the earlier discussion context precision/recall).</li>
</ul>

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> A client wants their support bot to know about products released after the model&#39;s training cutoff. Fine-tune or RAG?</p>
    <p class="interview-qa__answer"><strong>A.</strong> RAG — this is a pure knowledge-recency problem, and fine-tuning would require retraining every time the product catalog changes, which doesn&#39;t scale operationally.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> When would you actually recommend fine-tuning to a client, given it&#39;s the most expensive option?</p>
    <p class="interview-qa__answer"><strong>A.</strong> When the need is behavioral consistency or a specialized skill that prompting can&#39;t reliably guarantee at scale — e.g., a strict output schema a downstream system depends on, a very specific domain reasoning style, or classification behavior on a task where few-shot prompting isn&#39;t hitting required accuracy — and I&#39;d want to first confirm prompting and RAG genuinely can&#39;t solve it, since fine-tuning also carries risks like catastrophic forgetting and ongoing maintenance cost.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s catastrophic forgetting, and why does it matter when deciding whether to fine-tune?</p>
    <p class="interview-qa__answer"><strong>A.</strong> It&#39;s when fine-tuning on a narrow dataset degrades the model&#39;s pre-existing general capabilities, because the weight updates optimize for the new narrow objective at the expense of previously-learned behavior. It&#39;s a real risk with full fine-tuning, which is part of why techniques like LoRA (parameter-efficient fine-tuning, updating a small set of additional parameters rather than the full model) are often preferred in production — they reduce this risk and are cheaper to train/store/swap.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Can prompting alone ever fully replace RAG?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Only if all the needed knowledge fits reliably within the context window and doesn&#39;t need to scale beyond it — i.e., “long-context stufing” instead of retrieval. For small, static knowledge bases this can genuinely work and is simpler to build than a full RAG pipeline, but it doesn&#39;t scale to large or frequently-changing corpora, and stufing very long context has its own cost and “lost in the middle” quality tradeoffs (the earlier discussion).</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s LoRA, and why is it relevant to this fine-tuning discussion?</p>
    <p class="interview-qa__answer"><strong>A.</strong> LoRA (Low- Rank Adaptation) is a parameter-efficient fine-tuning technique that freezes the base model&#39;s weights and trains only small, low-rank additional matrices injected into the model&#39;s layers. It&#39;s dramatically cheaper (in compute and storage) than full fine-tuning, reduces catastrophic forgetting risk since the base weights are untouched, and lets you maintain multiple lightweight “adapters” for different tasks/clients on top of one shared base model — which is very relevant in a multi-client consulting context.</p>
  </div>
</section>
