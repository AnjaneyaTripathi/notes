---
layout: post
title: "Tool Calling & Structured/Constrained Decoding"
date: 2026-08-30
order: 3
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Tool Calling & Structured/Constrained Decoding

### The mechanism, one level deeper than “the model calls a function”

At the API level, tool/function calling works by providing the model with a set of tool schemas (name, natural-language description, and a JSON-schema definition of its parameters) alongside the prompt. The model — trained specifically for this — decides whether a tool call is appropriate and, if so, emits a structured output (typically JSON) matching one of the provided schemas, instead of (or interleaved with) natural-language text. Your application code then parses this structured output, executes the actual tool, and feeds the result back into the conversation for the model to continue reasoning with.

### Why tool descriptions matter as much as the prompt itself

The model selects which tool to call, and how to fill its arguments, based substantially on the naturallanguage description provided for each tool — ambiguous or underspecified descriptions are a very common, easily-overlooked cause of wrong-tool selection or malformed arguments, independent of whether the underlying model is otherwise capable. This is a genuinely practical point worth raising unprompted: tool descriptions deserve the same care as prompt engineering, not an afterthought.

### Grammar-constrained decoding — the deeper mechanism behind reliable

structured output Simply asking a model to output valid JSON (via prompting or even via a “JSON mode” flag) reduces but does not eliminate the chance of malformed output — the model is still, at its core, sampling tokens from a probability distribution, and any single sampling step can pick a token that breaks JSON validity. Grammar-constrained (a.k.a. constrained) decoding goes a level deeper: rather than hoping the model's learned behavior produces valid output, the serving stack directly constrains the token sampling process itself at every generation step — computing which next tokens are even grammatically valid given a formal grammar (e.g., a JSON schema compiled into a finite-state grammar or pushdown automaton), and setting the probability of every invalid token to zero before sampling. Say this if asked “does structured output/JSON mode solve hallucination”: “No — and it's worth being precise about exactly what it does and doesn't solve. Grammar-constrained decoding guarantees syntactic validity — the output will always parse as valid JSON matching the schema, because invalid tokens are literally excluded from being sampled at each step, not just discouraged. It does nothing to guarantee the values inside that valid JSON are factually correct — the model can still confidently emit a syntactically perfect but factually wrong invoice total, for example. So structured decoding eliminates an entire class of failure — malformed output, wrong field names, broken parsing — but it's a narrower fix than `solving hallucination,' which is a content-correctness problem, not a format problem.” ### 9.4 Practical tool-calling design points

<ul>
  <li>Argument validation before execution: never trust a model-generated tool call&#39;s arguments blindly, especially for anything with side effects (writes, external API calls, financial transactions) — validate against the schema, and ideally against business-logic constraints beyond just type-checking, before dispatching.</li>
  <li>Idempotency for retried calls: if an orchestrator retries a failed or timed-out tool call, a side-effecting action (like inserting a record) shouldn&#39;t execute twice — idempotency keys or dedup logic are needed for any tool with real-world side effects.</li>
  <li>Parallel vs. sequential tool calls: some frameworks let the model request multiple tool calls in a single turn. This can meaningfully reduce latency for independent calls, but makes it harder to reason about ordering and dependencies between calls — worth explicitly deciding, per tool, whether parallel execution is safe (read-only, independent operations) or must be sequential (anything where one call&#39;s result affects another&#39;s correctness).</li>
</ul>

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> A model occasionally emits malformed JSON from a tool call even with “JSON mode” enabled — what would you actually do about it?</p>
    <p class="interview-qa__answer"><strong>A.</strong> First, check whether the serving stack is doing true grammar-constrained decoding (token-level constraint) or a weaker prompted/fine-tuned “JSON mode” that improves but doesn&#39;t guarantee validity — many providers&#39; JSON modes are the latter, and switching to a serving setup with genuine grammar constraints (schema-compiled token masking) is the direct fix if available, since it makes malformed output structurally impossible rather than just less likely. If true constrained decoding isn&#39;t available in the given serving environment, I&#39;d add a tolerant parsing/repair layer (attempt to parse, and on failure, either regex-repair common issues or re-prompt with the parse error included) as a fallback, but I&#39;d treat that as a mitigation for a real serving-stack limitation, not the ideal solution.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you decide which tool calls in your agent should run in parallel versus sequentially?</p>
    <p class="interview-qa__answer"><strong>A.</strong> By whether one call&#39;s correctness depends on another&#39;s result. Independent, readonly lookups — e.g., fetching schema metadata for two unrelated tables — are safe to parallelize and meaningfully reduce latency by doing so. Anything where a later call&#39;s arguments depend on an earlier call&#39;s output, or where ordering itself carries meaning (e.g., a validation check that should happen before an execution step, not concurrently with it), has to stay sequential regardless of the latency cost — I&#39;d rather have a correct agent that&#39;s somewhat slower than a faster one with subtle ordering bugs.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the risk of an overly generic tool description, like “runs a database query”?</p>
    <p class="interview-qa__answer"><strong>A.</strong> With multiple tools available, a vague description gives the model little signal to distinguish when this tool is the right choice versus a more specific alternative, and little guidance on how to fill its arguments correctly — leading to wrong-tool selection or malformed/underspecified argument values, independent of the underlying model&#39;s raw capability. A good tool description should specify not just what the tool does, but when it should (and shouldn&#39;t) be used relative to other available tools, and ideally include an example of well-formed arguments — treating tool descriptions as a real engineering artifact worth iterating on, not boilerplate.</p>
  </div>
</section>
