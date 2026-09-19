---
layout: post
title: "Agentic AI Fundamentals — LangChain vs. LangGraph, Task Decomposition/Planning, Tool Calling"
date: 2026-09-01
order: 5
categories: [reading, ai]
tags: [reading-notes, master-study-guide]
---

## Agentic AI Fundamentals — LangChain vs. LangGraph, Task Decomposition/Planning, Tool Calling

Graph, Task Decomposition/Planning, Tool Calling This is the topic your JD leans on most explicitly (multi-agent workflows, LangChain/LangFlow/LangGraph/LangSm or LlamaIndex), and it's the natural culmination of everything so far — an agent is essentially “an LLM given tools, memory, and a control loop,” where retrieval (the earlier discussion) is just one possible tool it can call.

### What makes something “agentic” — the core definition

A standard LLM call is a single input →single output mapping. An agent adds a control loop: the LLM doesn't just answer once — it can reason about what to do next, take an action (typically calling a tool), observe the result, and decide whether to act again or finish, repeating until the task is done. Say this if asked to define an agent: “An agent is an LLM wrapped in a loop where it can reason about a goal, decide to take actions — usually by calling external tools or functions — observe the results of those actions, and iterate, rather than producing a single one-shot response. The key shift from a plain LLM call is that the model itself is driving multi-step decision-making, not just generating text.”

### The core building blocks of any agent

<ol>
  <li>LLM (the reasoning engine) — decides what to do at each step.</li>
  <li>Tools — functions the agent can call: search, a calculator, a database/API query, code execution, RAG retrieval itself, sending an email, etc. (as discussed below).</li>
  <li>Memory — short-term (conversation/scratchpad within the current task) and sometimes long-term (persisted across sessions).</li>
  <li>Planning/control logic — how the agent decides the sequence of steps (as discussed below).</li>
  <li>Orchestration framework — the software layer that wires these together and manages state/control flow (this is where LangChain/LangGraph come in).</li>
</ol>

### Task decomposition and planning — how agents break down goals

Why decomposition matters: a single LLM call struggles with complex, multi-step goals (this is the same “multi-hop” limitation from the earlier discussion RAG discussion, generalized beyond just retrieval). Planning is the mechanism to fix it. Common planning patterns to know by name:

<ul>
  <li>ReAct (Reason + Act): the foundational, most-cited pattern. The model alternates explicit Thought (reasoning about what to do) →Action (call a tool) →Observation (see the tool&#39;s result) steps, looping until it reaches a final answer. This interleaving of reasoning and acting (rather than planning everything upfront, or acting without reasoning) is what most modern agent frameworks are built around.</li>
</ul>

<ul>
  <li>Plan-and-Execute: the model first generates a full multi-step plan upfront, then executes each step (possibly with a separate, cheaper model/call per step), only replanning if something goes wrong. Tradeoff vs. ReAct: more efficient (fewer expensive full-reasoning calls) for predictable tasks, but less adaptive to surprises mid-execution since the plan is fixed upfront.</li>
  <li>Task decomposition / sub-goal generation: explicitly prompting the model to break a complex goal into an ordered list of smaller sub-tasks before starting (e.g., “to answer this, I need to: 1) find X, 2) compute Y from X, 3) compare Y to Z”) — this is functionally the agentic generalization of the earlier discussion “query decomposition” for multi-hop RAG.</li>
  <li>Reflection/self-critique: after producing an intermediate or final result, the agent evaluates its own output against the goal and decides whether to redo/refine a step — directly analogous to the earlier discussion Self-RAG/CRAG pattern, generalized beyond retrieval.</li>
  <li>Tree-of-Thought / multi-path exploration: instead of one linear chain of reasoning, the model explores multiple candidate reasoning paths/plans in parallel and picks (or votes on) the best one — more expensive, used when a single reasoning path is unreliable for the task. Good answer if asked “how does an agent plan a multi-step task?”: “Most modern agents use a ReAct-style loop — the model explicitly reasons about what it needs to do next, takes an action like calling a tool, observes the result, and decides whether to continue or conclude, rather than committing to a rigid plan upfront. For more predictable, well-understood tasks, a plan-andexecute pattern — generate the full step sequence first, then execute — can be more efficient since it avoids a full reasoning pass at every single step. The right choice depends on how much the task benefits from adapting mid-execution versus how much predictability and cost-eficiency matter.”</li>
</ul>

### Tool calling / function calling — the mechanics

What it actually is, mechanically: the LLM is given a schema describing available tools/functions (name, description, parameters and their types) alongside the prompt. Instead of generating naturallanguage text, the model can output a structured request to call a specific tool with specific arguments (typically as JSON). The orchestration layer (not the model itself) actually executes that function call against real code/APIs, then feeds the result back into the model's context as an “observation” for it to continue reasoning from. Important nuance to state clearly (common misconception to correct confidently): the LLM does not execute the tool itself — it only decides to call a tool and generates the arguments. The actual execution (hitting an API, running code, querying a DB) happens in your application code, outside the model. This matters for both security (you control what actually runs) and debugging (you can inspect/validate arguments before execution). Typical tool-calling flow:

<ol>
  <li>Define tools with clear names, descriptions, and parameter schemas (the description quality directly affects whether the model picks the right tool — this is effectively a prompt-engineering problem).</li>
  <li>Send the user query + tool definitions to the LLM.</li>
  <li>Model responds with either a direct answer, or a structured tool-call request (tool name + arguments).</li>
  <li>Your application code executes the requested function/API call.</li>
  <li>The result is appended back into the conversation context as an observation.</li>
</ol>

<ol>
  <li>Repeat (model may call more tools, or now has enough info to answer) until a final response is produced. Common tools in an enterprise/consulting GenAI context (good to have ready, ties to your JD): RAG retrieval as a tool, SQL/database query tools, calculator/code execution tools, external API calls (e.g., CRM lookup), web search, and — importantly — other agents (multi-agent systems, as discussed below).</li>
</ol>

### LangChain vs. LangGraph — the distinction that's directly in your JD

This is very likely to come up directly given both are named in the posting. LangChain:

<ul>
  <li>A general-purpose framework for building LLM applications: chains together prompts, models, tools, memory, and retrieval components in largely linear or simply-branching pipelines.</li>
  <li>Great for straightforward chains: e.g., “retrieve →format prompt →call LLM →parse output,” or simple tool-using agents with relatively simple control flow.</li>
  <li>Its original AgentExecutor abstraction handles the basic ReAct-style loop, but gives you limited control over the control flow itself — it&#39;s somewhat of a black box once you&#39;re inside the loop, which becomes limiting for complex, conditional, multi-agent workflows. LangGraph:</li>
  <li>Built by the same team (LangChain), specifically to address LangChain&#39;s limitations for complex, stateful, multi-step agentic workflows.</li>
  <li>Models the application as an explicit graph: nodes are functions/agents/LLM calls, edges define the control flow between them — including conditional edges (branch based on some condition), cycles/loops (revisit a node — essential for iterative agent reasoning, retries, or reflection loops), and explicit shared state that persists and updates across the graph as execution proceeds.</li>
  <li>This gives you fine-grained, explicit control over exactly how an agent (or multiple agents) moves between steps — critical for things like: “if tool call fails, retry with a different approach,” “if confidence is low, route to a human-in-the-loop step,” or “coordinate handoffs between multiple specialized agents” (as discussed below).</li>
  <li>Better suited for production-grade reliability: because the control flow is explicit rather than implicit inside a black-box loop, it&#39;s easier to debug, add guardrails to, persist/resume state (checkpointing), and reason about worst-case behavior. The one-liner comparison to have ready: “LangChain is great for building relatively linear or simply-branching LLM pipelines — chaining prompts, retrieval, and tools together quickly. Lang- Graph is built for when you need explicit, fine-grained control over complex agent control flow — conditional branching, loops/cycles for iterative reasoning, multi-agent coordination, and persistent state — which becomes necessary once an agentic workflow gets complex enough that a linear chain or a black-box agent loop isn&#39;t reliable or debuggable enough for production. I&#39;d reach for LangChain for simpler retrieval/tool-use pipelines, and LangGraph once I need real control over branching, retries, or multi-agent orchestration.” Worth mentioning if pushed further: LangSmith (also named in your JD) is the observability/tracing/evaluation layer for both — logging every step, tool call, and intermediate state of an</li>
</ul>

agent's execution so you can debug why an agent made a particular decision, which becomes essential once workflows are complex enough that you can't just eyeball the output (directly relevant to the “how do you evaluate/debug an agent” question an interviewer might ask as a natural follow-up).

### Multi-agent systems (brief, since it's explicitly in your JD's “multi-agent

workflows”)

<ul>
  <li>Instead of one agent trying to do everything, decompose the problem across specialized agents, each with a narrower role (e.g., a “research agent” that retrieves/searches, a “coding agent” that writes/executes code, a “reviewer agent” that critiques output) coordinated by an orchestrator (sometimes itself an agent, sometimes fixed logic). Common coordination patterns:</li>
  <li>Supervisor/orchestrator pattern: a central agent routes tasks to specialized sub-agents and synthesizes their outputs — this is the most common and easiest to reason about/debug.</li>
  <li>Sequential handoff: agents run in a fixed pipeline, each consuming the previous agent&#39;s output.</li>
  <li>Debate/collaboration: multiple agents (sometimes with different roles or even different models) critique or refine each other&#39;s output before finalizing. Why bother with multiple agents instead of one with many tools? Narrower, specialized roles tend to have more focused, reliable prompts/context (less risk of the model getting confused juggling too many responsibilities at once), and it maps naturally onto how a human team would divide the same work — which is also a strong intuitive answer to give if asked “why multi-agent.” This is exactly the kind of workflow LangGraph is designed to model explicitly as a graph.</li>
</ul>

### Likely interview questions on this sub-topic (with crisp answers)

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s the difference between a chain and an agent?</p>
    <p class="interview-qa__answer"><strong>A.</strong> A chain is a fixed, predetermined sequence of steps — the developer decides the flow in advance. An agent has the LLM itself deciding, at runtime, what steps to take and in what order (including whether to call a tool, which tool, and when to stop) — the control flow is dynamic and driven by the model&#39;s reasoning, not hardcoded.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How does an LLM actually “call” a tool — does it execute code?</p>
    <p class="interview-qa__answer"><strong>A.</strong> No — the model only generates a structured request (tool name + arguments) based on the tool schema it was given; the actual execution happens in your application code outside the model. This separation is important for both security and control.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> Why would you choose LangGraph over plain LangChain for an agent?</p>
    <p class="interview-qa__answer"><strong>A.</strong> When the workflow needs explicit conditional branching, loops (e.g., retry-until-success or reflection loops), persistent state across steps, or coordination between multiple specialized agents — LangGraph models this as an explicit graph, giving fine-grained control and better debuggability than a linear chain or a black-box agent executor.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s a risk specific to agentic systems that isn&#39;t a concern with a single LLM call?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Compounding errors and runaway loops — since the agent makes multiple sequential decisions, an early mistake (wrong tool choice, misread observation) can cascade, and without guardrails an

agent can loop indefinitely or take unintended actions (especially concerning for tools with realworld side effects like sending an email or modifying data). This is why explicit control flow, step limits, and human-in-the-loop checkpoints matter more for agents than for single-shot LLM calls.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> How would you decide between a single agent with many tools vs. a multi-agent system?</p>
    <p class="interview-qa__answer"><strong>A.</strong> I&#39;d lean toward a single agent for simpler task scopes where one consistent context/role is enough. I&#39;d move to multi-agent once the task genuinely spans distinct specialized skills or responsibilities that benefit from focused prompts/context — e.g., separating research/retrieval from code generation from review — since cramming too many responsibilities into one agent&#39;s prompt tends to degrade reliability, similar to how a human generalist juggling too many unrelated tasks performs worse than a coordinated specialist team.</p>
  </div>
</section>
