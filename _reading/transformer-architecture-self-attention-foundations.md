---
layout: post
title: "Transformer Architecture & Self-Attention — Foundations"
date: 2026-09-17
order: 21
categories: [reading, ai]
tags: [reading-notes, foundations]
---

## Transformer Architecture & Self-Attention — Foundations

### Why attention exists — the problem it solves

Before transformers, sequence models (RNNs/LSTMs) processed tokens one at a time, left-to-right, carrying a compressed hidden state forward — which meant information from early in a sequence had to survive being repeatedly compressed through every subsequent step to still matter later, and the whole process couldn't be parallelized across a sequence during training. Self-attention replaces this with a mechanism where every token can look directly at every other token in one step, weighted by how relevant they are to each other — no compression bottleneck, and fully parallelizable. Say this if asked “why did transformers replace RNNs”: “RNNs process a sequence strictly in order, so information from token 1 has to survive being squeezed through a fixed-size hidden state at every subsequent step to still influence token 500 — that's a real information bottleneck, and it also means training can't be parallelized across positions, since step t depends on step t-1. Self-attention lets every token attend directly to every other token in a single operation, so there's no compression chain to survive, and every position can be computed in parallel during training — that combination of better long-range modeling and much faster training is what made transformers scale the way RNNs never could.”

### The mechanics — Query, Key, Value

Every token's embedding is projected through three separate learned weight matrices into a Query vector, a Key vector, and a Value vector.

<ul>
  <li>Intuition: think of it like a soft lookup. The Query is “what am I looking for,” the Key is “what do I represent,” and the Value is “what do I actually contribute if you attend to me.” Token i&#39;s Query is compared against every token j&#39;s Key to produce a relevance score; those scores become weights over every token&#39;s Value.</li>
  <li>The formula: Attention(Q, K, V) = softmax(QK×T / sqrt(d_k)) · V</li>
  <li>Why divide by sqrt(d_k): as the dimensionality of Q and K grows, raw dot products grow in magnitude too, which pushes softmax into a region where it&#39;s nearly one-hot (almost all weight on a single token) and gradients vanish. Scaling by sqrt(d_k) keeps the dot products in a range where softmax stays well-behaved and gradients flow properly during training.</li>
</ul>

### Multi-head attention

Rather than one attention computation, the model runs several (e.g. 8, 32, 96 depending on model size) in parallel, each with its own learned Q/K/V projections, then concatenates the results and projects back down to the model's hidden dimension. Say this if asked “why multiple heads instead of one bigger attention”: “A single attention head has to find one notion of `relevance' that serves every kind of relationship in language — syntax, coreference, long-range topical dependency, all at once. Multiple heads let the model learn several different relevance functions in parallel, each operating in its own lower-dimensional subspace, so one head might specialize in tracking subject-verb agreement while another tracks coreference across a paragraph. Empirically, visualizing attention heads in trained models shows exactly this kind of specialization emerging without being explicitly supervised for it.”

### Causal masking — why generation is autoregressive

In a decoder-only LLM, token i is only allowed to attend to tokens at positions i — enforced by setting the attention score for any future position to negative infinity before the softmax, so its weight becomes zero.

<ul>
  <li>Why this matters practically: it&#39;s the direct reason generation happens one token at a time, left to right — the model was trained to predict each token using only what came before it, so at inference time it has to actually generate in that order to stay consistent with what it learned. It&#39;s also the reason KV-caching (see the SLM/LLMOps guide&#39;s inferenceoptimization section) works at all: once a token&#39;s Key/Value has been computed, it never needs to be recomputed, because causal masking guarantees no future token&#39;s computation can change it.</li>
</ul>

### The feed-forward block — where the “knowledge” actually lives

After the attention sub-layer, each token's representation independently passes through a two-layer MLP (typically expanding to 4x the hidden dimension and back down), with a nonlinearity (GELU or, in most modern models, SwiGLU) in between. A genuinely underrated point to raise proactively: most of a transformer's parameter count — and, per a fair amount of interpretability research, a large share of its factual knowledge storage — lives in these feed-forward blocks, not in the attention weights. Attention decides what to look at; the feed-forward block is closer to where facts and patterns are actually stored and transformed. This is a good answer if asked “where is knowledge stored in an LLM” — it's not attention, which is really a routing/mixing mechanism.

### Residual connections and normalization

Each sub-layer (attention, then feed-forward) is wrapped in a residual connection (output = x + Sublayer(x)) and a normalization step (LayerNorm in earlier models, RMSNorm in most modern ones, which drops the mean-centering step LayerNorm does and just rescales by the root-meansquare, making it slightly cheaper with comparable stability).

<ul>
  <li>Why residuals matter: stacking dozens of transformer layers without a direct path for the original signal to flow through would make gradients vanish or explode during backpropagation through so much depth — the residual connection gives gradients a direct “highway” back to earlier layers, which is what actually makes very deep transformers trainable.</li>
</ul>

### Likely interview questions on this sub-topic

<section class="interview-qa" aria-label="Interview questions and answers">
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> If attention lets every token see every other token, why does context length have a cost at all — why not just make it huge?</p>
    <p class="interview-qa__answer"><strong>A.</strong> Because the attention computation itself is quadratic in sequence length — every token computes a score against every other token, so cost scales as O(n²) in both compute and, for the raw attention-score matrix, memory. Doubling the context length roughly quadruples the attention cost. That&#39;s the direct reason long-context models need architectural tricks — better positional encoding schemes like RoPE that generalize past their trained length, sparse or windowed attention variants, or efficient serving techniques like PagedAttention — rather than just naively increasing the context window on a standard denseattention transformer.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> What&#39;s actually different between a decoder-only model like GPT/Llama and the original encoder-decoder Transformer?</p>
    <p class="interview-qa__answer"><strong>A.</strong> The original Transformer (for translation) had a bidirectional encoder that could attend to a full source sentence in both directions, and a causallymasked decoder that generated the target sentence while also attending back to the encoder&#39;s output. Modern LLMs are decoder-only: there&#39;s no separate encoder, and every token — including the prompt itself — is processed through the same causally-masked stack. This simplifies the architecture and scales well for the “predict the next token given everything so far” objective that pretraining actually uses.</p>
  </div>
  <div class="interview-qa__item">
    <p class="interview-qa__question"><strong>Q.</strong> You mentioned knowledge lives more in the feed-forward layers than attention — what&#39;s the practical implication of that?</p>
    <p class="interview-qa__answer"><strong>A.</strong> It shapes how you think about fine-tuning and editing model behavior. If you want to change what a model attends to or how it routes information (e.g., improving how it resolves ambiguous references), targeting attention projection matrices makes sense — which is part of why LoRA is commonly applied to q_proj/k_proj/v_proj. If you want to change what the model knows or how it transforms that knowledge — closer to factual behavior or domain-specific reasoning patterns — you often need to also target the feed-forward matrices (gate_proj/up_proj/down_proj in the SLM guide&#39;s terms), which is exactly why more behaviorally-significant fine-tunes often extend LoRA&#39;s target modules beyond just attention.</p>
  </div>
</section>
