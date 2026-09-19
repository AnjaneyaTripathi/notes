---
layout: post
title: "Agentic Architecture Paradigms"
date: 2026-08-31
order: 4
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Agentic Architecture Paradigms

### What makes a system “agentic,” as distinct from a single LLM call

A single prompt→response call isn't an agent — an agentic system involves the model making a sequence of decisions, typically including which tools/actions to take, observing the results, and deciding what to do next, continuing until it determines the task is complete (or hits a limit). The paradigms below differ in how that decision loop is structured.

### ReAct (Reason + Act)

Interleaves explicit reasoning (“Thought: I need to check the schema for this table”) with actions (“Action: query_schema(table=`invoices')”) and their results (“Observation: columns are. . . ”), in a repeating loop, until the model determines it has enough information to produce a final answer. Intuition: ReAct makes the model “think out loud” before every action, which both improves the quality of tool selection (the reasoning step forces the model to articulate why it's calling a tool before calling it, catching some bad calls before they happen) and produces an interpretable trace of the agent's decision process — genuinely useful for debugging when something goes wrong. This is very likely the pattern underlying your own NL2SQL retry loop, and you should be able to describe it at this level of mechanical detail, not just name it.

### Plan-and-Execute

Separates planning (decompose the overall task into an explicit sequence of steps, up front, before executing any of them) from execution (carry out each planned step, often with a smaller/cheaper model, or with tool calls, one at a time). Tradeoff versus ReAct: Plan-and-Execute is more token-efficient for tasks with a genuinely clear, decomposable structure, since the expensive planning reasoning happens once rather than being re-derived at every step the way ReAct's “Thought” step effectively does. But it's less adaptive — if an early step's result changes what the right subsequent steps should be, Plan-and-Execute needs an explicit re-planning mechanism to handle that, whereas ReAct's step-by-step reasoning naturally adapts as it goes.

### Reflection / self-critique loops

After producing an output, the model (or a second pass, sometimes with a different model/prompt acting as a “critic”) evaluates its own work against explicit criteria and revises before finalizing. Direct relevance to hallucination reduction and validation: this is a natural fit for validating generated SQL against the original question's intent before executing it, or checking whether extracted invoice fields are internally consistent (do line items sum to the subtotal?) before committing to the extraction — a reflection pass catches a class of errors that pure generation-without-review misses. ### 8.5 Single-agent vs. multi-agent (orchestrator-worker) patterns

A single agent equipped with many tools handles the whole task itself. A multi-agent (orchestratorworker) pattern instead has a top-level orchestrator that delegates subtasks to specialized sub-agents (e.g., a “SQL-generation agent,” a “glossary-lookup agent,” a “formatting agent”), each potentially with different tools, prompts, or even different underlying models. The trade-off to state confidently, unprompted, if asked — this is a genuinely strong answer: “Multi-agent architectures sound sophisticated and get a lot of attention, but they have a real, often underestimated cost: more LLM calls (meaning more latency and more dollar cost per request), and a new class of failure mode that doesn't exist in a single-agent system — breakdowns in inter-agent communication, where the orchestrator misunderstands a sub-agent's output or hands off incomplete context. My default is a single, well-tooled agent, and I'd only move to multiple agents when subtasks genuinely need different context, tools, or even different underlying models in a way that would otherwise bloat a single agent's prompt and actively confuse its tool selection — not just because splitting things up feels more organized. It's a real architectural decision with real costs on both sides, not an automatic upgrade.”

### Tying your own project to these paradigms

Your NL2SQL agent's flow — retrieve schema/glossary context, generate SQL, validate, retry on failure — is best described as a ReAct-style loop with a reflection/validation step, not pure Plan-and-Execute (since it adapts step-by-step based on validation results) and not multi-agent (it's a single agent with multiple tools/retrieval steps, deliberately, per the tradeoff above). Having this precise a categorization ready is a stronger answer than a vague “it's a ReAct agent.”

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Walk me through when you&#39;d choose ReAct versus Plan-and-Execute for a new agentic task.</p>
    <p class="interview-qa__answer"><strong>A.</strong> I&#39;d look at how predictable the task&#39;s step sequence is. If the steps genuinely depend on what earlier steps discover — like my NL2SQL agent, where whether a glossary lookup is even needed depends on whether the initial schema-linking step finds ambiguous terms — ReAct&#39;s step-by-step adaptive reasoning fits naturally, since re-planning after every step would just reproduce what ReAct already does implicitly. If the task decomposes into a clear, mostly-fixed sequence regardless of intermediate results — like a multi-stage document-processing pipeline where each stage&#39;s shape is always the same even if the content varies — Plan-and-Execute is more tokenefficient, since I don&#39;t need to pay for full reasoning at every single step.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s a concrete failure mode of a multi-agent system that a single-agent system wouldn&#39;t have?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Context loss or misinterpretation at the handoff boundary — an orchestrator summarizing a sub-agent&#39;s output before passing it to the next sub-agent can drop a detail that turns out to matter, or a sub-agent can misinterpret an ambiguously-phrased delegated subtask because it lacks the full context the orchestrator had. In a single agent, all context stays in one continuous reasoning trace, so this specific failure mode structurally can&#39;t happen — the tradeoff is that a single agent&#39;s context can get bloated and harder to reason over as the task grows, which is the legitimate case for splitting into multiple agents when it&#39;s genuinely warranted.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you decide when an agent should stop iterating and just answer, versus keep gathering more information?</p>
    <p class="interview-qa__answer"><strong>A.</strong> I&#39;d want this to be an explicit, bounded decision rather than left purely to the model&#39;s judgment in an open loop — a hard step/iteration cap to prevent infinite loops regardless of anything else, combined with letting the model&#39;s own reasoning step (in a ReAct-style loop) explicitly assess “do I have sufficient information to answer confidently” as part of its Thought before each action, rather than only stopping when it happens to run out of new tool calls to make. For a task like NL2SQL specifically, I&#39;d also add a concrete, checkable condition — e.g., “the current query passes validation and plausibly answers the question” — rather than relying purely on the model&#39;s self-assessed confidence, since self-assessed confidence is exactly the kind of signal that&#39;s most vulnerable to the miscalibration issue discussed in the earlier discussion.</p>
  </div>
</section>
